// ─── Global Error Handler Middleware ────────────────────────────

const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
    // Log the full error
    logger.error('[ErrorHandler] Unhandled error', {
        message: err.message,
        stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
        path: req.path,
        method: req.method,
        ip: req.ip,
    });

    // Determine status code
    const statusCode = err.statusCode || err.status || 500;

    // Build response
    const response = {
        success: false,
        message:
            statusCode === 500
                ? 'Internal server error'
                : err.message || 'Something went wrong',
        timestamp: new Date().toISOString(),
    };

    // Include stack trace in development
    if (process.env.NODE_ENV !== 'production' && err.stack) {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
}

module.exports = { errorHandler };
