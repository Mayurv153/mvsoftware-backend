// ─── Rate Limiter Middleware ────────────────────────────────────

const rateLimit = require('express-rate-limit');
const { tooManyRequests } = require('../utils/apiResponse');

// General API rate limit: 100 requests per 15 minutes
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        tooManyRequests(res, 'Too many requests. Please try again later.');
    },
    keyGenerator: (req) => req.ip,
});

// Strict rate limit for payment endpoints: 10 requests per 15 minutes
const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        tooManyRequests(res, 'Too many payment requests. Please try again later.');
    },
    keyGenerator: (req) => req.ip,
});

// Service request limiter: 5 per 15 minutes (spam protection)
const serviceRequestLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        tooManyRequests(res, 'Too many requests. Please wait before submitting again.');
    },
    keyGenerator: (req) => req.ip,
});

module.exports = { generalLimiter, paymentLimiter, serviceRequestLimiter };
