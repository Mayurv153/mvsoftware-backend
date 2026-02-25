// ─── Scheduler: Daily Digest ────────────────────────────────────
// Sends a daily summary email to admin at 8:30 AM IST

const cron = require('node-cron');
const { getOrCreateTodayMetrics } = require('../../services/metricsService');
const { getTasks } = require('../../services/taskService');
const { sendEmail } = require('../../services/emailService');
const logger = require('../../utils/logger');
const { getPrimaryAdminEmail } = require('../../utils/adminEmails');

function startDailyDigest() {
    const ADMIN_EMAIL = getPrimaryAdminEmail();

    if (!ADMIN_EMAIL) {
        logger.warn('[Scheduler] No admin email — daily digest disabled');
        return;
    }

    // 8:30 AM IST = 3:00 AM UTC
    cron.schedule('0 3 * * *', async () => {
        logger.info('[Scheduler] Running daily digest...');

        try {
            const metrics = await getOrCreateTodayMetrics();
            const pendingTasks = await getTasks({ status: 'new', limit: 10 });
            const inProgressTasks = await getTasks({ status: 'in_progress', limit: 10 });

            const displayRevenue = `₹${((metrics.total_revenue || 0) / 100).toLocaleString('en-IN')}`;

            await sendEmail({
                to: ADMIN_EMAIL,
                subject: `📊 Daily Digest — ${new Date().toLocaleDateString('en-IN')}`,
                html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); border-radius: 12px; padding: 32px; color: white; text-align: center;">
              <h1 style="margin: 0 0 8px;">Daily Digest 📊</h1>
              <p style="margin: 0; opacity: 0.9;">${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            
            <div style="display: flex; gap: 12px; margin-top: 16px; flex-wrap: wrap;">
              <div style="flex: 1; min-width: 120px; background: #f0fdf4; border-radius: 12px; padding: 20px; text-align: center;">
                <p style="margin: 0; color: #666; font-size: 12px;">Revenue Today</p>
                <p style="margin: 4px 0 0; font-size: 24px; font-weight: 700; color: #22c55e;">${displayRevenue}</p>
              </div>
              <div style="flex: 1; min-width: 120px; background: #eff6ff; border-radius: 12px; padding: 20px; text-align: center;">
                <p style="margin: 0; color: #666; font-size: 12px;">New Projects</p>
                <p style="margin: 4px 0 0; font-size: 24px; font-weight: 700; color: #2563eb;">${metrics.new_projects || 0}</p>
              </div>
              <div style="flex: 1; min-width: 120px; background: #fef3c7; border-radius: 12px; padding: 20px; text-align: center;">
                <p style="margin: 0; color: #666; font-size: 12px;">New Requests</p>
                <p style="margin: 4px 0 0; font-size: 24px; font-weight: 700; color: #d97706;">${metrics.new_requests || 0}</p>
              </div>
            </div>

            ${pendingTasks.length > 0 ? `
            <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-top: 16px;">
              <h3 style="margin: 0 0 12px; color: #333;">🔴 Pending Tasks (${pendingTasks.length})</h3>
              ${pendingTasks.map(t => `
                <div style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="font-weight: 600;">${t.title}</span>
                  <span style="float: right; font-size: 12px; color: ${t.priority === 'urgent' ? '#ef4444' : t.priority === 'high' ? '#f59e0b' : '#6b7280'};">${t.priority}</span>
                </div>
              `).join('')}
            </div>` : ''}

            ${inProgressTasks.length > 0 ? `
            <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-top: 16px;">
              <h3 style="margin: 0 0 12px; color: #333;">🟡 In Progress (${inProgressTasks.length})</h3>
              ${inProgressTasks.map(t => `
                <div style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="font-weight: 600;">${t.title}</span>
                </div>
              `).join('')}
            </div>` : ''}

            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">MV Software — Automated Daily Digest</p>
          </div>
        `,
            });

            logger.info('[Scheduler] Daily digest sent successfully');
        } catch (err) {
            logger.error('[Scheduler] Daily digest failed', { error: err.message });
        }
    }, {
        timezone: 'Asia/Kolkata',
    });

    logger.info('[Scheduler] Daily digest scheduled for 8:30 AM IST');
}

module.exports = { startDailyDigest };
