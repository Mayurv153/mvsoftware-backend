// ─── Agent Tool: Log Event (MongoDB) ────────────────────────────

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

module.exports = {
    name: 'logEvent',
    description: 'Logs agent workflow execution to MongoDB',

    async execute(payload) {
        const start = Date.now();

        // Check if MongoDB is connected
        if (mongoose.connection.readyState !== 1) {
            logger.warn('[Tool:logEvent] MongoDB not connected — skipping log');
            return {
                status: 'skipped',
                result: { reason: 'MongoDB not connected' },
                duration_ms: Date.now() - start,
            };
        }

        try {
            const AgentLog = require('../../models/AgentLog');

            const log = await AgentLog.create({
                task: payload.task || 'unknown',
                trigger: payload.trigger || 'system',
                status: payload.status || 'success',
                duration_ms: payload.duration_ms || 0,
                steps: payload.steps || [],
                meta: payload.meta || {},
                error: payload.error || null,
                triggered_by: payload.triggered_by || 'system',
            });

            return {
                status: 'success',
                result: { log_id: log._id.toString() },
                duration_ms: Date.now() - start,
            };
        } catch (err) {
            logger.error('[Tool:logEvent] Failed to write log', { error: err.message });
            return {
                status: 'failed',
                error: err.message,
                duration_ms: Date.now() - start,
            };
        }
    },
};
