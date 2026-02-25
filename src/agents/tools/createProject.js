// ─── Agent Tool: Create Project ─────────────────────────────────

const { createProject } = require('../../services/projectService');
const logger = require('../../utils/logger');

module.exports = {
    name: 'createProject',
    description: 'Creates a project workspace in Supabase',

    async execute(payload) {
        const start = Date.now();
        try {
            const project = await createProject({
                userId: payload.user_id,
                planSlug: payload.plan_slug,
                orderId: payload.order_id,
                paymentId: payload.payment_id,
                userName: payload.client_name || payload.client_email,
            });

            return {
                status: 'success',
                result: { project_id: project.id, deadline: project.deadline },
                duration_ms: Date.now() - start,
            };
        } catch (err) {
            logger.error('[Tool:createProject] Failed', { error: err.message });
            return {
                status: 'failed',
                error: err.message,
                duration_ms: Date.now() - start,
            };
        }
    },
};
