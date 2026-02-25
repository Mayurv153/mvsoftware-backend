// ─── Payment Service ────────────────────────────────────────────
// Handles Razorpay order creation, signature verification, and DB operations

const crypto = require('crypto');
const { getRazorpay, isRazorpayConfigured } = require('../config/razorpay');
const { supabaseAdmin } = require('../config/supabase');
const { getPlan } = require('../config/plans');
const logger = require('../utils/logger');

/**
 * Creates a Razorpay order and saves it to the orders table.
 */
async function createOrder(userId, planSlug, idempotencyKey = null) {
    const plan = getPlan(planSlug);
    if (!plan) {
        throw Object.assign(new Error(`Invalid plan: ${planSlug}`), { statusCode: 400 });
    }

    if (plan.slug === 'custom') {
        throw Object.assign(new Error('Custom plan requires a service request — contact us'), {
            statusCode: 400,
        });
    }

    // Get plan from DB to get the UUID
    const { data: dbPlan, error: planError } = await supabaseAdmin
        .from('plans')
        .select('id')
        .eq('slug', planSlug)
        .single();

    if (planError || !dbPlan) {
        throw new Error(`Plan not found in database: ${planSlug}`);
    }

    if (!isRazorpayConfigured()) {
        // Razorpay not configured — return placeholder
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
            throw new Error(`Failed to save order: ${orderError.message}`);
        }

        logger.info('[Payment] Placeholder order created (Razorpay not configured)', {
            orderId: order.id,
        });

        return {
            ...order,
            razorpay_configured: false,
            message: 'Razorpay not configured yet. Order saved as placeholder.',
            plan: plan,
        };
    }

    // Create Razorpay order
    const razorpay = getRazorpay();
    const rzpOrder = await razorpay.orders.create({
        amount: plan.priceInr,
        currency: 'INR',
        receipt: `mv_${Date.now()}`,
        notes: {
            user_id: userId,
            plan_slug: plan.slug,
            plan_name: plan.name,
        },
    });

    // Save order to DB
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
        throw new Error(`Failed to save order: ${orderError.message}`);
    }

    logger.info('[Payment] Razorpay order created', {
        orderId: order.id,
        rzpOrderId: rzpOrder.id,
        amount: plan.priceInr,
    });

    return {
        ...order,
        razorpay_configured: true,
        razorpay_key_id: process.env.RAZORPAY_KEY_ID,
        plan: plan,
    };
}

/**
 * Verifies Razorpay payment signature (HMAC-SHA256).
 */
function verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    if (!isRazorpayConfigured()) {
        throw Object.assign(new Error('Razorpay not configured — cannot verify signature'), {
            statusCode: 503,
        });
    }

    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
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

    // Get the order
    const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('*, plans(slug, name)')
        .eq('razorpay_order_id', razorpay_order_id)
        .single();

    if (orderError || !order) {
        throw Object.assign(new Error('Order not found'), { statusCode: 404 });
    }

    // Check for duplicate payment
    const { data: existingPayment } = await supabaseAdmin
        .from('payments')
        .select('id')
        .eq('razorpay_payment_id', razorpay_payment_id)
        .single();

    if (existingPayment) {
        logger.warn('[Payment] Duplicate payment detected', {
            razorpay_payment_id,
        });
        return { duplicate: true, order };
    }

    // Save payment
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
        throw new Error(`Failed to save payment: ${paymentError.message}`);
    }

    // Update order status
    await supabaseAdmin
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', order.id);

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
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
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
