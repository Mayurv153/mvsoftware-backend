// ─── Razorpay Client Configuration ──────────────────────────────
// Exports null if keys not set (allows server to boot without Razorpay)

const Razorpay = require('razorpay');
const logger = require('../utils/logger');

function normalizeEnv(value) {
    return String(value || '')
        .replace(/\r|\n/g, '')
        .trim()
        .replace(/^['"]+|['"]+$/g, '');
}

const RAZORPAY_KEY_ID = normalizeEnv(process.env.RAZORPAY_KEY_ID);
const RAZORPAY_KEY_SECRET = normalizeEnv(process.env.RAZORPAY_KEY_SECRET);

let razorpayInstance = null;

if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
    razorpayInstance = new Razorpay({
        key_id: RAZORPAY_KEY_ID,
        key_secret: RAZORPAY_KEY_SECRET,
    });
    logger.info('[Razorpay] Client initialized successfully');
} else {
    logger.warn(
        '[Razorpay] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set — payment endpoints will return placeholder responses'
    );
}

function getRazorpay() {
    return razorpayInstance;
}

function isRazorpayConfigured() {
    return razorpayInstance !== null;
}

function getRazorpayKeyId() {
    return RAZORPAY_KEY_ID;
}

function getRazorpayKeySecret() {
    return RAZORPAY_KEY_SECRET;
}

module.exports = {
    getRazorpay,
    isRazorpayConfigured,
    getRazorpayKeyId,
    getRazorpayKeySecret,
};
