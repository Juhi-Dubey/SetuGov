import nodemailer from 'nodemailer';
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
 * Masks email address for safe logging without exposing PII
 */
export const maskEmail = (email) => {
  if (!email || typeof email !== 'string' || !email.includes('@')) return email || '';
  const [local, domain] = email.split('@');
  const maskedLocal = local.length <= 2 ? local[0] + '*' : local[0] + '*'.repeat(Math.max(1, local.length - 2)) + local[local.length - 1];
  return `${maskedLocal}@${domain}`;
};

/**
 * Dispatch an email via the configured provider
 * 
 * @param {object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 * @returns {Promise<{ email_accepted_by_provider: boolean, delivered: boolean, provider: string, messageId?: string }>}
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  const provider = (config.EMAIL_PROVIDER || 'console').toLowerCase().trim();
  const recipient = String(to || '').trim();

  if (!recipient) {
    throw new Error('Email recipient (to) is required.');
  }

  if (config.NODE_ENV === 'production' && provider === 'console') {
    throw new Error(
      'Security Configuration Error: EMAIL_PROVIDER cannot be set to "console" in production. A production email provider (resend, sendgrid, smtp) and credentials are required.'
    );
  }

  if (provider === 'console') {
    // Safe logging in development without leaking secrets or tokens
    logger.info(`[EMAIL SERVICE - DEV CONSOLE] Target: ${maskEmail(recipient)} | Subject: "${subject}" | Status: Accepted (Dev Mode)`);
    return {
      email_accepted_by_provider: true,
      delivered: true,
      provider: 'console',
      messageId: `dev-console-${Date.now()}`
    };
  }

  if (provider === 'resend') {
    if (!config.EMAIL_API_KEY) {
      throw new Error(
        'Email Delivery Error: EMAIL_API_KEY is required for Resend email provider.'
      );
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.EMAIL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: config.EMAIL_FROM,
        to: [recipient],
        subject,
        text,
        html
      })
    });

    // Read the response body exactly ONCE.
    const responseText = await response.text();

    if (!response.ok) {
      let errorMessage = responseText;

      try {
        const parsed = JSON.parse(responseText);

        errorMessage =
          parsed?.message ||
          parsed?.error?.message ||
          responseText;
      } catch {
        // Response was not JSON. Keep the raw text.
      }

      const safeErrorText = config.EMAIL_API_KEY
        ? errorMessage.replace(
            new RegExp(
              config.EMAIL_API_KEY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
              'g'
            ),
            '[REDACTED]'
          )
        : errorMessage;

      logger.error(
        `[RESEND] Email delivery failed for ${recipient}: ${safeErrorText}`
      );

      throw new Error(
        `Resend API Error (${response.status}): ${safeErrorText}`
      );
    }

    let result;

    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error(
        'Resend returned an invalid success response.'
      );
    }

    logger.info(
      `[RESEND] Email accepted by Resend. Message ID: ${result?.id || 'unknown'}`
    );

    return {
      email_accepted_by_provider: true,
      delivered: false,
      provider: 'resend',
      messageId: result?.id
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
      const safeErrorText = config.EMAIL_API_KEY
        ? errorText.replace(new RegExp(config.EMAIL_API_KEY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '[REDACTED]')
        : errorText;
      throw new Error(`SendGrid API Error (${response.status}): ${safeErrorText}`);
    }

    return {
      email_accepted_by_provider: true,
      delivered: true,
      provider: 'sendgrid',
      messageId: response.headers.get('x-message-id') || `sg-${Date.now()}`
    };
  }

  if (provider === 'smtp') {
    if (!config.EMAIL_SMTP_USER || !config.EMAIL_SMTP_PASSWORD) {
      throw new Error('Email Delivery Error: EMAIL_SMTP_USER and EMAIL_SMTP_PASSWORD are required for SMTP email provider.');
    }

    const cleanPassword = typeof config.EMAIL_SMTP_PASSWORD === 'string'
      ? config.EMAIL_SMTP_PASSWORD.replace(/\s+/g, '')
      : config.EMAIL_SMTP_PASSWORD;

    const transporter = nodemailer.createTransport({
      host: config.EMAIL_SMTP_HOST,
      port: Number(config.EMAIL_SMTP_PORT),
      secure: config.EMAIL_SMTP_SECURE === true,
      auth: {
        user: config.EMAIL_SMTP_USER,
        pass: cleanPassword
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });

    try {
      const info = await transporter.sendMail({
        from: config.EMAIL_FROM,
        to: recipient,
        subject,
        text,
        html
      });

      logger.info(
        `[SMTP] Email accepted by Gmail SMTP\nrecipient: ${maskEmail(recipient)}\nmessageId: ${info.messageId}`
      );

      return {
        email_accepted_by_provider: true,
        delivered: false,
        provider: 'smtp',
        messageId: info.messageId
      };
    } catch (error) {
      // Redact SMTP credentials from any error message
      let safeErrorMessage = error.message || 'Unknown SMTP error';
      if (config.EMAIL_SMTP_PASSWORD) {
        const rawPass = config.EMAIL_SMTP_PASSWORD.trim();
        const compactPass = rawPass.replace(/\s+/g, '');
        if (rawPass) safeErrorMessage = safeErrorMessage.split(rawPass).join('[REDACTED]');
        if (compactPass) safeErrorMessage = safeErrorMessage.split(compactPass).join('[REDACTED]');
      }

      logger.error(
        `[SMTP] Email delivery failed for ${maskEmail(recipient)}: ${safeErrorMessage}${error.code ? ` (code: ${error.code})` : ''}`
      );

      throw error;
    }
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

  const maskedRecipient = maskEmail(email);
  logger.info(`[EMAIL] Attempting verification email\nrecipient: ${maskedRecipient}\nprovider: ${config.EMAIL_PROVIDER}\nfrom: ${config.EMAIL_FROM}`);

  return sendEmail({
    to: email,
    subject,
    text,
    html
  });
};

export const sendVerificationEmail = sendEmailVerificationEmail;

/**
 * ----------------------------------------------------
 * TRANSACTIONAL WORKFLOW EMAIL TEMPLATES
 * ----------------------------------------------------
 */

