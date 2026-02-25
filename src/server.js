// ─── MV Software Backend — Server Entry Point ──────────────────
// Production-ready Express server with Supabase, Razorpay, MongoDB, Resend

const logger = require('./utils/logger');
const app = require('./app');
const { connectMongoDB } = require('./config/mongodb');
const { startDailyDigest } = require('./agents/scheduler/dailyDigest');
const PORT = process.env.PORT || 5000;

// ── Start Server ────────────────────────────────────────────────
async function start() {
    try {
        // Connect MongoDB (optional — non-blocking)
        await connectMongoDB();

        // Start cron schedulers
        startDailyDigest();

        app.listen(PORT, () => {
            logger.info(`🚀 MV Software Backend running on port ${PORT}`);
            logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`🔗 Health check: http://localhost:${PORT}/api/health`);
        });
    } catch (err) {
        logger.error('[Server] Failed to start', { error: err.message });
        process.exit(1);
    }
}

// ── Graceful Shutdown ───────────────────────────────────────────
process.on('SIGTERM', () => {
    logger.info('[Server] SIGTERM received — shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('[Server] SIGINT received — shutting down gracefully');
    process.exit(0);
});

process.on('unhandledRejection', (reason) => {
    logger.error('[Server] Unhandled Promise Rejection', { reason: String(reason) });
});

process.on('uncaughtException', (err) => {
    logger.error('[Server] Uncaught Exception', { error: err.message, stack: err.stack });
    process.exit(1);
});

start();
