// ─── Supabase JWT Authentication Middleware ─────────────────────
// Verifies the JWT from Authorization header using Supabase Auth

const { supabaseAnon } = require('../config/supabase');
const { unauthorized } = require('../utils/apiResponse');
const logger = require('../utils/logger');

async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return unauthorized(res, 'Missing or invalid Authorization header');
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return unauthorized(res, 'Token not provided');
        }

        // Verify token with Supabase Auth
        const { data, error } = await supabaseAnon.auth.getUser(token);

        if (error || !data.user) {
            logger.warn('[Auth] Invalid token attempt', {
                error: error?.message,
                ip: req.ip,
            });
            return unauthorized(res, 'Invalid or expired token');
        }

        // Attach user to request
        req.user = {
            id: data.user.id,
            email: data.user.email,
            role: data.user.role,
            metadata: data.user.user_metadata,
        };

        req.token = token;
        next();
    } catch (err) {
        logger.error('[Auth] Unexpected error during authentication', {
            error: err.message,
        });
        return unauthorized(res, 'Authentication failed');
    }
}

module.exports = { authenticate };
