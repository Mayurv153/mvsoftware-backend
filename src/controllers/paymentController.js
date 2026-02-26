// ─── Payment Controller ─────────────────────────────────────────

const paymentService = require('../services/paymentService');
const { dispatch } = require('../agents/orchestrator');
const { success, error, badRequest } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * POST /api/payments/create-order
 */
async function createOrder(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return error(res, 'Unauthorized. Please login again.', 401);
    }

    const { plan_slug } = req.body;
    if (!plan_slug) {
      return badRequest(res, 'plan_slug is required');
    }

    const userId = req.user.id;
    const idempotencyKey = req.headers['idempotency-key'] || null;

    logger.info('[PaymentController] createOrder request', {
      user_id: userId,
      plan_slug,
      idempotency: idempotencyKey ? 'present' : 'absent',
    });

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
    logger.error('[PaymentController] createOrder failed', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });

    if (err && err.statusCode) {
      return error(res, err.message, err.statusCode);
    }
    return error(res, 'Payment service failed. Try again.', 502);
  }
}

/**
 * POST /api/payments/verify
 */
async function verifyPayment(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return error(res, 'Unauthorized. Please login again.', 401);
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
      method,
    } = req.body;

    logger.info('[PaymentController] verifyPayment request', {
      user_id: req.user.id,
      razorpay_order_id,
      razorpay_payment_id,
      amount: amount || null,
      method: method || null,
    });

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return badRequest(res, 'Missing Razorpay verification fields');
    }

    const isValid = paymentService.verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      logger.warn('[PaymentController] Invalid signature', {
        razorpay_order_id,
        razorpay_payment_id,
      });
      return badRequest(res, 'Invalid payment signature');
    }

    const result = await paymentService.recordPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
      method,
    });

    if (result.duplicate) {
      return success(res, { message: 'Payment already recorded' });
    }

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
    logger.error('[PaymentController] verifyPayment failed', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });

    if (err && err.statusCode) {
      return error(res, err.message, err.statusCode);
    }
    return error(res, 'Payment verification failed', 502);
  }
}

module.exports = { createOrder, verifyPayment };