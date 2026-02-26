// ─── Public Routes ──────────────────────────────────────────────
// Unauthenticated endpoints that serve data to the public website

const { Router } = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { success } = require('../utils/apiResponse');
const logger = require('../utils/logger');

const router = Router();

/**
 * GET /api/public/plans
 * Returns all plans for the pricing page.
 */
router.get('/plans', async (_req, res, next) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('plans')
            .select('*')
            .order('price_inr', { ascending: true });

        if (error) throw new Error(`Failed to fetch plans: ${error.message}`);

        // Map DB snake_case columns to frontend camelCase
        const plans = (data || []).map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            displayPrice: p.display_price,
            priceInr: p.price_inr,
            deliveryDays: p.delivery_days,
            features: p.features || [],
            description: p.description || '',
            popular: p.popular || false,
        }));

        return success(res, { plans });
    } catch (err) {
        logger.error('[Public] Failed to fetch plans', { error: err.message });
        next(err);
    }
});

/**
 * GET /api/public/testimonials
 * Returns all published testimonials for the landing page.
 */
router.get('/testimonials', async (_req, res, next) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('testimonials')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw new Error(`Failed to fetch testimonials: ${error.message}`);

        // Map DB column names to frontend-friendly format
        const testimonials = (data || []).map((t) => ({
            id: t.id,
            name: t.client_name || t.name,
            role: t.client_role || t.role,
            company: t.client_company || t.company,
            content: t.content,
            avatar_url: t.avatar_url,
            rating: t.rating,
        }));

        return success(res, { testimonials });
    } catch (err) {
        logger.error('[Public] Failed to fetch testimonials', { error: err.message });
        next(err);
    }
});

/**
 * GET /api/public/portfolio
 * Returns all published portfolio projects.
 */
router.get('/portfolio', async (_req, res, next) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('portfolio_projects')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) throw new Error(`Failed to fetch portfolio: ${error.message}`);
        return success(res, { projects: data || [] });
    } catch (err) {
        logger.error('[Public] Failed to fetch portfolio', { error: err.message });
        next(err);
    }
});

// ─────────────────────────────────────────────
//  BLOG POSTS (public)
// ─────────────────────────────────────────────

/**
 * GET /api/public/blogs
 * Returns all published blog posts.
 */
router.get('/blogs', async (_req, res, next) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('blog_posts')
            .select('*')
            .eq('is_published', true)
            .order('created_at', { ascending: false });

        if (error) throw new Error(`Failed to fetch blogs: ${error.message}`);

        // Attach like counts
        let likeCounts = {};
        const { data: likes } = await supabaseAdmin
            .from('blog_likes')
            .select('post_id');
        (likes || []).forEach(l => {
            likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1;
        });

        // Attach comment counts (approved only)
        let commentCounts = {};
        const { data: comments } = await supabaseAdmin
            .from('blog_comments')
            .select('post_id')
            .eq('is_approved', true);
        (comments || []).forEach(c => {
            commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1;
        });

        const posts = (data || []).map(p => ({
            ...p,
            likes_count: likeCounts[p.id] || 0,
            comments_count: commentCounts[p.id] || 0,
        }));

        return success(res, { posts });
    } catch (err) {
        logger.error('[Public] Failed to fetch blogs', { error: err.message });
        next(err);
    }
});

/**
 * GET /api/public/blogs/:slug
 * Returns a single published blog post with like & comment counts.
 */
router.get('/blogs/:slug', async (req, res, next) => {
    try {
        const { slug } = req.params;

        const { data, error } = await supabaseAdmin
            .from('blog_posts')
            .select('*')
            .eq('slug', slug)
            .eq('is_published', true)
            .single();

        if (error || !data) {
            return res.status(404).json({ success: false, message: 'Blog post not found' });
        }

        // Get like count
        const { count: likesCount } = await supabaseAdmin
            .from('blog_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', data.id);

        // Get approved comments
        const { data: comments } = await supabaseAdmin
            .from('blog_comments')
            .select('*')
            .eq('post_id', data.id)
            .eq('is_approved', true)
            .order('created_at', { ascending: false });

        return success(res, {
            post: {
                ...data,
                likes_count: likesCount || 0,
                comments: comments || [],
            },
        });
    } catch (err) {
        logger.error('[Public] Failed to fetch blog post', { error: err.message });
        next(err);
    }
});

