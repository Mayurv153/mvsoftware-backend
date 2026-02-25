// ─── Metrics Service ────────────────────────────────────────────
// Updates daily admin dashboard metrics

const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Gets today's date in YYYY-MM-DD format (IST).
 */
function getTodayIST() {
    const now = new Date();
    // Convert to IST (UTC+5:30)
    const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    return ist.toISOString().split('T')[0];
}

/**
 * Ensures a metrics row exists for today and returns it.
 */
async function getOrCreateTodayMetrics() {
    const today = getTodayIST();

    // Try to get existing
    const { data: existing } = await supabaseAdmin
        .from('admin_metrics')
        .select('*')
        .eq('date', today)
        .single();

    if (existing) return existing;

    // Create new
    const { data: created, error } = await supabaseAdmin
        .from('admin_metrics')
        .insert({ date: today })
        .select()
        .single();

    if (error) {
        // Handle race condition (another request might have created it)
        if (error.code === '23505') {
            const { data: retried } = await supabaseAdmin
                .from('admin_metrics')
                .select('*')
                .eq('date', today)
                .single();
            return retried;
        }
        throw new Error(`Failed to create metrics row: ${error.message}`);
    }

    return created;
}

/**
 * Increments today's revenue by the given amount (in paisa).
 */
async function incrementRevenue(amountPaisa) {
    const metrics = await getOrCreateTodayMetrics();

    const { error } = await supabaseAdmin
        .from('admin_metrics')
        .update({
            total_revenue: (metrics.total_revenue || 0) + amountPaisa,
        })
        .eq('id', metrics.id);

    if (error) {
        throw new Error(`Failed to update revenue: ${error.message}`);
    }

    logger.info('[Metrics] Revenue incremented', {
        amount: amountPaisa,
        date: metrics.date,
    });
}

/**
 * Increments today's new projects count.
 */
async function incrementNewProjects() {
    const metrics = await getOrCreateTodayMetrics();

    const { error } = await supabaseAdmin
        .from('admin_metrics')
        .update({
            new_projects: (metrics.new_projects || 0) + 1,
        })
        .eq('id', metrics.id);

    if (error) {
        throw new Error(`Failed to update new_projects: ${error.message}`);
    }
}

/**
 * Increments today's new service requests count.
 */
async function incrementNewRequests() {
    const metrics = await getOrCreateTodayMetrics();

    const { error } = await supabaseAdmin
        .from('admin_metrics')
        .update({
            new_requests: (metrics.new_requests || 0) + 1,
        })
        .eq('id', metrics.id);

    if (error) {
        throw new Error(`Failed to update new_requests: ${error.message}`);
    }
}

/**
 * Gets metrics for a date range.
 */
async function getMetrics(startDate, endDate) {
    let query = supabaseAdmin
        .from('admin_metrics')
        .select('*')
        .order('date', { ascending: false });

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch metrics: ${error.message}`);

    return data;
}

module.exports = {
    getOrCreateTodayMetrics,
    incrementRevenue,
    incrementNewProjects,
    incrementNewRequests,
    getMetrics,
};
