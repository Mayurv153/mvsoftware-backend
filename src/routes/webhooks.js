// ─── Webhook Routes ─────────────────────────────────────────────

const { Router } = require('express');
const { handleRazorpayWebhook } = require('../controllers/webhookController');

const router = Router();

// POST /api/webhooks/razorpay
// No auth middleware — Razorpay can't send JWTs
// Raw body is needed for signature verification (handled in server.js)
router.post('/razorpay', handleRazorpayWebhook);

module.exports = router;
