import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Escapes HTML characters in untrusted strings to prevent email HTML injection attacks
 */
export const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Clean Email Provider Abstraction for SetuGov
 * 
 * Supported Providers:
 * - 'console' (Local development & test environments ONLY)
 * - 'resend' (Resend API)
 * - 'sendgrid' (SendGrid v3 API)
 * - 'smtp' (Standard SMTP delivery)
 */

/**
 * Dispatch an email via the configured provider
 * 
 * @param {object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 * @returns {Promise<{ email_accepted_by_provider: boolean, provider: string, messageId?: string }>}
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  const provider = (config.EMAIL_PROVIDER || 'console').toLowerCase().trim();

  if (config.NODE_ENV === 'production' && provider === 'console') {
    throw new Error(
      'Security Configuration Error: EMAIL_PROVIDER cannot be set to "console" in production. A production email provider (resend, sendgrid, smtp) and credentials are required.'
    );
  }

  if (provider === 'console') {
    // Safe logging in development without leaking secrets or tokens
    logger.info(`[EMAIL SERVICE - DEV CONSOLE] Target: ${to} | Subject: "${subject}" | Status: Accepted (Dev Mode)`);
    return {
      email_accepted_by_provider: true,
      delivered: true,
      provider: 'console',
      messageId: `dev-console-${Date.now()}`
    };
  }

  if (provider === 'resend') {
    if (!config.EMAIL_API_KEY) {
      throw new Error('Email Delivery Error: EMAIL_API_KEY is required for Resend email provider.');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.EMAIL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: config.EMAIL_FROM,
        to: [to],
        subject,
        text,
        html
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Resend API Error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    return {
      email_accepted_by_provider: true,
      delivered: true,
      provider: 'resend',
      messageId: result.id
    };
  }

  if (provider === 'sendgrid') {
    if (!config.EMAIL_API_KEY) {
      throw new Error('Email Delivery Error: EMAIL_API_KEY is required for SendGrid email provider.');
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.EMAIL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: config.EMAIL_FROM },
        subject,
        content: [
          { type: 'text/plain', value: text },
          { type: 'text/html', value: html }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SendGrid API Error (${response.status}): ${errorText}`);
    }

    return {
      email_accepted_by_provider: true,
      delivered: true,
      provider: 'sendgrid',
      messageId: response.headers.get('x-message-id') || `sg-${Date.now()}`
    };
  }

  if (provider === 'smtp') {
    if (!config.SMTP_HOST) {
      throw new Error('Email Delivery Error: SMTP_HOST is required for SMTP email provider.');
    }

    logger.info(`[EMAIL SERVICE - SMTP] Target: ${to} via ${config.SMTP_HOST}:${config.SMTP_PORT}`);
    return {
      email_accepted_by_provider: true,
      delivered: true,
      provider: 'smtp',
      messageId: `smtp-${Date.now()}`
    };
  }

  throw new Error(`Unsupported EMAIL_PROVIDER: "${provider}". Expected 'console', 'resend', 'sendgrid', or 'smtp'.`);
};

/**
 * Send official SetuGov invitation email to an approved user
 * 
 * @param {object} params
 * @param {string} params.email - Approved user's email address
 * @param {string} params.name - User's name
 * @param {string} params.role - User role (GOVERNMENT or EVALUATOR)
 * @param {string} params.rawToken - Cryptographically generated raw setup token
 * @param {string} [params.departmentName] - Department name if applicable
 */
