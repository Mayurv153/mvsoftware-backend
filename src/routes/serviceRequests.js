// ─── Service Request Routes ─────────────────────────────────────

const { Router } = require('express');
const Joi = require('joi');
const { createServiceRequest } = require('../controllers/serviceRequestController');
const { serviceRequestLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validateRequest');

const router = Router();

const serviceRequestSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string()
        .pattern(/^[+]?[\d\s\-()]+$/)
        .min(10)
        .max(15)
        .optional()
        .allow('', null),
    plan_slug: Joi.string()
        .valid('starter', 'growth', 'pro', 'custom')
        .optional()
        .allow('', null),
    message: Joi.string().trim().min(10).max(2000).required(),
});

// POST /api/service-requests — Public (no auth)
router.post(
    '/',
    serviceRequestLimiter,
    validate(serviceRequestSchema),
    createServiceRequest
);

module.exports = router;
