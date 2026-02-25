// ─── Razorpay Client Configuration ──────────────────────────────
// Exports null if keys not set (allows server to boot without Razorpay)

const Razorpay = require('razorpay');
const logger = require('../utils/logger');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

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

module.exports = { getRazorpay, isRazorpayConfigured };
