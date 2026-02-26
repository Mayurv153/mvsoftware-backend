// Payment Service
// Handles Razorpay order creation, signature verification, and DB operations.

const crypto = require('crypto');
const {
    getRazorpay,
    isRazorpayConfigured,
    getRazorpayKeyId,
    getRazorpayKeySecret,
} = require('../config/razorpay');
const { supabaseAdmin } = require('../config/supabase');
const { getPlan } = require('../config/plans');
const logger = require('../utils/logger');

function createHttpError(message, statusCode = 500, cause = null) {
    const err = new Error(message);
    err.statusCode = statusCode;
    if (cause) {
        err.cause = cause;
    }
    return err;
}

function isMissingRowError(error) {
    if (!error) return false;
    return (
        error.code === 'PGRST116' ||
        String(error.message || '').toLowerCase().includes('no rows')
    );
}

function normalizeEnv(value) {
    return String(value || '')
        .replace(/\r|\n/g, '')
        .trim()
        .replace(/^['"]+|['"]+$/g, '');
}

async function ensurePlanRow(planSlug, plan) {
    const { data: existingPlan, error: fetchError } = await supabaseAdmin
        .from('plans')
        .select('id')
        .eq('slug', planSlug)
        .maybeSingle();

    if (fetchError) {
        throw createHttpError('Failed to fetch plan from database', 503, fetchError);
    }

    if (existingPlan) {
        return existingPlan;
    }

    const { data: insertedPlan, error: insertError } = await supabaseAdmin
        .from('plans')
        .insert({
            name: plan.name,
            slug: plan.slug,
            price_inr: plan.priceInr,
            display_price: plan.displayPrice,
            features: plan.features,
            delivery_days: plan.deliveryDays,
            priority: plan.priority,
            is_active: true,
        })
        .select('id')
        .single();

    if (!insertError && insertedPlan) {
        logger.warn('[Payment] Missing plan row auto-created', { plan_slug: planSlug });
        return insertedPlan;
    }

    // In concurrent requests, another request may insert the same plan.
    if (insertError?.code === '23505') {
        const { data: retriedPlan, error: retryError } = await supabaseAdmin
            .from('plans')
            .select('id')
            .eq('slug', planSlug)
            .maybeSingle();

        if (!retryError && retriedPlan) {
            return retriedPlan;
        }
    }

    throw createHttpError('Failed to create missing plan row', 503, insertError);
}

/**
 * Creates a Razorpay order and saves it to the orders table.
 */
async function createOrder(userId, planSlug, idempotencyKey = null) {
    const plan = getPlan(planSlug);
    if (!plan) {
        throw createHttpError(`Invalid plan: ${planSlug}`, 400);
    }

    if (plan.slug === 'custom') {
        throw createHttpError('Custom plan requires a service request - contact us', 400);
    }

    const dbPlan = await ensurePlanRow(planSlug, plan);

    if (!isRazorpayConfigured()) {
        // Razorpay not configured - return placeholder
        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .insert({
                user_id: userId,
                plan_id: dbPlan.id,
                razorpay_order_id: `placeholder_${Date.now()}`,
                amount: plan.priceInr,
                currency: 'INR',
                status: 'created',
                idempotency_key: idempotencyKey,
                notes: { plan_name: plan.name, plan_slug: plan.slug },
            })
            .select()
            .single();

        if (orderError) {
            throw createHttpError('Failed to save placeholder order', 503, orderError);
        }

        logger.info('[Payment] Placeholder order created (Razorpay not configured)', {
            orderId: order.id,
        });

        return {
            ...order,
            razorpay_configured: false,
            message: 'Razorpay not configured yet. Order saved as placeholder.',
            plan,
        };
    }

    const razorpay = getRazorpay();
    let rzpOrder;

    try {
        rzpOrder = await razorpay.orders.create({
            amount: plan.priceInr,
            currency: 'INR',
            receipt: `mv_${Date.now()}`,
            notes: {
                user_id: userId,
                plan_slug: plan.slug,
                plan_name: plan.name,
            },
        });
    } catch (rzpError) {
        logger.error('[Payment] Razorpay order creation failed', {
            message: rzpError.message,
            statusCode: rzpError.statusCode,
            errorCode: rzpError.error?.code,
            description: rzpError.error?.description,
            user_id: userId,
            plan_slug: plan.slug,
        });

        throw createHttpError(
            'Unable to create Razorpay order. Verify Razorpay live/test keys on backend.',
            502,
            rzpError
        );
    }

    const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert({
            user_id: userId,
            plan_id: dbPlan.id,
            razorpay_order_id: rzpOrder.id,
            amount: plan.priceInr,
            currency: 'INR',
            status: 'created',
            idempotency_key: idempotencyKey,
            notes: { plan_name: plan.name, plan_slug: plan.slug, rzp_receipt: rzpOrder.receipt },
        })
        .select()
        .single();

    if (orderError) {
        if (orderError.code === '23505' && String(orderError.message || '').includes('idempotency_key')) {
            throw createHttpError('Duplicate payment order request', 409, orderError);
        }
        throw createHttpError('Failed to save order', 503, orderError);
    }

    logger.info('[Payment] Razorpay order created', {
        orderId: order.id,
        rzpOrderId: rzpOrder.id,
        amount: plan.priceInr,
    });

    return {
        ...order,
        razorpay_configured: true,
        razorpay_key_id: getRazorpayKeyId(),
        plan,
    };
}

/**
 * Verifies Razorpay payment signature (HMAC-SHA256).
 */
function verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    if (!isRazorpayConfigured()) {
        throw createHttpError('Razorpay not configured - cannot verify signature', 503);
    }

    const keySecret = getRazorpayKeySecret();
    if (!keySecret) {
        throw createHttpError('Razorpay secret is missing on backend', 503);
    }

    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(body)
        .digest('hex');

    return expectedSignature === razorpaySignature;
}

/**
 * Records a verified payment and updates the order status.
 */
async function recordPayment(paymentData) {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        amount,
        method,
    } = paymentData;

    const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('*, plans(slug, name)')
        .eq('razorpay_order_id', razorpay_order_id)
        .single();

    if (!order && !orderError) {
        throw createHttpError('Order not found', 404);
    }

    if (orderError) {
        if (isMissingRowError(orderError)) {
            throw createHttpError('Order not found', 404);
        }
        throw createHttpError('Failed to fetch order', 503, orderError);
    }

    const { data: existingPayment, error: existingPaymentError } = await supabaseAdmin
        .from('payments')
        .select('id')
        .eq('razorpay_payment_id', razorpay_payment_id)
        .maybeSingle();

    if (existingPaymentError && !isMissingRowError(existingPaymentError)) {
        throw createHttpError('Failed to validate duplicate payment', 503, existingPaymentError);
    }

    if (existingPayment) {
        logger.warn('[Payment] Duplicate payment detected', { razorpay_payment_id });
        return { duplicate: true, order };
    }

    const { data: payment, error: paymentError } = await supabaseAdmin
        .from('payments')
        .insert({
            order_id: order.id,
            user_id: order.user_id,
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
            amount: amount || order.amount,
            currency: order.currency,
            status: 'captured',
            method: method || 'unknown',
            verified_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (paymentError) {
        throw createHttpError('Failed to save payment', 503, paymentError);
    }

    const { error: updateOrderError } = await supabaseAdmin
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', order.id);

    if (updateOrderError) {
        throw createHttpError('Payment captured but failed to update order status', 503, updateOrderError);
    }

    logger.info('[Payment] Payment verified and recorded', {
        paymentId: payment.id,
        rzpPaymentId: razorpay_payment_id,
        amount: order.amount,
    });

    return { duplicate: false, order, payment };
}

/**
 * Verifies Razorpay webhook signature.
 */
function verifyWebhookSignature(body, signature) {
    const webhookSecret = normalizeEnv(process.env.RAZORPAY_WEBHOOK_SECRET);
    if (!webhookSecret) {
        throw new Error('RAZORPAY_WEBHOOK_SECRET not configured');
    }

    const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature)
    );
}

module.exports = {
    createOrder,
    verifySignature,
    recordPayment,
    verifyWebhookSignature,
};
