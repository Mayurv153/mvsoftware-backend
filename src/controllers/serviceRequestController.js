// ─── Service Request Controller ─────────────────────────────────

const { supabaseAdmin } = require('../config/supabase');
const { notifyAdminNewRequest } = require('../services/emailService');
const { incrementNewRequests } = require('../services/metricsService');
const { success, created, error } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * POST /api/service-requests
 * Public endpoint — saves a service request and notifies admin.
 */
async function createServiceRequest(req, res, next) {
    try {
        const { name, email, phone, plan_slug, message } = req.body;

        // Save to DB
        const { data: request, error: dbError } = await supabaseAdmin
            .from('service_requests')
            .insert({
                name,
                email,
                phone: phone || null,
                plan_slug: plan_slug || null,
                message,
                status: 'new',
            })
            .select()
            .single();

        if (dbError) {
            throw new Error(`Failed to save request: ${dbError.message}`);
        }

        logger.info('[ServiceRequest] New request created', {
            id: request.id,
            email,
            plan: plan_slug,
        });

        // Notify admin (async — don't block response)
        notifyAdminNewRequest({ name, email, phone, planSlug: plan_slug, message }).catch(
            (err) => {
                logger.error('[ServiceRequest] Admin notification failed', {
                    error: err.message,
                });
            }
        );

        // Increment metrics (async)
        incrementNewRequests().catch((err) => {
            logger.error('[ServiceRequest] Metrics update failed', {
                error: err.message,
            });
        });

        return created(res, {
            id: request.id,
            message: 'Service request submitted successfully. We will contact you soon!',
        });
    } catch (err) {
        next(err);
    }
}

module.exports = { createServiceRequest };
