// ─── Plan Definitions ───────────────────────────────────────────
// Mirrors the seed data in sql/schema.sql

const PLANS = {
    starter: {
        name: 'Starter',
        slug: 'starter',
        priceInr: 399900,         // paisa
        displayPrice: '₹3,999',
        deliveryDays: 3,
        priority: 'normal',
        features: [
            '1-page landing website',
            'Mobile responsive',
            'WhatsApp button',
            'Contact form',
            '3-day delivery',
        ],
    },
    growth: {
        name: 'Growth',
        slug: 'growth',
        priceInr: 999900,
        displayPrice: '₹9,999',
        deliveryDays: 7,
        priority: 'high',
        features: [
            '5-page website',
            'Basic SEO',
            'WhatsApp + contact form',
            '7-day delivery',
        ],
    },
    pro: {
        name: 'Pro',
        slug: 'pro',
        priceInr: 1999900,
        displayPrice: '₹19,999',
        deliveryDays: 14,
        priority: 'urgent',
        features: [
            'Full custom website (8–10 pages)',
            'Admin dashboard for leads',
            'Razorpay integration',
            'SEO setup',
            'Performance optimization',
            '14-day delivery',
        ],
    },
    custom: {
        name: 'Custom',
        slug: 'custom',
        priceInr: 0,
        displayPrice: 'Contact Us',
        deliveryDays: 30,
        priority: 'normal',
        features: [
            'Web apps',
            'SaaS',
            'Dashboards',
            'AI integrations',
            'Maintenance',
        ],
    },
};

function getPlan(slug) {
    return PLANS[slug] || null;
}

function getAllPlans() {
    return Object.values(PLANS);
}

function getValidPlanSlugs() {
    return Object.keys(PLANS);
}

module.exports = { PLANS, getPlan, getAllPlans, getValidPlanSlugs };
