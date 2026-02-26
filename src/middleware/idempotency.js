// ─── Idempotency Key Middleware ──────────────────────────────────
// Prevents duplicate charges / operations using Idempotency-Key header

const { supabaseAdmin } = require('../config/supabase');
const { conflict } = require('../utils/apiResponse');
const logger = require('../utils/logger');

function idempotency(req, res, next) {
    const idempotencyKey = req.headers['idempotency-key'];

    if (!idempotencyKey) {
        // No key provided — proceed normally
        return next();
    }

    const route = `${req.method}:${req.originalUrl}`;

    // Check if key already exists
    supabaseAdmin
        .from('idempotency_keys')
        .select('response, status_code')
        .eq('key', idempotencyKey)
        .eq('route', route)
        .maybeSingle()
        .then(({ data, error }) => {
            if (data && !error) {
                // Key exists — return cached response
                logger.info('[Idempotency] Returning cached response', {
                    key: idempotencyKey,
                    route,
                });
                return res.status(data.status_code).json(data.response);
            }

            // Key doesn't exist — intercept response to cache it
            const originalJson = res.json.bind(res);

            res.json = function (body) {
                // Save to idempotency_keys table (fire and forget)
                supabaseAdmin
                    .from('idempotency_keys')
                    .insert({
                        key: idempotencyKey,
                        route,
                        response: body,
                        status_code: res.statusCode,
                    })
                    .then(({ error: insertError }) => {
                        if (insertError) {
                            logger.warn('[Idempotency] Failed to cache response', {
                                key: idempotencyKey,
                                error: insertError.message,
                            });
                        }
                    });

                return originalJson(body);
            };

            next();
        })
        .catch((err) => {
            logger.error('[Idempotency] Error checking key', {
                error: err.message,
            });
            // Don't block request on idempotency check failure
            next();
        });
}

module.exports = { idempotency };
