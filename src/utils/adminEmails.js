function normalizeEmail(email) {
    return String(email || '')
        .replace(/\\r|\\n/g, '')
        .trim()
        .replace(/^['"]+|['"]+$/g, '')
        .toLowerCase();
}

function parseEmails(value) {
    return String(value || '')
        .replace(/\\r|\\n/g, '')
        .split(',')
        .map(normalizeEmail)
        .filter(Boolean);
}

function getAdminEmails() {
    const merged = [
        ...parseEmails(process.env.ADMIN_EMAILS),
        ...parseEmails(process.env.NEXT_PUBLIC_ADMIN_EMAIL),
    ];

    return [...new Set(merged)];
}

function getPrimaryAdminEmail() {
    return getAdminEmails()[0] || '';
}

function isAdminEmail(email) {
    if (!email) return false;
    return getAdminEmails().includes(normalizeEmail(email));
}

module.exports = {
    getAdminEmails,
    getPrimaryAdminEmail,
    isAdminEmail,
};
