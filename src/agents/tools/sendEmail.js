// ─── Agent Tool: Send Email ─────────────────────────────────────

const {
    notifyAdminNewProject,
    notifyClientPaymentSuccess,
} = require('../../services/emailService');
const { getPlan } = require('../../config/plans');
const logger = require('../../utils/logger');

module.exports = {
    name: 'sendEmail',
    description: 'Sends admin and client notification emails',

    async execute(payload) {
        const start = Date.now();
        const results = { admin: null, client: null };

        const plan = getPlan(payload.plan_slug);

        try {
            // Send admin notification
            results.admin = await notifyAdminNewProject({
                clientEmail: payload.client_email,
                clientName: payload.client_name,
                planName: plan?.name || payload.plan_slug,
                amount: payload.amount,
                projectId: payload.project_id,
                deadline: payload.deadline,
            });
        } catch (err) {
            logger.error('[Tool:sendEmail] Admin email failed', { error: err.message });
            results.admin = { status: 'failed', error: err.message };
        }

        try {
            // Send client confirmation
            results.client = await notifyClientPaymentSuccess({
                clientEmail: payload.client_email,
                clientName: payload.client_name,
                planName: plan?.name || payload.plan_slug,
                amount: payload.amount,
                deliveryDays: plan?.deliveryDays || 7,
                deadline: payload.deadline,
            });
        } catch (err) {
            logger.error('[Tool:sendEmail] Client email failed', { error: err.message });
            results.client = { status: 'failed', error: err.message };
        }

        const allSuccess = results.admin && results.client &&
            !results.admin.error && !results.client.error;

        return {
            status: allSuccess ? 'success' : 'partial_failure',
            result: results,
            duration_ms: Date.now() - start,
        };
    },
};
