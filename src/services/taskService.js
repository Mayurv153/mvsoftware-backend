// ─── Task Service ───────────────────────────────────────────────
// Creates and manages internal tasks for the team

const { supabaseAdmin } = require('../config/supabase');
const { getPlan } = require('../config/plans');
const logger = require('../utils/logger');

/**
 * Creates an internal task for a new project.
 */
async function createProjectTask({ projectId, planSlug, userId, clientName }) {
    const plan = getPlan(planSlug);
    if (!plan) {
        throw new Error(`Invalid plan slug for task creation: ${planSlug}`);
    }

    // Calculate due date (same as project deadline)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (plan.deliveryDays || 7));

    const { data: task, error } = await supabaseAdmin
        .from('tasks')
        .insert({
            project_id: projectId,
            title: `Build ${plan.name} project for ${clientName || 'client'}`,
            description: `New ${plan.name} plan project. Features: ${plan.features.join(', ')}. Delivery: ${plan.deliveryDays} days.`,
            status: 'new',
            priority: plan.priority,
            assigned_to: 'founder',
            due_date: dueDate.toISOString(),
            metadata: {
                plan_slug: planSlug,
                plan_name: plan.name,
                user_id: userId,
            },
        })
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to create task: ${error.message}`);
    }

    logger.info('[TaskService] Task created', {
        taskId: task.id,
        projectId,
        priority: plan.priority,
    });

    return task;
}

/**
 * Gets tasks with optional filters.
 */
async function getTasks(filters = {}) {
    let query = supabaseAdmin
        .from('tasks')
        .select('*, projects(name, status)')
        .order('created_at', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.priority) query = query.eq('priority', filters.priority);
    if (filters.projectId) query = query.eq('project_id', filters.projectId);
    if (filters.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch tasks: ${error.message}`);

    return data;
}

module.exports = { createProjectTask, getTasks };
