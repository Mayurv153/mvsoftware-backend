// ─── Project Service ────────────────────────────────────────────
// Creates project workspaces in Supabase

const { supabaseAdmin } = require('../config/supabase');
const { getPlan } = require('../config/plans');
const logger = require('../utils/logger');

/**
 * Creates a new project workspace after successful payment.
 */
async function createProject({ userId, planSlug, orderId, paymentId, userName }) {
    const plan = getPlan(planSlug);
    if (!plan) {
        throw new Error(`Invalid plan slug: ${planSlug}`);
    }

    // Get plan UUID from DB
    const { data: dbPlan, error: planError } = await supabaseAdmin
        .from('plans')
        .select('id')
        .eq('slug', planSlug)
        .single();

    if (planError || !dbPlan) {
        throw new Error(`Plan not found in DB: ${planSlug}`);
    }

    // Calculate deadline
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + plan.deliveryDays);

    const projectName = `${plan.name} Project — ${userName || 'Client'}`;

    const { data: project, error } = await supabaseAdmin
        .from('projects')
        .insert({
            user_id: userId,
            plan_id: dbPlan.id,
            order_id: orderId,
            payment_id: paymentId,
            name: projectName,
            status: 'new',
            deadline: deadline.toISOString(),
            assigned_to: 'founder',
            notes: {
                plan_name: plan.name,
                plan_slug: plan.slug,
                delivery_days: plan.deliveryDays,
                features: plan.features,
            },
        })
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to create project: ${error.message}`);
    }

    // ── Update User Profile Plan Badge ──────────────────
    // This allows the frontend to show "Pro", "Starter", etc.
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
            plan_slug: plan.slug,
            updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

    if (profileError) {
        logger.warn('[ProjectService] Failed to update user profile plan badge', {
            userId,
            planSlug,
            error: profileError.message,
        });
    }

    logger.info('[ProjectService] Project created and profile plan updated', {
        projectId: project.id,
        planSlug,
        deadline: deadline.toISOString(),
    });

    return project;
}

/**
 * Gets all projects with optional filters.
 */
async function getProjects(filters = {}) {
    let query = supabaseAdmin
        .from('projects')
        .select('*, plans(name, slug, display_price)')
        .order('created_at', { ascending: false });

    if (filters.status) {
        query = query.eq('status', filters.status);
    }
    if (filters.userId) {
        query = query.eq('user_id', filters.userId);
    }
    if (filters.limit) {
        query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) {
        throw new Error(`Failed to fetch projects: ${error.message}`);
    }

    return data;
}

module.exports = { createProject, getProjects };
