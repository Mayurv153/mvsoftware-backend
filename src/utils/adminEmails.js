function parseEmails(value) {
    return String(value || '')
        .split(',')
        .map((email) => email.trim().toLowerCase())
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
    return getAdminEmails().includes(String(email).trim().toLowerCase());
}

module.exports = {
    getAdminEmails,
    getPrimaryAdminEmail,
    isAdminEmail,
};
