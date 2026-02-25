// ─── Standardized API Response Helpers ───────────────────────────

function success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString(),
    });
}

function created(res, data = null, message = 'Created successfully') {
    return success(res, data, message, 201);
}

function error(res, message = 'Internal server error', statusCode = 500, details = null) {
    const response = {
        success: false,
        message,
        timestamp: new Date().toISOString(),
    };
    if (details && process.env.NODE_ENV !== 'production') {
        response.details = details;
    }
    return res.status(statusCode).json(response);
}

function badRequest(res, message = 'Bad request', details = null) {
    return error(res, message, 400, details);
}

function unauthorized(res, message = 'Unauthorized') {
    return error(res, message, 401);
}

function forbidden(res, message = 'Forbidden') {
    return error(res, message, 403);
}

function notFound(res, message = 'Not found') {
    return error(res, message, 404);
}

function conflict(res, message = 'Conflict') {
    return error(res, message, 409);
}

function tooManyRequests(res, message = 'Too many requests') {
    return error(res, message, 429);
}

module.exports = {
    success,
    created,
    error,
    badRequest,
    unauthorized,
    forbidden,
    notFound,
    conflict,
    tooManyRequests,
};
