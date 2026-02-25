// ─── Admin Controller ───────────────────────────────────────────

const { supabaseAdmin } = require('../config/supabase');
const { getMetrics, getOrCreateTodayMetrics } = require('../services/metricsService');
const { getProjects } = require('../services/projectService');
const { getTasks } = require('../services/taskService');
const { success, error } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * GET /api/admin/requests
 * Lists all service requests with pagination.
 */
async function getServiceRequests(req, res, next) {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = supabaseAdmin
            .from('service_requests')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error: dbError, count } = await query;

        if (dbError) {
            throw new Error(`Failed to fetch requests: ${dbError.message}`);
        }

        return success(res, {
            requests: data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / parseInt(limit)),
            },
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/admin/metrics
 * Returns today's metrics and optional date range.
 */
async function getDashboardMetrics(req, res, next) {
    try {
        const { start_date, end_date } = req.query;

        let data;
        if (start_date || end_date) {
            data = await getMetrics(start_date, end_date);
        } else {
            const today = await getOrCreateTodayMetrics();
            data = [today];
        }

        return success(res, { metrics: data });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/admin/projects
 * Lists all projects with optional status filter.
 */
async function getAdminProjects(req, res, next) {
    try {
        const { status, limit = 50 } = req.query;
        const projects = await getProjects({ status, limit: parseInt(limit) });

        return success(res, { projects });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/admin/tasks
 * Lists all tasks with optional filters.
 */
async function getAdminTasks(req, res, next) {
    try {
        const { status, priority, limit = 50 } = req.query;
        const tasks = await getTasks({
            status,
            priority,
            limit: parseInt(limit),
        });

        return success(res, { tasks });
    } catch (err) {
        next(err);
    }
}

/**
 * PATCH /api/admin/requests/:id
 * Updates a service request (status, notes).
 */
async function updateServiceRequest(req, res, next) {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        const updates = {};
        if (status) updates.status = status;
        if (notes !== undefined) updates.notes = notes;

        const { data, error: dbError } = await supabaseAdmin
            .from('service_requests')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (dbError) throw new Error(`Failed to update request: ${dbError.message}`);
        return success(res, { request: data });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/admin/payments
 * Lists all payments with optional filters.
 */
async function getPayments(req, res, next) {
    try {
        const { status, limit = 100 } = req.query;
        let query = supabaseAdmin
            .from('payments')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        if (status) query = query.eq('status', status);
        const { data, error: dbError } = await query;
        if (dbError) throw new Error(`Failed to fetch payments: ${dbError.message}`);
        return success(res, { payments: data });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/admin/plans
 * Lists all plans.
 */
async function getPlans(req, res, next) {
    try {
        const { data, error: dbError } = await supabaseAdmin
            .from('plans')
            .select('*')
            .order('price_inr', { ascending: true });

        if (dbError) throw new Error(`Failed to fetch plans: ${dbError.message}`);
        return success(res, { plans: data });
    } catch (err) {
        next(err);
    }
}

/**
 * PATCH /api/admin/plans/:id
 * Updates a plan.
 */
async function updatePlan(req, res, next) {
    try {
        const { id } = req.params;
        const {
            name,
            display_price,
            price_inr,
            delivery_days,
            features,
            is_active,
            category,
            offer_title,
            offer_tagline,
            offer_discount,
            offer_expires_at,
        } = req.body;
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (display_price !== undefined) updates.display_price = display_price;
        if (price_inr !== undefined) updates.price_inr = price_inr;
        if (delivery_days !== undefined) updates.delivery_days = delivery_days;
        if (features !== undefined) updates.features = features;
        if (is_active !== undefined) updates.is_active = is_active;
        if (category !== undefined) updates.category = category;
        if (offer_title !== undefined) updates.offer_title = offer_title;
        if (offer_tagline !== undefined) updates.offer_tagline = offer_tagline;
        if (offer_discount !== undefined) updates.offer_discount = offer_discount;
        if (offer_expires_at !== undefined) updates.offer_expires_at = offer_expires_at;

        const { data, error: dbError } = await supabaseAdmin
            .from('plans')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (dbError) throw new Error(`Failed to update plan: ${dbError.message}`);
        return success(res, { plan: data });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/admin/testimonials
 */
async function getTestimonials(req, res, next) {
    try {
        const { data, error: dbError } = await supabaseAdmin
            .from('testimonials')
            .select('*')
            .order('created_at', { ascending: false });

        if (dbError) throw new Error(`Failed to fetch testimonials: ${dbError.message}`);
        return success(res, { testimonials: data });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/admin/testimonials
 */
async function createTestimonial(req, res, next) {
    try {
        const { client_name, client_role, client_company, content, rating, is_published, avatar_url } = req.body;
        const { data, error: dbError } = await supabaseAdmin
            .from('testimonials')
            .insert({ client_name, client_role, client_company, content, rating: rating || 5, is_published: is_published || false, avatar_url })
            .select()
            .single();

        if (dbError) throw new Error(`Failed to create testimonial: ${dbError.message}`);
        return success(res, { testimonial: data }, 201);
    } catch (err) {
        next(err);
    }
}

/**
 * PATCH /api/admin/testimonials/:id
 */
async function updateTestimonial(req, res, next) {
    try {
        const { id } = req.params;
        const { client_name, client_role, client_company, content, rating, is_published, avatar_url } = req.body;
        const updates = {};
        if (client_name !== undefined) updates.client_name = client_name;
        if (client_role !== undefined) updates.client_role = client_role;
        if (client_company !== undefined) updates.client_company = client_company;
        if (content !== undefined) updates.content = content;
        if (rating !== undefined) updates.rating = rating;
        if (is_published !== undefined) updates.is_published = is_published;
        if (avatar_url !== undefined) updates.avatar_url = avatar_url;

        const { data, error: dbError } = await supabaseAdmin
            .from('testimonials')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (dbError) throw new Error(`Failed to update testimonial: ${dbError.message}`);
        return success(res, { testimonial: data });
    } catch (err) {
        next(err);
    }
}

/**
 * DELETE /api/admin/testimonials/:id
 */
async function deleteTestimonial(req, res, next) {
    try {
        const { id } = req.params;
        const { error: dbError } = await supabaseAdmin
            .from('testimonials')
            .delete()
            .eq('id', id);

        if (dbError) throw new Error(`Failed to delete testimonial: ${dbError.message}`);
        return success(res, { message: 'Testimonial deleted' });
    } catch (err) {
        next(err);
    }
}

/**
 * PATCH /api/admin/projects/:id
 * Updates project status, deadline, notes.
 */
async function updateProject(req, res, next) {
    try {
        const { id } = req.params;
        const { status, deadline, notes, assigned_to } = req.body;
        const updates = {};
        if (status !== undefined) updates.status = status;
        if (deadline !== undefined) updates.deadline = deadline;
        if (notes !== undefined) updates.notes = notes;
        if (assigned_to !== undefined) updates.assigned_to = assigned_to;

        const { data, error: dbError } = await supabaseAdmin
            .from('projects')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (dbError) throw new Error(`Failed to update project: ${dbError.message}`);
        return success(res, { project: data });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────
//  PORTFOLIO PROJECTS (public showcase)
// ─────────────────────────────────────────────

/**
 * GET /api/admin/portfolio
 */
async function getPortfolio(req, res, next) {
    try {
        const { data, error: dbError } = await supabaseAdmin
            .from('portfolio_projects')
            .select('*')
            .order('sort_order', { ascending: true });

        if (dbError) throw new Error(`Failed to fetch portfolio: ${dbError.message}`);
        return success(res, { projects: data });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/admin/portfolio
 */
async function createPortfolio(req, res, next) {
    try {
        const { title, category, description, tech, image_url, live_url, is_published, sort_order } = req.body;

        const { data, error: dbError } = await supabaseAdmin
            .from('portfolio_projects')
            .insert({ title, category, description, tech: tech || [], image_url, live_url, is_published: is_published || false, sort_order: sort_order || 0 })
            .select()
            .single();

        if (dbError) throw new Error(`Failed to create portfolio project: ${dbError.message}`);
        return success(res, { project: data }, 201);
    } catch (err) {
        next(err);
    }
}

/**
 * PATCH /api/admin/portfolio/:id
 */
async function updatePortfolio(req, res, next) {
    try {
        const { id } = req.params;
        const { title, category, description, tech, image_url, live_url, is_published, sort_order } = req.body;
        const updates = {};
        if (title !== undefined) updates.title = title;
        if (category !== undefined) updates.category = category;
        if (description !== undefined) updates.description = description;
        if (tech !== undefined) updates.tech = tech;
        if (image_url !== undefined) updates.image_url = image_url;
        if (live_url !== undefined) updates.live_url = live_url;
        if (is_published !== undefined) updates.is_published = is_published;
        if (sort_order !== undefined) updates.sort_order = sort_order;

        const { data, error: dbError } = await supabaseAdmin
            .from('portfolio_projects')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (dbError) throw new Error(`Failed to update portfolio project: ${dbError.message}`);
        return success(res, { project: data });
    } catch (err) {
        next(err);
    }
}

/**
 * DELETE /api/admin/portfolio/:id
 */
async function deletePortfolio(req, res, next) {
    try {
        const { id } = req.params;
        const { error: dbError } = await supabaseAdmin
            .from('portfolio_projects')
            .delete()
            .eq('id', id);

        if (dbError) throw new Error(`Failed to delete portfolio project: ${dbError.message}`);
        return success(res, { message: 'Portfolio project deleted' });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────
//  BLOG POSTS
// ─────────────────────────────────────────────

async function getBlogPosts(req, res, next) {
    try {
        const { data, error: dbError } = await supabaseAdmin
            .from('blog_posts')
            .select('*')
            .order('created_at', { ascending: false });

        if (dbError) throw new Error(`Failed to fetch blog posts: ${dbError.message}`);

        // Attach comment + like counts
        const postIds = (data || []).map(p => p.id);
        let commentCounts = {};
        let likeCounts = {};

        if (postIds.length) {
            const { data: comments } = await supabaseAdmin
                .from('blog_comments')
                .select('post_id');
            (comments || []).forEach(c => {
                commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1;
            });

            const { data: likes } = await supabaseAdmin
                .from('blog_likes')
                .select('post_id');
            (likes || []).forEach(l => {
                likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1;
            });
        }

        const posts = (data || []).map(p => ({
            ...p,
            comments_count: commentCounts[p.id] || 0,
            likes_count: likeCounts[p.id] || 0,
        }));

        return success(res, { posts });
    } catch (err) {
        next(err);
    }
}

async function createBlogPost(req, res, next) {
    try {
        const { title, slug, excerpt, category, content, read_time, keywords, cover_image_url, is_published } = req.body;
        const { data, error: dbError } = await supabaseAdmin
            .from('blog_posts')
            .insert({
                title,
                slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                excerpt: excerpt || '',
                category: category || '',
                content: content || [],
                read_time: read_time || '5 min read',
                keywords: keywords || [],
                cover_image_url: cover_image_url || '',
                is_published: is_published || false,
            })
            .select()
            .single();

        if (dbError) throw new Error(`Failed to create blog post: ${dbError.message}`);
        return success(res, { post: data }, 201);
    } catch (err) {
        next(err);
    }
}

async function updateBlogPost(req, res, next) {
    try {
        const { id } = req.params;
        const { title, slug, excerpt, category, content, read_time, keywords, cover_image_url, is_published } = req.body;
        const updates = { updated_at: new Date().toISOString() };
        if (title !== undefined) updates.title = title;
        if (slug !== undefined) updates.slug = slug;
        if (excerpt !== undefined) updates.excerpt = excerpt;
        if (category !== undefined) updates.category = category;
        if (content !== undefined) updates.content = content;
        if (read_time !== undefined) updates.read_time = read_time;
        if (keywords !== undefined) updates.keywords = keywords;
        if (cover_image_url !== undefined) updates.cover_image_url = cover_image_url;
        if (is_published !== undefined) updates.is_published = is_published;

        const { data, error: dbError } = await supabaseAdmin
            .from('blog_posts')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (dbError) throw new Error(`Failed to update blog post: ${dbError.message}`);
        return success(res, { post: data });
    } catch (err) {
        next(err);
    }
}

async function deleteBlogPost(req, res, next) {
    try {
        const { id } = req.params;
        const { error: dbError } = await supabaseAdmin
            .from('blog_posts')
            .delete()
            .eq('id', id);

        if (dbError) throw new Error(`Failed to delete blog post: ${dbError.message}`);
        return success(res, { message: 'Blog post deleted' });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────
//  CASE STUDIES
// ─────────────────────────────────────────────

async function getCaseStudies(req, res, next) {
    try {
        const { data, error: dbError } = await supabaseAdmin
            .from('case_studies')
            .select('*')
            .order('created_at', { ascending: false });

        if (dbError) throw new Error(`Failed to fetch case studies: ${dbError.message}`);
        return success(res, { caseStudies: data });
    } catch (err) {
        next(err);
    }
}

async function createCaseStudy(req, res, next) {
    try {
        const { title, slug, client, industry, timeline, services, tech, hero_image_url, challenge, solution, outcome, is_published } = req.body;
        const { data, error: dbError } = await supabaseAdmin
            .from('case_studies')
            .insert({
                title,
                slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                client: client || '',
                industry: industry || '',
                timeline: timeline || '',
                services: services || [],
                tech: tech || [],
                hero_image_url: hero_image_url || '',
                challenge: challenge || '',
                solution: solution || '',
                outcome: outcome || [],
                is_published: is_published || false,
            })
            .select()
            .single();

        if (dbError) throw new Error(`Failed to create case study: ${dbError.message}`);
        return success(res, { caseStudy: data }, 201);
    } catch (err) {
        next(err);
    }
}

async function updateCaseStudy(req, res, next) {
    try {
        const { id } = req.params;
        const { title, slug, client, industry, timeline, services, tech, hero_image_url, challenge, solution, outcome, is_published } = req.body;
        const updates = { updated_at: new Date().toISOString() };
        if (title !== undefined) updates.title = title;
        if (slug !== undefined) updates.slug = slug;
        if (client !== undefined) updates.client = client;
        if (industry !== undefined) updates.industry = industry;
        if (timeline !== undefined) updates.timeline = timeline;
        if (services !== undefined) updates.services = services;
        if (tech !== undefined) updates.tech = tech;
        if (hero_image_url !== undefined) updates.hero_image_url = hero_image_url;
        if (challenge !== undefined) updates.challenge = challenge;
        if (solution !== undefined) updates.solution = solution;
        if (outcome !== undefined) updates.outcome = outcome;
        if (is_published !== undefined) updates.is_published = is_published;

        const { data, error: dbError } = await supabaseAdmin
            .from('case_studies')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (dbError) throw new Error(`Failed to update case study: ${dbError.message}`);
        return success(res, { caseStudy: data });
    } catch (err) {
        next(err);
    }
}

async function deleteCaseStudy(req, res, next) {
    try {
        const { id } = req.params;
        const { error: dbError } = await supabaseAdmin
            .from('case_studies')
            .delete()
            .eq('id', id);

        if (dbError) throw new Error(`Failed to delete case study: ${dbError.message}`);
        return success(res, { message: 'Case study deleted' });
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────
//  BLOG COMMENTS (admin management)
// ─────────────────────────────────────────────

async function getBlogComments(req, res, next) {
    try {
        const { data, error: dbError } = await supabaseAdmin
            .from('blog_comments')
            .select('*, blog_posts(title, slug)')
            .order('created_at', { ascending: false });

        if (dbError) throw new Error(`Failed to fetch comments: ${dbError.message}`);
        return success(res, { comments: data });
    } catch (err) {
        next(err);
    }
}

async function replyToComment(req, res, next) {
    try {
        const { id } = req.params;
        const { admin_reply } = req.body;

        const { data, error: dbError } = await supabaseAdmin
            .from('blog_comments')
            .update({ admin_reply, is_approved: true })
            .eq('id', id)
            .select()
            .single();

        if (dbError) throw new Error(`Failed to reply to comment: ${dbError.message}`);
        return success(res, { comment: data });
    } catch (err) {
        next(err);
    }
}

async function approveComment(req, res, next) {
    try {
        const { id } = req.params;
        const { is_approved } = req.body;

        const { data, error: dbError } = await supabaseAdmin
            .from('blog_comments')
            .update({ is_approved })
            .eq('id', id)
            .select()
            .single();

        if (dbError) throw new Error(`Failed to update comment: ${dbError.message}`);
        return success(res, { comment: data });
    } catch (err) {
        next(err);
    }
}

async function deleteComment(req, res, next) {
    try {
        const { id } = req.params;
        const { error: dbError } = await supabaseAdmin
            .from('blog_comments')
            .delete()
            .eq('id', id);

        if (dbError) throw new Error(`Failed to delete comment: ${dbError.message}`);
        return success(res, { message: 'Comment deleted' });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getServiceRequests,
    getDashboardMetrics,
    getAdminProjects,
    getAdminTasks,
    updateServiceRequest,
    getPayments,
    getPlans,
    updatePlan,
    getTestimonials,
    createTestimonial,
    updateTestimonial,
    deleteTestimonial,
    updateProject,
    getPortfolio,
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
    getBlogPosts,
    createBlogPost,
    updateBlogPost,
    deleteBlogPost,
    getCaseStudies,
    createCaseStudy,
    updateCaseStudy,
    deleteCaseStudy,
    getBlogComments,
    replyToComment,
    approveComment,
    deleteComment,
};
