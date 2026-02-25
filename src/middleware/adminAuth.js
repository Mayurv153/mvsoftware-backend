// ─── Admin Authorization Middleware ─────────────────────────────
// Must be used AFTER authenticate middleware

const { forbidden } = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { isAdminEmail } = require('../utils/adminEmails');

function adminOnly(req, res, next) {
    if (!req.user) {
        return forbidden(res, 'Authentication required before admin check');
    }

    const userEmail = (req.user.email || '').toLowerCase();

    if (!isAdminEmail(userEmail)) {
        logger.warn('[AdminAuth] Unauthorized admin access attempt', {
            email: userEmail,
            ip: req.ip,
            path: req.path,
        });
        return forbidden(res, 'Admin access required');
    }

    req.isAdmin = true;
    next();
}

module.exports = { adminOnly };
