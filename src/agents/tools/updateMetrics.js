// ─── Agent Tool: Update Metrics ─────────────────────────────────

const {
    incrementRevenue,
    incrementNewProjects,
} = require('../../services/metricsService');
const logger = require('../../utils/logger');

module.exports = {
    name: 'updateMetrics',
    description: 'Increments daily dashboard metrics (revenue + new projects)',

    async execute(payload) {
        const start = Date.now();
        try {
            await incrementRevenue(payload.amount || 0);
            await incrementNewProjects();

            return {
                status: 'success',
                result: {
                    revenue_added: payload.amount,
                    new_projects_incremented: true,
                },
                duration_ms: Date.now() - start,
            };
        } catch (err) {
            logger.error('[Tool:updateMetrics] Failed', { error: err.message });
            return {
                status: 'failed',
                error: err.message,
                duration_ms: Date.now() - start,
            };
        }
    },
};
