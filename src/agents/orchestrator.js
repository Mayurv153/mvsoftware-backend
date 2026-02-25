// ─── Agent Orchestrator ─────────────────────────────────────────
// Central dispatcher for agent triggers and manual workflow execution

const logger = require('../utils/logger');

// Registry of available triggers
const triggers = {};

// Auto-register triggers
const paymentSuccessTrigger = require('./triggers/paymentSuccess');
triggers[paymentSuccessTrigger.name] = paymentSuccessTrigger;

/**
 * Dispatches a trigger by name with the given payload.
 *
 * @param {string} triggerName - Name of the trigger to execute
 * @param {Object} payload - Data to pass to the trigger
 * @returns {Promise<Object>} Trigger execution result
 */
async function dispatch(triggerName, payload) {
    const trigger = triggers[triggerName];

    if (!trigger) {
        const available = Object.keys(triggers).join(', ');
        throw Object.assign(
            new Error(`Unknown trigger: "${triggerName}". Available: ${available}`),
            { statusCode: 400 }
        );
    }

    logger.info(`[Orchestrator] Dispatching trigger: ${triggerName}`, {
        payload_keys: Object.keys(payload),
    });

    try {
        const result = await trigger.execute(payload);

        logger.info(`[Orchestrator] Trigger "${triggerName}" completed`, {
            status: result.status,
            duration_ms: result.duration_ms,
        });

        return result;
    } catch (err) {
        logger.error(`[Orchestrator] Trigger "${triggerName}" threw unhandled error`, {
            error: err.message,
        });
        throw err;
    }
}

/**
 * Lists all available triggers.
 */
function listTriggers() {
    return Object.entries(triggers).map(([name, trigger]) => ({
        name,
        description: trigger.description || '',
    }));
}

module.exports = { dispatch, listTriggers };
