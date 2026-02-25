// ─── Webhook Controller ─────────────────────────────────────────
// Handles incoming Razorpay webhooks with signature verification

const paymentService = require('../services/paymentService');
const { dispatch } = require('../agents/orchestrator');
const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * POST /api/webhooks/razorpay
 * Razorpay sends events here (payment.captured, payment.failed, etc.)
 */
async function handleRazorpayWebhook(req, res) {
    try {
        const signature = req.headers['x-razorpay-signature'];

        if (!signature) {
            logger.warn('[Webhook] Missing X-Razorpay-Signature header');
            return res.status(400).json({ error: 'Missing signature' });
        }

        // Verify webhook signature using raw body
        let isValid;
        try {
            isValid = paymentService.verifyWebhookSignature(req.rawBody, signature);
        } catch (err) {
            logger.error('[Webhook] Signature verification error', { error: err.message });
            return res.status(400).json({ error: 'Signature verification failed' });
        }

        if (!isValid) {
            logger.warn('[Webhook] Invalid webhook signature');
            return res.status(400).json({ error: 'Invalid signature' });
        }

        const event = req.body;
        const eventType = event.event;

        logger.info('[Webhook] Received valid event', {
            event: eventType,
            payment_id: event.payload?.payment?.entity?.id,
        });

        // ── Handle payment.captured ───────────────────
        if (eventType === 'payment.captured') {
            const payment = event.payload.payment.entity;
            const razorpayOrderId = payment.order_id;
            const razorpayPaymentId = payment.id;

            // Idempotency check — skip if already processed
            const { data: existingPayment } = await supabaseAdmin
                .from('payments')
                .select('id')
                .eq('razorpay_payment_id', razorpayPaymentId)
                .single();

            if (existingPayment) {
                logger.info('[Webhook] Payment already processed — skipping', {
                    razorpay_payment_id: razorpayPaymentId,
                });
                return res.status(200).json({ status: 'already_processed' });
            }

            // Record payment
            const result = await paymentService.recordPayment({
                razorpay_order_id: razorpayOrderId,
                razorpay_payment_id: razorpayPaymentId,
                razorpay_signature: null, // Webhook doesn't include this
                amount: payment.amount,
                method: payment.method,
            });

            if (!result.duplicate) {
                // Get user email for notifications
                const { data: userData } = await supabaseAdmin.auth.admin.getUserById(
                    result.order.user_id
                );

                const planSlug = result.order.notes?.plan_slug || 'custom';

                // Trigger agent workflow
                dispatch('paymentSuccess', {
                    user_id: result.order.user_id,
                    client_email: userData?.user?.email || 'unknown',
                    client_name: userData?.user?.user_metadata?.name || userData?.user?.email || 'Client',
                    plan_slug: planSlug,
                    order_id: result.order.id,
                    payment_id: result.payment.id,
                    razorpay_payment_id: razorpayPaymentId,
                    amount: result.order.amount,
                }).catch((err) => {
                    logger.error('[Webhook] Agent workflow failed', {
                        error: err.message,
                        order_id: result.order.id,
                    });
                });
            }

            return res.status(200).json({ status: 'captured' });
        }

        // ── Handle payment.failed ─────────────────────
        if (eventType === 'payment.failed') {
            const payment = event.payload.payment.entity;

            logger.warn('[Webhook] Payment failed', {
                payment_id: payment.id,
                order_id: payment.order_id,
                error_code: payment.error_code,
                error_description: payment.error_description,
            });

            // Update order status to failed
            if (payment.order_id) {
                await supabaseAdmin
                    .from('orders')
                    .update({ status: 'failed' })
                    .eq('razorpay_order_id', payment.order_id);
            }

            return res.status(200).json({ status: 'noted' });
        }

        // ── Unhandled event — acknowledge anyway ──────
        logger.info('[Webhook] Unhandled event type', { event: eventType });
        return res.status(200).json({ status: 'unhandled' });
    } catch (err) {
        logger.error('[Webhook] Unhandled error', { error: err.message, stack: err.stack });
        // Always return 200 to Razorpay to prevent retries
        return res.status(200).json({ status: 'error_logged' });
    }
}

module.exports = { handleRazorpayWebhook };
