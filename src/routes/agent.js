// ─── Agent Routes ───────────────────────────────────────────────

const { Router } = require('express');
const { runAgent, getAvailableTriggers } = require('../controllers/agentController');
const { authenticate } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminAuth');

const router = Router();

// All agent routes require auth + admin check
router.use(authenticate, adminOnly);

// POST /api/agent/run — Execute a trigger manually
router.post('/run', runAgent);

// GET /api/agent/triggers — List available triggers
router.get('/triggers', getAvailableTriggers);

module.exports = router;
