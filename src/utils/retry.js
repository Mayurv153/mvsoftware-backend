// ─── Retry with Exponential Backoff ─────────────────────────────

const logger = require('./logger');

/**
 * Retries an async function with exponential backoff.
 *
 * @param {Function} fn - Async function to retry
 * @param {Object} options
 * @param {number} options.maxRetries - Max retry attempts (default: 3)
 * @param {number} options.baseDelay - Base delay in ms (default: 1000)
 * @param {number} options.maxDelay - Max delay in ms (default: 10000)
 * @param {string} options.label - Label for logging (default: 'operation')
 * @returns {Promise<any>}
 */
async function retry(fn, options = {}) {
    const {
        maxRetries = 3,
        baseDelay = 1000,
        maxDelay = 10000,
        label = 'operation',
    } = options;

    let lastError;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;

            if (attempt > maxRetries) {
                logger.error(`[Retry] ${label} failed after ${maxRetries} retries`, {
                    error: err.message,
                });
                throw err;
            }

            const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
            const jitter = delay * (0.5 + Math.random() * 0.5); // Add jitter

            logger.warn(
                `[Retry] ${label} attempt ${attempt}/${maxRetries} failed, retrying in ${Math.round(jitter)}ms`,
                { error: err.message }
            );

            await new Promise((resolve) => setTimeout(resolve, jitter));
        }
    }

    throw lastError;
}

module.exports = { retry };
