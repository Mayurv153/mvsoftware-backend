// ─── Agent Log Model (MongoDB) ──────────────────────────────────

const mongoose = require('mongoose');

const agentLogSchema = new mongoose.Schema(
    {
        task: {
            type: String,
            required: true,
            index: true,
        },
        trigger: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['started', 'success', 'partial_failure', 'failed'],
            required: true,
            index: true,
        },
        duration_ms: {
            type: Number,
            default: 0,
        },
        steps: [
            {
                tool: String,
                status: { type: String, enum: ['success', 'failed', 'skipped'] },
                result: mongoose.Schema.Types.Mixed,
                error: String,
                duration_ms: Number,
            },
        ],
        meta: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        error: {
            type: String,
            default: null,
        },
        triggered_by: {
            type: String,
            default: 'system',
        },
    },
    {
        timestamps: true,
        collection: 'agent_logs',
    }
);

// Index for querying recent logs
agentLogSchema.index({ createdAt: -1 });
agentLogSchema.index({ task: 1, createdAt: -1 });

module.exports = mongoose.model('AgentLog', agentLogSchema);
