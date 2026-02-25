// ─── Trigger: Payment Success ───────────────────────────────────
// Chains all agent tools when a payment is successfully captured

const createProjectTool = require('../tools/createProject');
const sendEmailTool = require('../tools/sendEmail');
const createTaskTool = require('../tools/createTask');
const logEventTool = require('../tools/logEvent');
const updateMetricsTool = require('../tools/updateMetrics');
const logger = require('../../utils/logger');

module.exports = {
    name: 'paymentSuccess',
    description: 'Triggered on successful payment — creates project, task, sends emails, updates metrics, logs result',

    /**
     * @param {Object} payload
     * @param {string} payload.user_id
     * @param {string} payload.client_email
     * @param {string} payload.client_name
     * @param {string} payload.plan_slug
     * @param {string} payload.order_id
     * @param {string} payload.payment_id
     * @param {string} payload.razorpay_payment_id
     * @param {number} payload.amount  // in paisa
     */
    async execute(payload) {
        const workflowStart = Date.now();
        const steps = [];
        let enrichedPayload = { ...payload };

        logger.info('[Trigger:paymentSuccess] Starting workflow', {
            order_id: payload.order_id,
            plan_slug: payload.plan_slug,
        });

        // ── Step 1: Create Project ──────────────────────────
        const projectResult = await createProjectTool.execute(enrichedPayload);
        steps.push({ tool: 'createProject', ...projectResult });

        if (projectResult.status === 'success') {
            enrichedPayload.project_id = projectResult.result.project_id;
            enrichedPayload.deadline = projectResult.result.deadline;
        }

        // ── Step 2: Create Task ─────────────────────────────
        if (enrichedPayload.project_id) {
            const taskResult = await createTaskTool.execute(enrichedPayload);
            steps.push({ tool: 'createTask', ...taskResult });
        } else {
            steps.push({
                tool: 'createTask',
                status: 'skipped',
                error: 'No project_id — project creation failed',
                duration_ms: 0,
            });
        }

        // ── Step 3: Send Emails ─────────────────────────────
        const emailResult = await sendEmailTool.execute(enrichedPayload);
        steps.push({ tool: 'sendEmail', ...emailResult });

        // ── Step 4: Update Metrics ──────────────────────────
        const metricsResult = await updateMetricsTool.execute(enrichedPayload);
        steps.push({ tool: 'updateMetrics', ...metricsResult });

        // ── Step 5: Log Everything ──────────────────────────
        const totalDuration = Date.now() - workflowStart;
        const hasFailures = steps.some((s) => s.status === 'failed');
        const workflowStatus = hasFailures ? 'partial_failure' : 'success';

        const logResult = await logEventTool.execute({
            task: 'payment_success_workflow',
            trigger: 'paymentSuccess',
            status: workflowStatus,
            duration_ms: totalDuration,
            steps,
            meta: {
                order_id: payload.order_id,
                payment_id: payload.payment_id,
                razorpay_payment_id: payload.razorpay_payment_id,
                plan_slug: payload.plan_slug,
                amount: payload.amount,
                project_id: enrichedPayload.project_id,
            },
            triggered_by: 'webhook',
        });
        steps.push({ tool: 'logEvent', ...logResult });

        logger.info(`[Trigger:paymentSuccess] Workflow completed (${workflowStatus})`, {
            duration_ms: totalDuration,
            steps_count: steps.length,
            failures: steps.filter((s) => s.status === 'failed').length,
        });

        return {
            trigger: 'paymentSuccess',
            status: workflowStatus,
            duration_ms: totalDuration,
            steps,
        };
    },
};
