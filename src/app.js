require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');

const paymentRoutes = require('./routes/payments');
const webhookRoutes = require('./routes/webhooks');
const serviceRequestRoutes = require('./routes/serviceRequests');
const adminRoutes = require('./routes/admin');
const agentRoutes = require('./routes/agent');
const publicRoutes = require('./routes/public');
const { authenticate } = require('./middleware/auth');
const { adminOnly } = require('./middleware/adminAuth');

const app = express();

function normalizeOrigin(origin) {
    return String(origin || '').trim().replace(/\/+$/, '');
}

function expandOriginVariants(origin) {
    const value = normalizeOrigin(origin);
    if (!value) return [];

    const variants = new Set([value]);

    try {
        const parsed = new URL(value);
        const host = parsed.hostname;

        if (host.startsWith('www.')) {
            variants.add(`${parsed.protocol}//${host.slice(4)}`);
        } else {
            variants.add(`${parsed.protocol}//www.${host}`);
        }
    } catch {
        // Ignore malformed origin entries.
    }

    return Array.from(variants);
}

const configuredOrigins = String(process.env.CORS_ORIGIN || '*')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const allowedOrigins = new Set();
configuredOrigins.forEach((origin) => {
    expandOriginVariants(origin).forEach((entry) => allowedOrigins.add(entry));
});

app.use(helmet());

app.use(cors({
    origin(origin, callback) {
        // Allow server-to-server calls and tools with no Origin header.
        if (!origin) return callback(null, true);

        const normalized = normalizeOrigin(origin);

        if (allowedOrigins.has('*') || allowedOrigins.has(normalized)) {
            return callback(null, true);
        }

        return callback(new Error(`CORS blocked for origin: ${normalized}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    credentials: true,
}));

app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
    skip: (req) => req.path === '/api/health',
}));

app.use('/api/webhooks', express.raw({ type: 'application/json' }), (req, _res, next) => {
    req.rawBody = req.body.toString('utf8');
    try {
        req.body = JSON.parse(req.rawBody);
    } catch {
        req.body = {};
    }
    next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/', generalLimiter);

app.get('/api/health', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'mvsoftware-backend',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
    });
});

/**
 * GET /api/check-admin
 * Quick check to verify if a user has admin privileges.
 * Used by the frontend AdminGuard.
 */
app.get('/api/check-admin', authenticate, adminOnly, (_req, res) => {
    res.json({ isAdmin: true });
});

app.use('/api/payments', paymentRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/service-requests', serviceRequestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/public', publicRoutes);

app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        timestamp: new Date().toISOString(),
    });
});

app.use(errorHandler);

module.exports = app;