const renderWorkflowEmailTemplate = ({ headerTitle, badgeText, badgeBg, badgeColor, greetingName, leadText, tableRows, actionText, actionUrl, noticeTitle, noticePoints }) => {
  const safeGreeting = escapeHtml(greetingName);
  const safeLead = escapeHtml(leadText);
  const safeBadge = escapeHtml(badgeText);
  const safeHeader = escapeHtml(headerTitle);

  const rowsHtml = tableRows.map(r => `
    <tr>
      <td style="padding: 9px 0; color: #64748b; width: 140px; vertical-align: top;">${escapeHtml(r.label)}:</td>
      <td style="padding: 9px 0; font-weight: 600; color: #0f172a; vertical-align: top;">${escapeHtml(r.value)}</td>
    </tr>
  `).join('');

  const pointsHtml = (noticePoints || []).map(p => `<li>${escapeHtml(p)}</li>`).join('');

  return `
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
    .badge { display: inline-block; padding: 4px 12px; background: ${badgeBg}; color: ${badgeColor}; border-radius: 9999px; font-weight: 600; font-size: 12px; margin-bottom: 16px; }
    .btn { display: inline-block; padding: 13px 26px; background: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 22px 0; text-align: center; }
    .notice { background: #f8fafc; border-left: 4px solid #64748b; padding: 14px 16px; border-radius: 4px; font-size: 13px; color: #475569; margin: 20px 0; }
    .footer { padding: 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SetuGov</h1>
      <p>National Innovation Procurement Platform &bull; Government of India</p>
    </div>
    <div class="content">
      <div class="badge">${safeBadge}</div>
      <p>Dear <strong>${safeGreeting}</strong>,</p>
      <p>${safeLead}</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
        ${rowsHtml}
      </table>

      <div style="text-align: center;">
        <a href="${actionUrl}" class="btn">${escapeHtml(actionText)}</a>
      </div>

      ${noticeTitle ? `
      <div class="notice">
        <strong>${escapeHtml(noticeTitle)}:</strong>
        <ul style="margin: 6px 0 0 0; padding-left: 18px;">
          ${pointsHtml}
        </ul>
      </div>
      ` : ''}

      <p style="font-size: 12px; color: #94a3b8; word-break: break-all;">
        Or access directly via: <a href="${actionUrl}" style="color: #2563eb;">${actionUrl}</a>
      </p>
    </div>
    <div class="footer">
      SetuGov &bull; Secure Digital Governance Infrastructure &bull; Ministry of Electronics & IT
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Event A: Startup Shortlisted Email
 */
export const sendStartupShortlistedEmail = async ({ email, startupName, challengeTitle, applicationId }) => {
  const subject = `SetuGov Platform — Proposal Shortlisted for "${challengeTitle}"`;
  const actionUrl = `${config.FRONTEND_URL}/startup/applications`;
  const text = `
Dear ${startupName},

Congratulations. Your proposal for "${challengeTitle}" has met the compliance criteria and has been officially SHORTLISTED for technical review.

Challenge: ${challengeTitle}
Status: SHORTLISTED
Application Reference: ${applicationId}

Next Steps:
- Technical domain evaluators will evaluate your solution architecture and feasibility.
- You can track evaluator progress from your SetuGov dashboard: ${actionUrl}

SetuGov National Innovation Procurement Platform
Government of India
  `.trim();

  const html = renderWorkflowEmailTemplate({
    headerTitle: 'Proposal Shortlisted',
    badgeText: 'Application Status: Shortlisted',
    badgeBg: '#eff6ff',
    badgeColor: '#2563eb',
    greetingName: startupName,
    leadText: `Your innovative proposal has successfully passed preliminary eligibility screening and has been SHORTLISTED for government challenge evaluation.`,
    tableRows: [
      { label: 'Challenge', value: challengeTitle },
      { label: 'Current Status', value: 'SHORTLISTED' },
      { label: 'Application ID', value: applicationId }
    ],
    actionText: 'View Application Status',
    actionUrl,
    noticeTitle: 'Next Evaluation Phase',
    noticePoints: [
      'Independent domain evaluators are assigned to review technical architecture.',
      'Maintain your contact details updated on SetuGov for any clarification requests.',
      'Status updates will be published live on your startup portal.'
    ]
  });

  return sendEmail({ to: email, subject, text, html });
};

/**
 * Event B: Startup Finalized Email
 */
export const sendStartupFinalizedEmail = async ({ email, startupName, challengeTitle, applicationId }) => {
  const subject = `SetuGov Platform — Solution Selected & Finalized for "${challengeTitle}"`;
  const actionUrl = `${config.FRONTEND_URL}/startup/applications`;
  const text = `
Dear ${startupName},

Congratulations. Following evaluation and administrative review, your solution has been officially SELECTED and finalized for "${challengeTitle}".

Challenge: ${challengeTitle}
Status: SELECTED / FINALIZED
Application Reference: ${applicationId}

Next Steps:
- The department nodal officers will initiate pilot coordination and deployment agreement.
- Access your dashboard to view the selection dossier: ${actionUrl}

SetuGov National Innovation Procurement Platform
Government of India
  `.trim();

  const html = renderWorkflowEmailTemplate({
    headerTitle: 'Solution Selected',
    badgeText: 'Final Decision: SELECTED',
    badgeBg: '#ecfdf5',
    badgeColor: '#059669',
    greetingName: startupName,
    leadText: `We are pleased to inform you that your startup has been officially SELECTED as the winning innovation provider for "${challengeTitle}".`,
    tableRows: [
      { label: 'Challenge', value: challengeTitle },
      { label: 'Decision', value: 'SELECTED (Solution Finalized)' },
      { label: 'Application ID', value: applicationId }
    ],
    actionText: 'Review Selection Dossier',
    actionUrl,
    noticeTitle: 'Procurement & Pilot Onboarding',
    noticePoints: [
      'Nodal department officers will initiate sandbox pilot formalization.',
      'Ensure your statutory compliance and banking proofs on SetuGov remain verified.',
      'You will be notified as soon as pilot milestones are scheduled.'
    ]
  });

  return sendEmail({ to: email, subject, text, html });
};

/**
 * Event C: Evaluator Assigned Email
 */
export const sendEvaluatorAssignedEmail = async ({ email, evaluatorName, challengeTitle, startupName, assignmentId, deadline = null }) => {
  const subject = `SetuGov Platform — New Technical Evaluation Assignment ("${challengeTitle}")`;
  const actionUrl = `${config.FRONTEND_URL}/evaluator/assignments`;
  const deadlineText = deadline ? new Date(deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'As per challenge schedule';

  const text = `
Dear ${evaluatorName},

You have been assigned as a technical evaluator for an application submitted under "${challengeTitle}".

Challenge: ${challengeTitle}
Applicant: ${startupName}
Assignment Reference: ${assignmentId}
Target Deadline: ${deadlineText}

To access the technical proposal, review evaluation criteria, and record your scoring:
${actionUrl}

CONFIDENTIALITY NOTICE:
- All proposal documents are confidential and restricted under government procurement rules.
- Complete your conflict of interest declaration prior to submitting scores.

SetuGov National Innovation Procurement Platform
Government of India
  `.trim();

  const html = renderWorkflowEmailTemplate({
    headerTitle: 'Evaluation Assignment',
    badgeText: 'Assignment: PENDING REVIEW',
    badgeBg: '#f5f3ff',
    badgeColor: '#7c3aed',
    greetingName: evaluatorName,
    leadText: `You have been officially assigned as a domain evaluator for a startup application under the public procurement challenge "${challengeTitle}".`,
    tableRows: [
      { label: 'Challenge', value: challengeTitle },
      { label: 'Applicant Legal Name', value: startupName },
      { label: 'Assignment ID', value: assignmentId },
      { label: 'Target Deadline', value: deadlineText }
    ],
    actionText: 'Open Evaluator Workspace',
    actionUrl,
    noticeTitle: 'Evaluation Standards & Ethics',
    noticePoints: [
      'Disclose any institutional or financial conflict of interest prior to scoring.',
      'Assess solutions strictly against the published multi-parameter criteria.',
      'Confidentiality is strictly mandated under public procurement guidelines.'
    ]
  });

  return sendEmail({ to: email, subject, text, html });
};

/**
 * Event D: Pilot Selected Email
 */
export const sendPilotSelectedEmail = async ({ email, startupName, challengeTitle, pilotId }) => {
  const subject = `SetuGov Platform — Pilot Sandbox Project Formalized ("${challengeTitle}")`;
  const actionUrl = `${config.FRONTEND_URL}/startup/pilots`;
  const text = `
Dear ${startupName},

Your field pilot project for "${challengeTitle}" has been officially formalized in PLANNED status.

Challenge: ${challengeTitle}
Pilot Reference: ${pilotId}
Status: PLANNED

Next Steps:
- Review required compliance clearances and milestones in your pilot sandbox dashboard: ${actionUrl}
- Prepare field equipment and deployment protocols for nodal officer sign-off.

SetuGov National Innovation Procurement Platform
Government of India
  `.trim();

  const html = renderWorkflowEmailTemplate({
    headerTitle: 'Pilot Formalized',
    badgeText: 'Pilot State: PLANNED',
    badgeBg: '#eff6ff',
    badgeColor: '#2563eb',
    greetingName: startupName,
    leadText: `Your field pilot deployment sandbox for "${challengeTitle}" has been officially recorded and is now in PLANNED status.`,
    tableRows: [
      { label: 'Challenge', value: challengeTitle },
      { label: 'Pilot ID', value: pilotId },
      { label: 'Initial State', value: 'PLANNED (Sandbox Configured)' }
    ],
    actionText: 'View Pilot Dashboard',
    actionUrl,
    noticeTitle: 'Pilot Launch Readiness',
    noticePoints: [
      'Complete all statutory and cybersecurity compliance checklist items.',
      'Review milestone escrow disbursement schedules with the nodal department.',
      'Pilot will transition to RUNNING once site readiness is verified.'
    ]
  });

  return sendEmail({ to: email, subject, text, html });
};

/**
 * Event E: Pilot Started Email
 */
export const sendPilotStartedEmail = async ({ email, startupName, challengeTitle, pilotId, startDate = null }) => {
  const subject = `SetuGov Platform — Field Pilot Project is Officially RUNNING ("${challengeTitle}")`;
  const actionUrl = `${config.FRONTEND_URL}/startup/pilots`;
  const dateFormatted = startDate ? new Date(startDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');

  const text = `
Dear ${startupName},

Your field pilot project for "${challengeTitle}" is now officially active and RUNNING as of ${dateFormatted}.

Challenge: ${challengeTitle}
Pilot Reference: ${pilotId}
Status: RUNNING

Operational Requirements:
- Stream automated or field telemetry measurements for configured KPIs.
- Submit milestone evidence documents as delivery phases are reached: ${actionUrl}

SetuGov National Innovation Procurement Platform
Government of India
  `.trim();

  const html = renderWorkflowEmailTemplate({
    headerTitle: 'Pilot Active',
    badgeText: 'Status: RUNNING',
    badgeBg: '#ecfdf5',
    badgeColor: '#059669',
    greetingName: startupName,
    leadText: `Your field sandbox deployment for "${challengeTitle}" has officially commenced and status is now RUNNING.`,
    tableRows: [
      { label: 'Challenge', value: challengeTitle },
      { label: 'Pilot ID', value: pilotId },
      { label: 'Commencement Date', value: dateFormatted },
      { label: 'Lifecycle Status', value: 'RUNNING' }
    ],
    actionText: 'Open Live Sandbox Telemetry',
    actionUrl,
    noticeTitle: 'Telemetry & Evidence Tracking',
    noticePoints: [
      'Telemetry data is monitored against target benchmarks in real time.',
      'Submit milestone completion evidence as deliverables are realized.',
      'Milestone-linked escrow payments unlock upon departmental verification.'
    ]
  });

  return sendEmail({ to: email, subject, text, html });
};

/**
 * Event F: Pilot Completed Email
 */
export const sendPilotCompletedEmail = async ({ email, startupName, challengeTitle, pilotId }) => {
  const subject = `SetuGov Platform — Field Pilot Execution COMPLETED ("${challengeTitle}")`;
  const actionUrl = `${config.FRONTEND_URL}/startup/pilots`;

  const text = `
Dear ${startupName},

Field operations for your pilot project under "${challengeTitle}" have officially concluded. Status has transitioned to COMPLETED.

Challenge: ${challengeTitle}
Pilot Reference: ${pilotId}
Status: COMPLETED

Next Stage:
- The project moves to empirical validation and performance review.
- Access your dashboard to view validation progress: ${actionUrl}

SetuGov National Innovation Procurement Platform
Government of India
  `.trim();

  const html = renderWorkflowEmailTemplate({
    headerTitle: 'Pilot Completed',
    badgeText: 'Status: COMPLETED',
    badgeBg: '#eff6ff',
    badgeColor: '#1d4ed8',
    greetingName: startupName,
    leadText: `Field operations for your pilot project under "${challengeTitle}" have concluded successfully.`,
    tableRows: [
      { label: 'Challenge', value: challengeTitle },
      { label: 'Pilot ID', value: pilotId },
      { label: 'Execution Status', value: 'COMPLETED' }
    ],
    actionText: 'View Pilot Summary',
    actionUrl,
    noticeTitle: 'Validation & Outcome Review',
    noticePoints: [
      'Nodal evaluators are reviewing telemetry logs and field evidence.',
      'Formal empirical validation report will be generated shortly.',
      'Validation outcomes directly inform scaling and procurement decisions.'
    ]
  });

  return sendEmail({ to: email, subject, text, html });
};

/**
 * Event G: Pilot Outcome Email
 */
export const sendPilotOutcomeEmail = async ({ email, startupName, challengeTitle, pilotId, outcome, score = null, comments = null }) => {
  const safeOutcome = outcome ? outcome.replace(/_/g, ' ') : 'VALIDATED';
  const subject = `SetuGov Platform — Pilot Empirical Validation Outcome: ${safeOutcome} ("${challengeTitle}")`;
  const actionUrl = `${config.FRONTEND_URL}/startup/pilots`;
  const scoreText = score !== null && score !== undefined ? `${score}/100` : 'Evaluated';

  const text = `
Dear ${startupName},

The empirical validation outcome for your pilot project under "${challengeTitle}" has been officially recorded.

Challenge: ${challengeTitle}
Pilot ID: ${pilotId}
Validation Outcome: ${safeOutcome}
Performance Score: ${scoreText}
${comments ? `Summary Remarks: ${comments}` : ''}

To view the complete validation report and departmental remarks:
${actionUrl}

SetuGov National Innovation Procurement Platform
Government of India
  `.trim();

  const isPositive = outcome === 'VALIDATED';
  const isConditional = outcome === 'VALIDATED_WITH_CONDITIONS';

  const html = renderWorkflowEmailTemplate({
    headerTitle: 'Validation Outcome',
    badgeText: `Outcome: ${safeOutcome}`,
    badgeBg: isPositive ? '#ecfdf5' : isConditional ? '#fffbeb' : '#fef2f2',
    badgeColor: isPositive ? '#059669' : isConditional ? '#d97706' : '#dc2626',
    greetingName: startupName,
    leadText: `The departmental validation report for your pilot project under "${challengeTitle}" has been officially recorded.`,
    tableRows: [
      { label: 'Challenge', value: challengeTitle },
      { label: 'Pilot Reference', value: pilotId },
      { label: 'Validation Outcome', value: safeOutcome },
      { label: 'Validation Score', value: scoreText },
      ...(comments ? [{ label: 'Official Remarks', value: comments }] : [])
    ],
    actionText: 'View Validation Report',
    actionUrl,
    noticeTitle: 'Next Phase in Procurement Lifecycle',
    noticePoints: [
      'Validation results have been forwarded to the administrative scaling committee.',
      'Review any conditional requirements noted in your dashboard.',
      'A formal scale or GeM handoff decision will be rendered following outcome review.'
    ]
  });

  return sendEmail({ to: email, subject, text, html });
};

/**
 * Event H: Scale Decision Email
 */
export const sendScaleDecisionEmail = async ({ email, startupName, challengeTitle, pilotId, decision, reasoning = null }) => {
  const subject = `SetuGov Platform — Formal Scale Decision Recorded: ${decision} ("${challengeTitle}")`;
  const actionUrl = `${config.FRONTEND_URL}/startup/pilots`;

  let decisionStatement = 'A formal scale decision has been registered for your pilot project.';
  if (decision === 'SCALE') {
    decisionStatement = 'Your solution has been approved for scale.';
  } else if (decision === 'EXTEND') {
    decisionStatement = 'Your pilot has been approved for extension.';
  } else if (decision === 'STOP') {
    decisionStatement = 'The pilot has been concluded without scale approval.';
  }

  const text = `
Dear ${startupName},

${decisionStatement}

Challenge: ${challengeTitle}
Pilot Reference: ${pilotId}
Decision: ${decision}
${reasoning ? `Reasoning: ${reasoning}` : ''}

You can view the complete scale decision record in your dashboard:
${actionUrl}

SetuGov National Innovation Procurement Platform
Government of India
  `.trim();

  const isScale = decision === 'SCALE';
  const isExtend = decision === 'EXTEND';

  const html = renderWorkflowEmailTemplate({
    headerTitle: 'Scale Decision',
    badgeText: `Decision: ${decision}`,
    badgeBg: isScale ? '#ecfdf5' : isExtend ? '#eff6ff' : '#fef2f2',
    badgeColor: isScale ? '#059669' : isExtend ? '#2563eb' : '#dc2626',
    greetingName: startupName,
    leadText: decisionStatement,
    tableRows: [
      { label: 'Challenge', value: challengeTitle },
      { label: 'Pilot Reference', value: pilotId },
      { label: 'Scale Decision', value: decision },
      ...(reasoning ? [{ label: 'Committee Reasoning', value: reasoning }] : [])
    ],
    actionText: 'View Scale Decision',
    actionUrl,
    noticeTitle: isScale ? 'Procurement Readiness & Scaling' : 'Decision Directives',
    noticePoints: isScale ? [
      'Your solution advances to procurement readiness and external GeM handoff.',
      'Departmental officers will coordinate formal purchase order issuance.',
      'Ensure bank and statutory credentials on SetuGov remain up to date.'
    ] : [
      'Review committee notes and feedback in your pilot sandbox dashboard.',
      'Any queries regarding extension or completion may be submitted through support.'
    ]
  });

  return sendEmail({ to: email, subject, text, html });
};

/**
 * Event: Access Request Email (Government Officer / Evaluator Self Application)
 */
export const sendAccessRequestEmail = async ({
  role,
  recipientEmail,
  applicantName,
  applicantEmail,
  details = {}
}) => {
  const safeRole = role === 'GOVERNMENT' ? 'GOVERNMENT' : 'EVALUATOR';
  const roleTitle = safeRole === 'GOVERNMENT' ? 'Government Officer' : 'Domain Technical Evaluator';
  const safeName = escapeHtml(applicantName);
  const safeEmail = escapeHtml(applicantEmail);
  const safeDept = details.departmentName ? escapeHtml(details.departmentName) : null;
  const safeState = details.state ? escapeHtml(details.state) : null;
  const safeOrg = details.organization ? escapeHtml(details.organization) : null;
  const safeDesignation = details.designation ? escapeHtml(details.designation) : null;
  const subject = `SetuGov Platform — ${roleTitle} Access Request Received`;

  const maskedRecipient = maskEmail(recipientEmail);
  logger.info(`[ACCESS REQUEST EMAIL]\nrole: ${safeRole}\nrecipient: ${maskedRecipient}\nsubject: ${subject}`);

  const text = `
Dear ${applicantName},

Your access request for the SetuGov National Innovation Procurement Platform has been successfully submitted and is currently pending administrative verification.

Application Summary:
Role: ${roleTitle}
Applicant: ${applicantName}
Email: ${applicantEmail}
${details.departmentName ? `Department: ${details.departmentName}${details.state ? ` (${details.state})` : ''}\n` : ''}${details.organization ? `Organization: ${details.organization}\n` : ''}${details.designation ? `Designation: ${details.designation}\n` : ''}
Next Steps:
- The SetuGov platform administrators will review your credentials and verify institutional authorization.
- Once approved, an official invitation setup link will be dispatched to your email address to establish your secure credentials.

If you have questions regarding your application, please contact support@setugov.gov.in.

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
    .notice { background: #f8fafc; border-left: 4px solid #64748b; padding: 14px 16px; border-radius: 4px; font-size: 13px; color: #475569; margin: 20px 0; }
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
      <div class="badge">Access Request Pending Review</div>
      <p>Dear <strong>${safeName}</strong>,</p>
      <p>Your access request for official platform credentials has been successfully registered and forwarded to the State Administrator Review Committee.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; width: 140px;">Requested Role:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${escapeHtml(roleTitle)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Applicant Email:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${safeEmail}</td>
        </tr>
        ${safeDept ? `
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Department:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${safeDept}${safeState ? ` (${safeState})` : ''}</td>
        </tr>` : ''}
        ${safeOrg ? `
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Organization:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${safeOrg}</td>
        </tr>` : ''}
        ${safeDesignation ? `
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Designation:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${safeDesignation}</td>
        </tr>` : ''}
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Current Status:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #d97706;">PENDING ADMIN REVIEW</td>
        </tr>
      </table>

      <div class="notice">
        <strong>What happens next?</strong>
        <ul style="margin: 6px 0 0 0; padding-left: 18px;">
          <li>Administrators review statutory credentials and institutional identity.</li>
          <li>Upon approval, a cryptographically signed, single-use activation link will be dispatched to this email address.</li>
          <li>You will then be prompted to set your password and access the platform workspace.</li>
        </ul>
      </div>

      <p style="font-size: 12px; color: #94a3b8;">
        If you did not submit this request, please contact support@setugov.gov.in.
      </p>
    </div>
    <div class="footer">
      SetuGov &bull; Government of India &bull; Innovation Procurement Lifecycle Platform
    </div>
  </div>
</body>
</html>
`.trim();

  try {
    const result = await sendEmail({
      to: recipientEmail,
      subject,
      text,
      html
    });
    logger.info(`[ACCESS REQUEST EMAIL] Dispatched via ${result?.provider || 'provider'}. Message ID: ${result?.messageId || 'unknown'}`);
    return result;
  } catch (error) {
    logger.error(`[ACCESS REQUEST EMAIL] Failed: ${error.message}`);
    throw error;
  }
};

/**
 * Event: Admin Notification of New Access Request (Government Officer / Evaluator)
 * Dispatched to configured Admin recipient when a new access request is submitted.
 */
export const sendAccessRequestSubmittedEmail = async ({
  adminEmail,
  applicantName,
  applicantEmail,
  role,
  departmentName,
  requestId,
  details = {}
}) => {
  const safeRole = role === 'GOVERNMENT' ? 'GOVERNMENT' : 'EVALUATOR';
  const roleTitle = safeRole === 'GOVERNMENT' ? 'Government Officer' : 'Domain Technical Evaluator';
  const safeAdminEmail = escapeHtml(adminEmail);
  const safeApplicantName = escapeHtml(applicantName || 'Applicant');
  const safeApplicantEmail = escapeHtml(applicantEmail || 'Not Provided');
  const safeDept = departmentName ? escapeHtml(departmentName) : (details.organization ? escapeHtml(details.organization) : 'N/A');
  const safeRequestId = requestId ? escapeHtml(String(requestId)) : 'N/A';
  const safeState = details.state ? escapeHtml(details.state) : null;
  const safeDesignation = details.designation ? escapeHtml(details.designation) : null;
  const safeOrg = details.organization ? escapeHtml(details.organization) : null;
  const safeExpertise = details.domainExpertise ? escapeHtml(details.domainExpertise) : null;

  const reviewUrl = `${config.FRONTEND_URL}/admin/access-requests`;
  const subject = `[SetuGov Action Required] New Access Request Received — ${applicantName || 'Applicant'} (${roleTitle})`;

  const maskedAdmin = maskEmail(adminEmail);
  logger.info(`[ADMIN ACCESS REQUEST NOTIFICATION]\nrole: ${safeRole}\nrecipient: ${maskedAdmin}\nrequestId: ${requestId || 'N/A'}`);

  const text = `
New Access Request Received

A new official access request has been submitted on SetuGov and requires administrative verification.

Request Summary:
- Request ID: ${requestId || 'N/A'}
- Requested Role: ${roleTitle} (${safeRole})
- Applicant Name: ${applicantName || 'Applicant'}
- Applicant Email: ${applicantEmail}
- Department: ${departmentName || details.organization || 'N/A'}${details.state ? `\n- State: ${details.state}` : ''}${details.designation ? `\n- Designation: ${details.designation}` : ''}${details.organization ? `\n- Organization: ${details.organization}` : ''}${details.domainExpertise ? `\n- Domain Expertise: ${details.domainExpertise}` : ''}
- Status: PENDING REVIEW

Review this request in the Admin Console:
${reviewUrl}

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
    .badge { display: inline-block; padding: 4px 12px; background: #eff6ff; color: #1d4ed8; border-radius: 9999px; font-weight: 600; font-size: 12px; margin-bottom: 16px; border: 1px solid #bfdbfe; }
    .info-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
    .info-table td { padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
    .info-table td.label { color: #64748b; width: 140px; font-weight: 500; }
    .info-table td.val { color: #0f172a; font-weight: 600; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; text-align: center; margin: 20px 0 10px 0; }
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
      <div class="badge">New Access Request Received</div>
      <p style="font-size: 15px; margin-top: 0; color: #0f172a;">A new access request has been submitted and is awaiting administrative verification.</p>
      
      <table class="info-table">
        <tr>
          <td class="label">Request ID:</td>
          <td class="val" style="font-family: ui-monospace, monospace; font-size: 13px;">${safeRequestId}</td>
        </tr>
        <tr>
          <td class="label">Requested Role:</td>
          <td class="val"><span style="display: inline-block; background: ${safeRole === 'GOVERNMENT' ? '#f0fdf4' : '#faf5ff'}; color: ${safeRole === 'GOVERNMENT' ? '#15803d' : '#7e22ce'}; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 700;">${escapeHtml(roleTitle)} (${safeRole})</span></td>
        </tr>
        <tr>
          <td class="label">Applicant Name:</td>
          <td class="val">${safeApplicantName}</td>
        </tr>
        <tr>
          <td class="label">Applicant Email:</td>
          <td class="val"><a href="mailto:${safeApplicantEmail}" style="color: #2563eb; text-decoration: none;">${safeApplicantEmail}</a></td>
        </tr>
        <tr>
          <td class="label">Department:</td>
          <td class="val">${safeDept}${safeState ? ` (${safeState})` : ''}</td>
        </tr>
        ${safeDesignation ? `
        <tr>
          <td class="label">Designation:</td>
          <td class="val">${safeDesignation}</td>
        </tr>` : ''}
        ${safeOrg && safeOrg !== safeDept ? `
        <tr>
          <td class="label">Organization:</td>
          <td class="val">${safeOrg}</td>
        </tr>` : ''}
        ${safeExpertise ? `
        <tr>
          <td class="label">Domain Expertise:</td>
          <td class="val">${safeExpertise}</td>
        </tr>` : ''}
        <tr>
          <td class="label">Status:</td>
          <td class="val" style="color: #d97706;">PENDING REVIEW</td>
        </tr>
      </table>

      <div style="text-align: center;">
        <a href="${reviewUrl}" class="btn">Review Access Request &rarr;</a>
        <p style="font-size: 12px; color: #94a3b8; margin: 4px 0 0 0;">
          Direct link: <a href="${reviewUrl}" style="color: #2563eb;">${reviewUrl}</a>
        </p>
      </div>
    </div>
    <div class="footer">
      SetuGov &bull; Government of India &bull; Innovation Procurement Lifecycle Platform
    </div>
  </div>
</body>
</html>
`.trim();

  try {
    const result = await sendEmail({
      to: adminEmail,
      subject,
      text,
      html
    });
    logger.info(`[ADMIN ACCESS REQUEST NOTIFICATION] Dispatched via ${result?.provider || 'provider'}. Message ID: ${result?.messageId || 'unknown'}`);
    return result;
  } catch (error) {
    logger.error(`[ADMIN ACCESS REQUEST NOTIFICATION] Failed: ${error.message}`);
    throw error;
  }
};

/**
 * Event: Access Request Marked UNDER_REVIEW (Government Officer / Evaluator)
 */
export const sendAccessRequestUnderReviewEmail = async ({
  recipientEmail,
  applicantName,
  role,
  departmentName = null,
  requestId = null
}) => {
  const safeRole = role === 'GOVERNMENT' ? 'GOVERNMENT' : 'EVALUATOR';
  const roleTitle = safeRole === 'GOVERNMENT' ? 'Government Officer' : 'Domain Technical Evaluator';
  const safeName = escapeHtml(applicantName || 'Applicant');
  const safeEmail = escapeHtml(recipientEmail);
  const safeDept = departmentName ? escapeHtml(departmentName) : null;
  const safeRequestId = requestId ? escapeHtml(requestId) : null;
  const subject = 'SetuGov Platform — Your Access Request Is Under Review';

  const text = `
Dear ${applicantName || 'Applicant'},

Your ${roleTitle} access request has been received and is currently UNDER REVIEW by the platform administration committee.

Application Summary:
${requestId ? `Reference ID: ${requestId}\n` : ''}Role: ${roleTitle}
Applicant: ${applicantName || 'Applicant'}
Email: ${recipientEmail}
${departmentName ? `Department / Organization: ${departmentName}\n` : ''}Current Status: UNDER REVIEW

What happens next:
- The administrator is actively reviewing the submitted information and credentials.
- You will receive another email notification when a final decision is made on your request.
- No further action is required from you at this time.

If you have questions regarding your application, please contact support@setugov.gov.in.

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
    .badge { display: inline-block; padding: 4px 12px; background: #fef3c7; color: #b45309; border-radius: 9999px; font-weight: 600; font-size: 12px; margin-bottom: 16px; border: 1px solid #fde68a; }
    .notice { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 4px; font-size: 13px; color: #475569; margin: 20px 0; }
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
      <div class="badge">Status: Under Active Review</div>
      <p>Dear <strong>${safeName}</strong>,</p>
      <p>Your <strong>${escapeHtml(roleTitle)}</strong> access request has been received and is currently <strong>UNDER REVIEW</strong> by the platform administration committee.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
        ${safeRequestId ? `<tr>
          <td style="padding: 8px 0; color: #64748b; width: 140px;">Reference ID:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-family: monospace;">${safeRequestId}</td>
        </tr>` : ''}
        <tr>
          <td style="padding: 8px 0; color: #64748b; width: 140px;">Requested Role:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${escapeHtml(roleTitle)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Applicant Email:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${safeEmail}</td>
        </tr>
        ${safeDept ? `<tr>
          <td style="padding: 8px 0; color: #64748b;">Department / Org:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${safeDept}</td>
        </tr>` : ''}
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Current Status:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #2563eb;">UNDER REVIEW</td>
        </tr>
      </table>

      <div class="notice">
        <strong>What happens next?</strong>
        <ul style="margin: 6px 0 0 0; padding-left: 18px;">
          <li>The administrator is actively reviewing the submitted information and credentials.</li>
          <li>You will receive another email notification when a final decision is made on your request.</li>
          <li>No further action is required from you at this time.</li>
        </ul>
      </div>

      <p style="font-size: 12px; color: #94a3b8;">
        If you have questions regarding your application, please contact support@setugov.gov.in.
      </p>
    </div>
    <div class="footer">
      SetuGov &bull; Government of India &bull; Innovation Procurement Lifecycle Platform
    </div>
  </div>
</body>
</html>
  `.trim();

  const masked = maskEmail(recipientEmail);

  try {
    const result = await sendEmail({
      to: recipientEmail,
      subject,
      text,
      html
    });

    logger.info(
      `[ACCESS REQUEST UNDER REVIEW EMAIL]\nrole: ${safeRole}\nrecipient: ${masked}\nmessageId: ${result?.messageId || 'unknown'}`
    );

    return result;
  } catch (error) {
    logger.error(`[ACCESS REQUEST UNDER REVIEW EMAIL] Failed: ${error.message}`);
    throw error;
  }
};

/**
 * Event: Access Request Rejected (Government Officer / Evaluator)
 */
export const sendAccessRequestRejectedEmail = async ({
  recipientEmail,
  applicantName,
  role,
  departmentName = null,
  requestId = null,
  rejectionReason = null
}) => {
  const safeRole = role === 'GOVERNMENT' ? 'GOVERNMENT' : 'EVALUATOR';
  const roleTitle = safeRole === 'GOVERNMENT' ? 'Government Officer' : 'Domain Technical Evaluator';
  const safeName = escapeHtml(applicantName || 'Applicant');
  const safeEmail = escapeHtml(recipientEmail);
  const safeDept = departmentName ? escapeHtml(departmentName) : null;
  const safeRequestId = requestId ? escapeHtml(requestId) : null;
  const safeReason = escapeHtml(rejectionReason || 'Requirements criteria not met.');
  const subject = 'SetuGov Platform — Access Request Status Update';

  const text = `
Dear ${applicantName || 'Applicant'},

Thank you for your submission to SetuGov. Following thorough review, we regret to inform you that your ${roleTitle} access request was not approved and has been rejected at this time.

Decision Summary:
${requestId ? `Reference ID: ${requestId}\n` : ''}Requested Role: ${roleTitle}
Applicant: ${applicantName || 'Applicant'}
Email: ${recipientEmail}
${departmentName ? `Department / Organization: ${departmentName}\n` : ''}Current Status: REJECTED
Reason for Rejection: ${rejectionReason || 'Requirements criteria not met.'}

If you have questions or require further clarification regarding this determination, you may reach out to platform support at support@setugov.gov.in.

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
    .badge { display: inline-block; padding: 4px 12px; background: #fef2f2; color: #dc2626; border-radius: 9999px; font-weight: 600; font-size: 12px; margin-bottom: 16px; border: 1px solid #fecaca; }
    .reason-box { background: #fff1f2; border-left: 4px solid #e11d48; padding: 14px 16px; border-radius: 4px; font-size: 13px; color: #881337; margin: 20px 0; }
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
      <div class="badge">Status: Access Request Rejected</div>
      <p>Dear <strong>${safeName}</strong>,</p>
      <p>Thank you for your interest in SetuGov. Following review by the platform administration, your access request for a <strong>${escapeHtml(roleTitle)}</strong> account could not be approved at this time.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
        ${safeRequestId ? `<tr>
          <td style="padding: 8px 0; color: #64748b; width: 140px;">Reference ID:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-family: monospace;">${safeRequestId}</td>
        </tr>` : ''}
        <tr>
          <td style="padding: 8px 0; color: #64748b; width: 140px;">Requested Role:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${escapeHtml(roleTitle)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Applicant Email:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${safeEmail}</td>
        </tr>
        ${safeDept ? `<tr>
          <td style="padding: 8px 0; color: #64748b;">Department / Org:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${safeDept}</td>
        </tr>` : ''}
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Current Status:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #dc2626;">REJECTED</td>
        </tr>
      </table>

      <div class="reason-box">
        <strong>Reason for Rejection:</strong>
        <p style="margin: 6px 0 0 0;">${safeReason}</p>
      </div>

      <p style="font-size: 13px; color: #475569;">
        If you have questions or require further clarification regarding this decision, you may reach out to platform support at <a href="mailto:support@setugov.gov.in" style="color: #2563eb;">support@setugov.gov.in</a>.
      </p>
    </div>
    <div class="footer">
      SetuGov &bull; Government of India &bull; Innovation Procurement Lifecycle Platform
    </div>
  </div>
</body>
</html>
  `.trim();

  const masked = maskEmail(recipientEmail);

  try {
    const result = await sendEmail({
      to: recipientEmail,
      subject,
      text,
      html
    });

    logger.info(
      `[ACCESS REQUEST REJECTED EMAIL]\nrole: ${safeRole}\nrecipient: ${masked}\nmessageId: ${result?.messageId || 'unknown'}`
    );

    return result;
  } catch (error) {
    logger.error(`[ACCESS REQUEST REJECTED EMAIL] Failed: ${error.message}`);
    throw error;
  }
};

/**
 * Dispatch Admin-Issued Login Credentials upon Access Request Approval
 * Sends assigned Login ID (email) and temporary/initial password.
 */
export const sendAdminIssuedCredentialsEmail = async ({
  recipientEmail,
  applicantName,
  loginId,
  temporaryPassword,
  role,
  portalUrl
}) => {
  const roleDisplay = role === 'GOVERNMENT' ? 'Government Officer' : 'Innovation Evaluator';
  const loginUrl = portalUrl || `${config.FRONTEND_URL}/login`;
  const subject = `[SetuGov] Access Approved — Your Login Credentials for ${roleDisplay} Account`;

  const text = `
Dear ${applicantName},

Your access request for SetuGov has been approved by the Administrator.
Your official account has been provisioned as a ${roleDisplay}.

Your Login Credentials:
- Login ID (Email): ${loginId}
- Initial Password: ${temporaryPassword}
- Portal Sign In: ${loginUrl}

Security Notice:
Please sign in to the platform and immediately update your password under account settings.
Do not share these credentials with anyone.

SetuGov — Government of India Innovation Procurement Platform
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #0f172a; padding: 28px; text-align: center; }
    .header h1 { color: #f8fafc; font-size: 20px; margin: 0 0 6px 0; font-weight: 700; letter-spacing: -0.025em; }
    .header p { color: #94a3b8; font-size: 13px; margin: 0; }
    .content { padding: 32px 28px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; background: #ecfdf5; color: #047857; margin-bottom: 16px; }
    .cred-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px 20px; margin: 20px 0; }
    .cred-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
    .cred-row:last-child { border-bottom: none; }
    .cred-label { color: #64748b; font-weight: 500; }
    .cred-val { color: #0f172a; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 700; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; text-align: center; margin: 16px 0; }
    .security-note { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px; font-size: 13px; color: #92400e; margin-top: 20px; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>SetuGov National Innovation Portal</h1>
      <p>Secure Access & Credential Provisioning</p>
    </div>
    <div class="content">
      <span class="badge">&#10003; Access Approved</span>
      <p style="font-size: 15px; margin: 0 0 14px 0;">Dear <strong>${applicantName}</strong>,</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.5; margin: 0 0 16px 0;">
        Your application for access to SetuGov has been approved by the Administrator. Your official account has been initialized as a <strong>${roleDisplay}</strong>.
      </p>

      <div class="cred-box">
        <div class="cred-row">
          <span class="cred-label">Assigned Role:</span>
          <span class="cred-val">${roleDisplay}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Login ID / Email:</span>
          <span class="cred-val">${loginId}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Initial Password:</span>
          <span class="cred-val">${temporaryPassword}</span>
        </div>
      </div>

      <div style="text-align: center;">
        <a href="${loginUrl}" class="btn">Sign In to SetuGov &rarr;</a>
      </div>

      <div class="security-note">
        <strong>Important Security Advice:</strong>
        <p style="margin: 4px 0 0 0;">
          Please sign in and change your password immediately in your account settings. Never disclose these credentials to anyone.
        </p>
      </div>
    </div>
    <div class="footer">
      SetuGov &bull; Government of India &bull; Innovation Procurement Lifecycle Platform
    </div>
  </div>
</body>
</html>
`.trim();

  try {
    const result = await sendEmail({
      to: recipientEmail,
      subject,
      text,
      html
    });
    logger.info(`[ADMIN CREDENTIALS EMAIL] Dispatched to ${maskEmail(recipientEmail)}. Message ID: ${result?.messageId || 'unknown'}`);
    return result;
  } catch (error) {
    logger.error(`[ADMIN CREDENTIALS EMAIL] Failed for ${maskEmail(recipientEmail)}: ${error.message}`);
    throw error;
  }
};

export default {
  sendEmail,
  sendInvitationEmail,
  sendEmailVerificationEmail,
  sendVerificationEmail,
  sendAccessRequestEmail,
  sendAdminIssuedCredentialsEmail,
  sendStartupShortlistedEmail,
  sendStartupFinalizedEmail,
  sendEvaluatorAssignedEmail,
  sendPilotSelectedEmail,
  sendPilotStartedEmail,
  sendPilotCompletedEmail,
  sendPilotOutcomeEmail,
  sendScaleDecisionEmail,
  sendAccessRequestUnderReviewEmail,
  sendAccessRequestRejectedEmail,
  sendAccessRequestSubmittedEmail
};