/**
 * POST /api/public/blogs/:slug/like
 * Toggle like on a blog post. Requires authentication.
 */
router.post('/blogs/:slug/like', async (req, res, next) => {
    try {
        const { slug } = req.params;
        const userId = req.body.user_id;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'user_id is required' });
        }

        // Get post
        const { data: post } = await supabaseAdmin
            .from('blog_posts')
            .select('id')
            .eq('slug', slug)
            .single();

        if (!post) {
            return res.status(404).json({ success: false, message: 'Blog post not found' });
        }

        // Check if already liked
        const { data: existing } = await supabaseAdmin
            .from('blog_likes')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', userId)
            .single();

        if (existing) {
            // Unlike
            await supabaseAdmin.from('blog_likes').delete().eq('id', existing.id);
            return success(res, { liked: false });
        } else {
            // Like
            await supabaseAdmin.from('blog_likes').insert({ post_id: post.id, user_id: userId });
            return success(res, { liked: true });
        }
    } catch (err) {
        logger.error('[Public] Failed to toggle like', { error: err.message });
        next(err);
    }
});

/**
 * POST /api/public/blogs/:slug/comments
 * Add a comment to a blog post.
 */
router.post('/blogs/:slug/comments', async (req, res, next) => {
    try {
        const { slug } = req.params;
        const { user_name, user_email, content } = req.body;

        if (!user_name || !content) {
            return res.status(400).json({ success: false, message: 'user_name and content are required' });
        }

        // Get post
        const { data: post } = await supabaseAdmin
            .from('blog_posts')
            .select('id')
            .eq('slug', slug)
            .single();

        if (!post) {
            return res.status(404).json({ success: false, message: 'Blog post not found' });
        }

        const { data, error } = await supabaseAdmin
            .from('blog_comments')
            .insert({
                post_id: post.id,
                user_name,
                user_email: user_email || '',
                content,
                is_approved: false,
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to add comment: ${error.message}`);
        return success(res, { comment: data, message: 'Comment submitted for review' }, 201);
    } catch (err) {
        logger.error('[Public] Failed to add comment', { error: err.message });
        next(err);
    }
});

// ─────────────────────────────────────────────
//  CASE STUDIES (public)
// ─────────────────────────────────────────────

/**
 * GET /api/public/case-studies
 * Returns all published case studies.
 */
router.get('/case-studies', async (_req, res, next) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('case_studies')
            .select('*')
            .eq('is_published', true)
            .order('created_at', { ascending: false });

        if (error) throw new Error(`Failed to fetch case studies: ${error.message}`);
        return success(res, { caseStudies: data || [] });
    } catch (err) {
        logger.error('[Public] Failed to fetch case studies', { error: err.message });
        next(err);
    }
});

/**
 * GET /api/public/case-studies/:slug
 * Returns a single published case study.
 */
router.get('/case-studies/:slug', async (req, res, next) => {
    try {
        const { slug } = req.params;

        const { data, error } = await supabaseAdmin
            .from('case_studies')
            .select('*')
            .eq('slug', slug)
            .eq('is_published', true)
            .single();

        if (error || !data) {
            return res.status(404).json({ success: false, message: 'Case study not found' });
        }

        return success(res, { caseStudy: data });
    } catch (err) {
        logger.error('[Public] Failed to fetch case study', { error: err.message });
        next(err);
    }
});

module.exports = router;

/**
 * GET /api/public/diagnostics/razorpay
 * Safe diagnostic endpoint — returns presence of Razorpay config (no secrets).
 */
router.get('/diagnostics/razorpay', (req, res) => {
    try {
        // Require inside handler to avoid top-level cycles during startup
        const {
            isRazorpayConfigured,
            getRazorpayKeyId,
        } = require('../config/razorpay');

        const configured = Boolean(isRazorpayConfigured());
        const keyId = getRazorpayKeyId() || null;

        const maskedKeyId = keyId
            ? `${String(keyId).slice(0, 4)}...${String(keyId).slice(-4)}`
            : null;

        return success(res, {
            razorpay_configured: configured,
            razorpay_key_id_present: Boolean(keyId),
            razorpay_key_id_masked: maskedKeyId,
            webhook_secret_present: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
        });
    } catch (err) {
        logger.error('[Diagnostics] Failed to read Razorpay config', { error: err.message });
        return res.status(500).json({ success: false, message: 'Diagnostics failed' });
    }
});
