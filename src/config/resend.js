// ─── Resend Email Client ────────────────────────────────────────

const { Resend } = require('resend');
const logger = require('../utils/logger');

function normalizeEnv(value) {
    return String(value || '')
        .replace(/\r|\n/g, '')
        .trim()
        .replace(/^['"]+|['"]+$/g, '');
}

const RESEND_API_KEY = normalizeEnv(process.env.RESEND_API_KEY);
const EMAIL_FROM = normalizeEnv(process.env.EMAIL_FROM || 'noreply@mvsoftware.tech');

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
