// ─── Resend Email Client ────────────────────────────────────────

const { Resend } = require('resend');
const logger = require('../utils/logger');

const RESEND_API_KEY = process.env.RESEND_API_KEY;

let resendClient = null;

if (RESEND_API_KEY) {
    resendClient = new Resend(RESEND_API_KEY);
    logger.info('[Resend] Email client initialized');
} else {
    logger.warn('[Resend] RESEND_API_KEY not set — emails will be logged only');
}

function getResend() {
    return resendClient;
}

module.exports = { getResend };
