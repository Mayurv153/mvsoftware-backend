// ─── Joi Validation Middleware Factory ───────────────────────────

const { badRequest } = require('../utils/apiResponse');

/**
 * Creates a validation middleware for the given Joi schema.
 *
 * @param {import('joi').ObjectSchema} schema - Joi schema
 * @param {'body'|'query'|'params'} source - Request property to validate
 * @returns {Function} Express middleware
 */
function validate(schema, source = 'body') {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[source], {
            abortEarly: false,
            stripUnknown: true,
            convert: true,
        });

        if (error) {
            const details = error.details.map((d) => ({
                field: d.path.join('.'),
                message: d.message.replace(/"/g, ''),
            }));

            return badRequest(res, 'Validation failed', details);
        }

        // Replace with sanitized/converted values
        req[source] = value;
        next();
    };
}

module.exports = { validate };
