// ─── Agent Controller ───────────────────────────────────────────

const { dispatch, listTriggers } = require('../agents/orchestrator');
const { success, error, badRequest } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * POST /api/agent/run
 * Manually triggers an agent workflow (admin only).
 */
async function runAgent(req, res, next) {
    try {
        const { trigger, payload } = req.body;

        if (!trigger) {
            return badRequest(res, 'Missing required field: trigger');
        }

        if (!payload || typeof payload !== 'object') {
            return badRequest(res, 'Missing or invalid payload object');
        }

        logger.info('[AgentController] Manual trigger requested', {
            trigger,
            admin: req.user.email,
        });

        const result = await dispatch(trigger, payload);

        return success(res, {
            trigger,
            result,
        });
    } catch (err) {
        if (err.statusCode) {
            return error(res, err.message, err.statusCode);
        }
        next(err);
    }
}

/**
 * GET /api/agent/triggers
 * Lists all available agent triggers.
 */
async function getAvailableTriggers(req, res) {
    const triggers = listTriggers();
    return success(res, { triggers });
}

module.exports = { runAgent, getAvailableTriggers };
