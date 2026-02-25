// ─── Payment Controller ─────────────────────────────────────────

const paymentService = require('../services/paymentService');
const { dispatch } = require('../agents/orchestrator');
const { success, error, badRequest } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * POST /api/payments/create-order
 * Creates a Razorpay order for the given plan.
 */
async function createOrder(req, res, next) {
    try {
        const { plan_slug } = req.body;
        const userId = req.user.id;
        const idempotencyKey = req.headers['idempotency-key'] || null;

        const order = await paymentService.createOrder(userId, plan_slug, idempotencyKey);

        return success(res, {
            order_id: order.id,
            razorpay_order_id: order.razorpay_order_id,
            amount: order.amount,
            currency: order.currency,
            razorpay_configured: order.razorpay_configured,
            razorpay_key_id: order.razorpay_key_id || null,
            plan: order.plan,
            message: order.message || 'Order created successfully',
        });
    } catch (err) {
        if (err.statusCode) {
            return error(res, err.message, err.statusCode);
        }
        next(err);
    }
}

/**
 * POST /api/payments/verify
 * Verifies Razorpay payment signature and triggers agent workflows.
 */
async function verifyPayment(req, res, next) {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = req.body;

        // Verify signature
        const isValid = paymentService.verifySignature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        );

        if (!isValid) {
            logger.warn('[PaymentController] Invalid payment signature', {
                razorpay_order_id,
                razorpay_payment_id,
            });
            return badRequest(res, 'Invalid payment signature');
        }

        // Record payment
        const result = await paymentService.recordPayment({
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            amount: req.body.amount,
            method: req.body.method,
        });

        if (result.duplicate) {
            return success(res, { message: 'Payment already recorded' });
        }

        // Trigger agent workflow asynchronously (don't block response)
        const planSlug = result.order.notes?.plan_slug || 'custom';
        dispatch('paymentSuccess', {
            user_id: result.order.user_id,
            client_email: req.user.email,
            client_name: req.user.metadata?.name || req.user.email,
            plan_slug: planSlug,
            order_id: result.order.id,
            payment_id: result.payment.id,
            razorpay_payment_id,
            amount: result.order.amount,
        }).catch((err) => {
            logger.error('[PaymentController] Agent workflow failed', {
                error: err.message,
                order_id: result.order.id,
            });
        });

        return success(res, {
            message: 'Payment verified successfully',
            payment_id: result.payment.id,
            order_id: result.order.id,
            status: 'captured',
        });
    } catch (err) {
        if (err.statusCode) {
            return error(res, err.message, err.statusCode);
        }
        next(err);
    }
}

module.exports = { createOrder, verifyPayment };
