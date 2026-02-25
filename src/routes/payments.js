// ─── Payment Routes ─────────────────────────────────────────────

const { Router } = require('express');
const Joi = require('joi');
const { createOrder, verifyPayment } = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimiter');
const { idempotency } = require('../middleware/idempotency');
const { validate } = require('../middleware/validateRequest');

const router = Router();

// Validation schemas
const createOrderSchema = Joi.object({
    plan_slug: Joi.string()
        .valid('starter', 'growth', 'pro')
        .required()
        .messages({
            'any.required': 'plan_slug is required',
            'any.only': 'plan_slug must be one of: starter, growth, pro',
        }),
});

const verifyPaymentSchema = Joi.object({
    razorpay_order_id: Joi.string().required(),
    razorpay_payment_id: Joi.string().required(),
    razorpay_signature: Joi.string().required(),
    amount: Joi.number().integer().optional(),
    method: Joi.string().optional(),
});

// POST /api/payments/create-order
router.post(
    '/create-order',
    authenticate,
    paymentLimiter,
    idempotency,
    validate(createOrderSchema),
    createOrder
);

// POST /api/payments/verify
router.post(
    '/verify',
    authenticate,
    paymentLimiter,
    validate(verifyPaymentSchema),
    verifyPayment
);

module.exports = router;