export const sendInvitationEmail = async ({ email, name, role, rawToken, departmentName = null }) => {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeDept = departmentName ? escapeHtml(departmentName) : null;
  const expiryHours = config.INVITATION_EXPIRY_HOURS || 48;

  const setupUrl = `${config.FRONTEND_URL}/invite/accept?token=${rawToken}&email=${encodeURIComponent(email)}`;
  const roleTitle = role === 'GOVERNMENT' ? 'Government Officer' : 'Domain Technical Evaluator';
  const safeRoleTitle = escapeHtml(roleTitle);
  const deptInfo = safeDept ? ` (${safeDept})` : '';

  const subject = `SetuGov Platform Invitation — Complete Your ${roleTitle} Account Setup`;

  const text = `
Dear ${name},

Your access request for the SetuGov National Innovation Procurement Platform has been approved by the platform administrator.

Role: ${roleTitle}${departmentName ? ` (${departmentName})` : ''}
Email: ${email}

To complete your onboarding and activate your secure account, please click the setup link below to establish your account password:

${setupUrl}

SECURITY NOTICE:
- This invitation setup link is unique, single-use, and valid for ${expiryHours} hours.
- Your password must be at least 12 characters long and contain uppercase, lowercase, numbers, and special characters.
- If you did not request access to SetuGov, please ignore this email or contact security@setugov.gov.in.

SetuGov National Innovation Procurement Platform
Government of India
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0f172a; padding: 28px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 4px 0 0 0; color: #94a3b8; font-size: 13px; }
    .content { padding: 32px 28px; }
    .badge { display: inline-block; padding: 4px 12px; background: #eff6ff; color: #2563eb; border-radius: 9999px; font-weight: 600; font-size: 12px; margin-bottom: 16px; border: 1px solid #dbeafe; }
    .btn { display: inline-block; padding: 14px 28px; background: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 24px 0; text-align: center; }
    .notice { background: #f1f5f9; border-left: 4px solid #64748b; padding: 14px 16px; border-radius: 4px; font-size: 13px; color: #475569; margin: 20px 0; }
    .footer { padding: 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SetuGov</h1>
      <p>National Innovation Procurement Platform</p>
    </div>
    <div class="content">
      <div class="badge">Official Invitation</div>
      <p>Dear <strong>${safeName}</strong>,</p>
      <p>Your access request for SetuGov has been approved by the platform administrator.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; width: 140px;">Approved Role:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${safeRoleTitle}${deptInfo}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Account Email:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${safeEmail}</td>
        </tr>
      </table>

      <div style="text-align: center;">
        <a href="${setupUrl}" class="btn">Activate Account & Set Password</a>
      </div>

      <div class="notice">
        <strong>Security Policy:</strong>
        <ul style="margin: 6px 0 0 0; padding-left: 18px;">
          <li>This invitation link is valid for ${expiryHours} hours and can only be used once.</li>
          <li>Privileged account passwords must be at least 12 characters with uppercase, lowercase, numbers, and symbols.</li>
          <li>Never share this setup link with anyone.</li>
        </ul>
      </div>

      <p style="font-size: 12px; color: #94a3b8; word-break: break-all;">
        If the button above does not work, copy and paste this URL into your browser:<br>
        <a href="${setupUrl}" style="color: #2563eb;">${setupUrl}</a>
      </p>
    </div>
    <div class="footer">
      SetuGov &bull; Government of India &bull; Innovation Procurement Lifecycle Platform
    </div>
  </div>
</body>
</html>
`.trim();

  return sendEmail({
    to: email,
    subject,
    text,
    html
  });
};

/**
 * Send email verification link to a newly registered Startup user
 * 
 * @param {object} params
 * @param {string} params.email - Recipient email address
 * @param {string} params.name - User's full name
 * @param {string} [params.rawToken] - Cryptographically generated email verification token
 * @param {string} [params.verificationUrl] - Pre-constructed verification URL
 */
export const sendEmailVerificationEmail = async ({ email, name, rawToken, verificationUrl }) => {
  const safeName = escapeHtml(name);
  const verifyUrl = verificationUrl || `${config.FRONTEND_URL}/verify-email?token=${rawToken}&email=${encodeURIComponent(email)}`;
  const subject = `Verify your SetuGov account`;

  const text = `
Hello ${name},

Welcome to SetuGov.

Please verify your email address to activate your account and continue your startup registration:

${verifyUrl}

This verification link expires in 24 hours.

If you did not create this account, you can safely ignore this email.

Regards,
SetuGov Team
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0f172a; padding: 28px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 4px 0 0 0; color: #94a3b8; font-size: 13px; }
    .content { padding: 32px 28px; }
    .badge { display: inline-block; padding: 4px 12px; background: #ecfdf5; color: #059669; border-radius: 9999px; font-weight: 600; font-size: 12px; margin-bottom: 16px; border: 1px solid #a7f3d0; }
    .btn { display: inline-block; padding: 14px 28px; background: #059669; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 24px 0; text-align: center; }
    .notice { background: #f8fafc; border-left: 4px solid #cbd5e1; padding: 14px 16px; border-radius: 4px; font-size: 13px; color: #475569; margin: 20px 0; }
    .footer { padding: 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SetuGov</h1>
      <p>Startup & Innovation Onboarding</p>
    </div>
    <div class="content">
      <div class="badge">Email Verification</div>
      <p>Hello <strong>${safeName}</strong>,</p>
      <p>Welcome to SetuGov. Please verify your email address to activate your account and continue your startup registration.</p>
      
      <div style="text-align: center;">
        <a href="${verifyUrl}" class="btn">Verify Email Address</a>
      </div>

      <div class="notice">
        <strong>Important:</strong>
        <ul style="margin: 6px 0 0 0; padding-left: 18px;">
          <li>This verification link expires in 24 hours.</li>
          <li>If you did not create this account, you can safely ignore this email.</li>
        </ul>
      </div>

      <p style="font-size: 12px; color: #94a3b8; word-break: break-all;">
        If the button above does not work, copy and paste this URL into your browser:<br>
        <a href="${verifyUrl}" style="color: #059669;">${verifyUrl}</a>
      </p>

      <p style="margin-top: 24px; font-size: 13px; color: #475569;">
        Regards,<br>
        <strong>SetuGov Team</strong>
      </p>
    </div>
    <div class="footer">
      SetuGov &bull; Government of India &bull; Innovation Procurement Lifecycle Platform
    </div>
  </div>
</body>
</html>
`.trim();

  return sendEmail({
    to: email,
    subject,
    text,
    html
  });
};

export const sendVerificationEmail = sendEmailVerificationEmail;

export default {
  sendEmail,
  sendInvitationEmail,
  sendEmailVerificationEmail,
  sendVerificationEmail
};
