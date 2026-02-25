// ─── Email Service ──────────────────────────────────────────────
// Sends admin and client notification emails via Resend

const { getResend } = require('../config/resend');
const logger = require('../utils/logger');

const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const ADMIN_EMAIL = (process.env.ADMIN_EMAILS || '').split(',')[0]?.trim();

/**
 * Sends an email. Falls back to logging if Resend is not configured.
 */
async function sendEmail({ to, subject, html, text }) {
  const resend = getResend();

  if (!resend) {
    logger.info('[Email] Resend not configured — logging email instead', {
      to,
      subject,
    });
    return { id: 'logged-only', to, subject };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    });

    if (error) {
      logger.error('[Email] Failed to send', { error: error.message, to, subject });
      throw new Error(`Email send failed: ${error.message}`);
    }

    logger.info('[Email] Sent successfully', { id: data.id, to, subject });
    return data;
  } catch (err) {
    logger.error('[Email] Exception during send', {
      error: err.message,
      to,
      subject,
    });
    throw err;
  }
}

/**
 * Notifies admin about a new paid project.
 */
async function notifyAdminNewProject({ clientEmail, clientName, planName, amount, projectId, deadline }) {
  if (!ADMIN_EMAIL) {
    logger.warn('[Email] No admin email configured — skipping admin notification');
    return null;
  }

  const displayAmount = `₹${(amount / 100).toLocaleString('en-IN')}`;

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `🎉 New Paid Project — ${planName} Plan`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 32px; color: white; text-align: center;">
          <h1 style="margin: 0 0 8px;">New Project Created! 🚀</h1>
          <p style="margin: 0; opacity: 0.9;">A new client just paid for the ${planName} plan</p>
        </div>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-top: 16px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666;">Client</td><td style="padding: 8px 0; font-weight: 600;">${clientName || clientEmail}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Email</td><td style="padding: 8px 0;">${clientEmail}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Plan</td><td style="padding: 8px 0; font-weight: 600;">${planName}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Amount</td><td style="padding: 8px 0; font-weight: 600; color: #22c55e;">${displayAmount}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Project ID</td><td style="padding: 8px 0; font-family: monospace; font-size: 12px;">${projectId}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Deadline</td><td style="padding: 8px 0; font-weight: 600;">${new Date(deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
          </table>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">MV Software — Automated Notification</p>
      </div>
    `,
  });
}

/**
 * Sends payment confirmation to the client.
 */
async function notifyClientPaymentSuccess({ clientEmail, clientName, planName, amount, deliveryDays, deadline }) {
  const displayAmount = `₹${(amount / 100).toLocaleString('en-IN')}`;
  const deadlineFormatted = new Date(deadline).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return sendEmail({
    to: clientEmail,
    subject: `✅ Payment Received — ${planName} Plan`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 12px; padding: 32px; color: white; text-align: center;">
          <h1 style="margin: 0 0 8px;">Payment Confirmed! ✅</h1>
          <p style="margin: 0; opacity: 0.9;">Thank you for choosing MV Software</p>
        </div>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-top: 16px;">
          <p>Hi ${clientName || 'there'},</p>
          <p>We've received your payment of <strong>${displayAmount}</strong> for the <strong>${planName}</strong> plan. Thank you for trusting us with your project! 🎉</p>
          
          <div style="background: #dcfce7; border-radius: 8px; padding: 16px; margin-top: 16px; border-left: 4px solid #22c55e;">
            <p style="margin: 0; color: #166534; font-weight: 600;">⏰ Our team will contact you within 1 hour!</p>
            <p style="margin: 4px 0 0; color: #15803d; font-size: 14px;">We're already reviewing your project details and preparing to get started.</p>
          </div>

          <h3 style="color: #333; margin-top: 24px;">📋 What happens next?</h3>
          <ol style="color: #555; line-height: 1.8;">
            <li>Our team will reach out to you <strong>within 1 hour</strong> to discuss your requirements</li>
            <li>We'll finalize the project scope and timeline together</li>
            <li>Expected delivery: <strong>${deadlineFormatted}</strong> (${deliveryDays} days)</li>
          </ol>

          <div style="background: #e0e7ff; border-radius: 8px; padding: 16px; margin-top: 16px;">
            <p style="margin: 0; color: #4338ca; font-weight: 600;">💬 Want to chat right away?</p>
            <p style="margin: 4px 0 0; color: #6366f1; font-size: 14px;">Reply to this email or WhatsApp us anytime — we're here for you!</p>
          </div>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">MV Software — Building Digital Excellence</p>
      </div>
    `,
  });
}

/**
 * Sends admin notification for new service request.
 */
async function notifyAdminNewRequest({ name, email, phone, planSlug, message }) {
  if (!ADMIN_EMAIL) return null;

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `📩 New Service Request from ${name}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 12px; padding: 32px; color: white; text-align: center;">
          <h1 style="margin: 0 0 8px;">New Service Request 📩</h1>
          <p style="margin: 0; opacity: 0.9;">Someone wants to work with you!</p>
        </div>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-top: 16px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666;">Name</td><td style="padding: 8px 0; font-weight: 600;">${name}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Email</td><td style="padding: 8px 0;">${email}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Phone</td><td style="padding: 8px 0;">${phone || 'Not provided'}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Plan</td><td style="padding: 8px 0; font-weight: 600;">${planSlug || 'Not specified'}</td></tr>
          </table>
          <div style="background: white; border-radius: 8px; padding: 16px; margin-top: 16px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0 0 4px; font-weight: 600; color: #333;">Message:</p>
            <p style="margin: 0; color: #555;">${message}</p>
          </div>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">MV Software — Automated Notification</p>
      </div>
    `,
  });
}

module.exports = {
  sendEmail,
  notifyAdminNewProject,
  notifyClientPaymentSuccess,
  notifyAdminNewRequest,
};
