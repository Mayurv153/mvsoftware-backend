// ─── Agent Tool: Create Task ────────────────────────────────────

const { createProjectTask } = require('../../services/taskService');
const logger = require('../../utils/logger');

module.exports = {
    name: 'createTask',
    description: 'Creates an internal task for the project',

    async execute(payload) {
        const start = Date.now();
        try {
            const task = await createProjectTask({
                projectId: payload.project_id,
                planSlug: payload.plan_slug,
                userId: payload.user_id,
                clientName: payload.client_name || payload.client_email,
            });

            return {
                status: 'success',
                result: { task_id: task.id, priority: task.priority },
                duration_ms: Date.now() - start,
            };
        } catch (err) {
            logger.error('[Tool:createTask] Failed', { error: err.message });
            return {
                status: 'failed',
                error: err.message,
                duration_ms: Date.now() - start,
            };
        }
    },
};
