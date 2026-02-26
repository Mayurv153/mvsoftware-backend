// ─── Admin Routes ───────────────────────────────────────────────

const { Router } = require('express');
const {
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
} = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminAuth');

const router = Router();

// All admin routes require auth + admin check
router.use(authenticate, adminOnly);

// Service Requests
router.get('/requests', getServiceRequests);
router.patch('/requests/:id', updateServiceRequest);
router.delete('/requests/:id', deleteServiceRequest);

// Metrics
router.get('/metrics', getDashboardMetrics);

// Payments
router.get('/payments', getPayments);

// Plans
router.get('/plans', getPlans);
router.patch('/plans/:id', updatePlan);

// Testimonials
router.get('/testimonials', getTestimonials);
router.post('/testimonials', createTestimonial);
router.patch('/testimonials/:id', updateTestimonial);
router.delete('/testimonials/:id', deleteTestimonial);

// Projects
router.get('/projects', getAdminProjects);
router.patch('/projects/:id', updateProject);

// Portfolio (public showcase)
router.get('/portfolio', getPortfolio);
router.post('/portfolio', createPortfolio);
router.patch('/portfolio/:id', updatePortfolio);
router.delete('/portfolio/:id', deletePortfolio);

// Blog Posts
router.get('/blogs', getBlogPosts);
router.post('/blogs', createBlogPost);
router.patch('/blogs/:id', updateBlogPost);
router.delete('/blogs/:id', deleteBlogPost);

// Case Studies
router.get('/case-studies', getCaseStudies);
router.post('/case-studies', createCaseStudy);
router.patch('/case-studies/:id', updateCaseStudy);
router.delete('/case-studies/:id', deleteCaseStudy);

// Blog Comments
router.get('/blog-comments', getBlogComments);
router.patch('/blog-comments/:id/reply', replyToComment);
router.patch('/blog-comments/:id/approve', approveComment);
router.delete('/blog-comments/:id', deleteComment);

// Tasks
router.get('/tasks', getAdminTasks);

module.exports = router;
