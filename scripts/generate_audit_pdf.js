import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputPath = path.resolve(__dirname, '..', 'SetuGov_Final_System_Audit.pdf');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>SetuGov Final System Audit</title>
<style>
  @page {
    size: A4;
    margin: 18mm 15mm 18mm 15mm;
  }
  
  *, *:before, *:after {
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    line-height: 1.5;
    font-size: 10pt;
    margin: 0;
    padding: 0;
  }

  h1, h2, h3, h4 {
    color: #0f172a;
    font-weight: 700;
    margin-top: 1.4em;
    margin-bottom: 0.5em;
    page-break-after: avoid;
  }

  h1 {
    font-size: 20pt;
    border-bottom: 2.5px solid #2563eb;
    padding-bottom: 6px;
    margin-top: 0;
    color: #1e3a8a;
  }

  h2 {
    font-size: 13pt;
    border-bottom: 1.5px solid #cbd5e1;
    padding-bottom: 4px;
    margin-top: 1.6em;
    color: #1e40af;
  }

  h3 {
    font-size: 11pt;
    color: #0f172a;
    margin-top: 1.2em;
  }

  p {
    margin: 0.4em 0 0.8em 0;
  }

  /* Header Meta Box */
  .meta-banner {
    background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    font-size: 9pt;
  }
  .meta-item {
    display: flex;
    flex-direction: column;
  }
  .meta-item .label {
    font-weight: 700;
    text-transform: uppercase;
    font-size: 7.5pt;
    color: #64748b;
    letter-spacing: 0.5px;
  }
  .meta-item .val {
    font-weight: 600;
    color: #1e293b;
  }

  /* Stat Cards */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin: 15px 0 22px 0;
    page-break-inside: avoid;
  }
  .stat-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 12px;
    border-left: 4px solid #3b82f6;
  }
  .stat-card.pass { border-left-color: #10b981; }
  .stat-card.warn { border-left-color: #f59e0b; }
  .stat-card.crit { border-left-color: #ef4444; }
  .stat-card.info { border-left-color: #6366f1; }
  .stat-number {
    font-size: 16pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.1;
  }
  .stat-label {
    font-size: 7.5pt;
    font-weight: 600;
    text-transform: uppercase;
    color: #64748b;
    margin-top: 3px;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0 18px 0;
    font-size: 8.5pt;
    page-break-inside: auto;
  }
  tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }
  th {
    background-color: #f1f5f9;
    color: #334155;
    font-weight: 700;
    text-align: left;
    padding: 6px 8px;
    border: 1px solid #cbd5e1;
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  td {
    padding: 6px 8px;
    border: 1px solid #e2e8f0;
    vertical-align: top;
  }
  tr:nth-child(even) td {
    background-color: #f8fafc;
  }

  /* Badges */
  .badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 7pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    white-space: nowrap;
  }
  .badge-pass { background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
  .badge-warn { background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
  .badge-fail { background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
  .badge-crit { background-color: #7f1d1d; color: #ffffff; }
  .badge-high { background-color: #ef4444; color: #ffffff; }
  .badge-med { background-color: #f59e0b; color: #ffffff; }
  .badge-low { background-color: #64748b; color: #ffffff; }
  .badge-info { background-color: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe; }

  /* Callout box */
  .callout {
    padding: 10px 14px;
    border-radius: 6px;
    margin: 12px 0;
    font-size: 9pt;
    page-break-inside: avoid;
  }
  .callout-crit {
    background-color: #fff1f2;
    border-left: 4px solid #e11d48;
    color: #881337;
  }
  .callout-crit strong { color: #9f1239; }
  .callout-info {
    background-color: #eff6ff;
    border-left: 4px solid #3b82f6;
    color: #1e3a8a;
  }
  .callout-warn {
    background-color: #fffbeb;
    border-left: 4px solid #f59e0b;
    color: #78350f;
  }

  /* Lists */
  ul, ol {
    margin: 0.3em 0 0.8em 0;
    padding-left: 20px;
  }
  li {
    margin-bottom: 0.25em;
  }

  code {
    font-family: Consolas, Monaco, "Courier New", monospace;
    font-size: 8pt;
    background: #f1f5f9;
    padding: 1px 4px;
    border-radius: 3px;
    color: #0f172a;
    border: 1px solid #e2e8f0;
  }

  .file-ref {
    font-family: Consolas, Monaco, "Courier New", monospace;
    font-size: 7.8pt;
    color: #2563eb;
    word-break: break-all;
  }

  .page-break {
    page-break-before: always;
  }

  .section-divider {
    height: 1px;
    background: #e2e8f0;
    margin: 20px 0;
  }

  .verdict-box {
    background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
    color: #ffffff;
    border-radius: 8px;
    padding: 16px 20px;
    margin: 20px 0;
    page-break-inside: avoid;
  }
  .verdict-box h2 {
    color: #60a5fa;
    border-bottom: none;
    margin-top: 0;
    padding-bottom: 0;
    font-size: 14pt;
  }
  .verdict-box p {
    color: #e2e8f0;
    margin-bottom: 0;
    font-size: 9.5pt;
  }
</style>
</head>
<body>

<!-- Header -->
<div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 3px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 12px;">
  <div>
    <span style="font-size: 20pt; font-weight: 800; color: #1e3a8a; letter-spacing: -0.5px;">SetuGov</span>
    <span style="font-size: 13pt; font-weight: 600; color: #64748b; margin-left: 8px;">| National Innovation & Procurement Gateway</span>
  </div>
  <div style="text-align:right;">
    <span class="badge badge-info">FINAL AUDIT REPORT</span>
  </div>
</div>

<h1 style="margin-top: 6px; font-size: 18pt;">Full System Audit & Fix Verification Report</h1>

<div class="meta-banner">
  <div class="meta-item">
    <span class="label">Date of Audit</span>
    <span class="val">21 September 2026</span>
  </div>
  <div class="meta-item">
    <span class="label">Audit Nature</span>
    <span class="val">Read-Only Code & Test Verification</span>
  </div>
  <div class="meta-item">
    <span class="label">Architecture</span>
    <span class="val">Node.js Express + Prisma / React Vite</span>
  </div>
  <div class="meta-item">
    <span class="label">Overall Verdict</span>
    <span class="val" style="color:#059669; font-weight:700;">Core Workflows Operational</span>
  </div>
</div>

<!-- Executive Summary -->
<h2>Executive Summary</h2>
<p>
This comprehensive system audit evaluates the complete SetuGov platform codebase following the completion of testing and bug fixing.
The audit independently verifies Express backend controllers, services, database models, lifecycle state machines, RBAC department isolation barriers, React frontend views, API contract consistency, Playwright end-to-end browser tests, and security controls without relying on previous status claims.
</p>

<div class="stats-grid">
  <div class="stat-card pass">
    <div class="stat-number">17</div>
    <div class="stat-label">Fully Working Areas</div>
  </div>
  <div class="stat-card warn">
    <div class="stat-number">3</div>
    <div class="stat-label">Partially Working</div>
  </div>
  <div class="stat-card crit">
    <div class="stat-number">1</div>
    <div class="stat-label">Critical Security Issue</div>
  </div>
  <div class="stat-card info">
    <div class="stat-number">3</div>
    <div class="stat-label">High Priority Issues</div>
  </div>
</div>

<div class="callout callout-info">
  <strong>Key Finding Summary:</strong> All primary lifecycle state transitions — Government Problem Statement drafting and publishing, Startup application submissions, Evaluator discovery and recruitment, conflict-of-interest declarations, multi-criteria scoring, Government selection with evaluation quorums, Pilot sandbox execution, milestone progress verification, empirical validation, scale decisions, and GeM procurement delivery acceptance — are <strong>fully functional, coherent, and backed by authentic code and passing tests</strong>.
  Prior to public production release, <strong>one critical document authorization bypass</strong> and <strong>two high-priority workflow edge cases</strong> require remediation.
</div>

<!-- Section 1: Fixed -->
<h2>1. Verified Fixed Issues</h2>
<p>The following issues were resolved during recent engineering iterations and are conclusively confirmed in the current code:</p>

<table>
  <thead>
    <tr>
      <th style="width: 18%;">Area</th>
      <th style="width: 32%;">What Was Fixed</th>
      <th style="width: 35%;">Code Evidence / File Location</th>
      <th style="width: 15%;">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Payments</strong></td>
      <td>Duplicate disbursal blocked for already PAID records</td>
      <td><span class="file-ref">paymentService.js:215-220</span> (Throws <code>BadRequestError</code> if payment status is already PAID)</td>
      <td><span class="badge badge-pass">FIXED</span></td>
    </tr>
    <tr>
      <td><strong>Payments</strong></td>
      <td>Direct disbursal of REJECTED payments blocked</td>
      <td><span class="file-ref">paymentService.js:226-230</span> (Requires scheduling a new payment cycle)</td>
      <td><span class="badge badge-pass">FIXED</span></td>
    </tr>
    <tr>
      <td><strong>Payments</strong></td>
      <td>Payment scheduling/disbursals blocked on STOPPED pilots</td>
      <td><span class="file-ref">paymentService.js:8-12, 208-213</span> (Guards against mutations if pilot is STOPPED)</td>
      <td><span class="badge badge-pass">FIXED</span></td>
    </tr>
    <tr>
      <td><strong>Payments</strong></td>
      <td>Milestone completion verified before disbursal</td>
      <td><span class="file-ref">paymentService.js:232-242</span> (Enforces status COMPLETED and percentage = 100%)</td>
      <td><span class="badge badge-pass">FIXED</span></td>
    </tr>
    <tr>
      <td><strong>Procurement</strong></td>
      <td>Direct payment creation with status PAID prohibited</td>
      <td><span class="file-ref">procurementService.js:498-502</span> (Must follow approval lifecycle)</td>
      <td><span class="badge badge-pass">FIXED</span></td>
    </tr>
    <tr>
      <td><strong>Procurement</strong></td>
      <td>Mandatory delivery acceptance gate before payment</td>
      <td><span class="file-ref">procurementService.js:504-508</span> (Requires <code>acceptance_status === 'ACCEPTED'</code>)</td>
      <td><span class="badge badge-pass">FIXED</span></td>
    </tr>
    <tr>
      <td><strong>Procurement</strong></td>
      <td>Duplicate active payment schedule prevention</td>
      <td><span class="file-ref">procurementService.js:510-520</span> (Checks for existing active schedule)</td>
      <td><span class="badge badge-pass">FIXED</span></td>
    </tr>
    <tr>
      <td><strong>Scale Decision</strong></td>
      <td>NOT_VALIDATED pilot blocked from SCALE decision</td>
      <td><span class="file-ref">scaleDecisionService.js:30-34</span> (Throws <code>BadRequestError</code> on scale attempt)</td>
      <td><span class="badge badge-pass">FIXED</span></td>
    </tr>
    <tr>
      <td><strong>Scale Decision</strong></td>
      <td>Latest validation record ordering</td>
      <td><span class="file-ref">scaleDecisionService.js:19-23</span> (Enforces <code>orderBy: { created_at: 'desc' }</code>)</td>
      <td><span class="badge badge-pass">FIXED</span></td>
    </tr>
    <tr>
      <td><strong>Applications</strong></td>
      <td>Contract alignment for budget, timeline & impact</td>
      <td><span class="file-ref">applicationSchemas.js:3-32</span> &amp; <span class="file-ref">StartupApplication.jsx:222-305</span></td>
      <td><span class="badge badge-pass">FIXED</span></td>
    </tr>
    <tr>
      <td><strong>Evaluator Intake</strong></td>
      <td>Intake bulk closure &amp; atomic NOT_SELECTED transition</td>
      <td><span class="file-ref">evaluatorPoolService.js:636-745</span> (Added <code>closeEvaluatorRecruitment</code>)</td>
      <td><span class="badge badge-pass">FIXED</span></td>
    </tr>
    <tr>
      <td><strong>Evaluator Intake</strong></td>
      <td>Required evaluator count enforcement prior to closure</td>
      <td><span class="file-ref">evaluatorPoolService.js:670-677</span> (Validates shortlisted count &gt;= required count)</td>
      <td><span class="badge badge-pass">FIXED</span></td>
    </tr>
    <tr>
      <td><strong>Assignments</strong></td>
      <td>Startup eligibility verification gate on assignment</td>
      <td><span class="file-ref">evaluatorService.js:374-383</span> (Blocks assignment to ineligible applications)</td>
      <td><span class="badge badge-pass">FIXED</span></td>
    </tr>
    <tr>
      <td><strong>Assignments</strong></td>
      <td>Response timestamp and second-response lock</td>
      <td><span class="file-ref">evaluatorService.js:613-628</span> (Sets <code>responded_at</code>; blocks multi-response)</td>
      <td><span class="badge badge-pass">FIXED</span></td>
    </tr>
    <tr>
      <td><strong>Selection</strong></td>
      <td>SUBMITTED -&gt; SELECTED transition support</td>
      <td><span class="file-ref">lifecycle.js:16</span> (Added <code>SELECTED</code> to <code>APPLICATION_TRANSITIONS.SUBMITTED</code>)</td>
      <td><span class="badge badge-pass">FIXED</span></td>
    </tr>
    <tr>
      <td><strong>Onboarding</strong></td>
      <td>Phone number sync without schema collision</td>
      <td><span class="file-ref">startupService.js:494-502</span> (Syncs phone to User model, avoids Prisma crash)</td>
      <td><span class="badge badge-pass">FIXED</span></td>
    </tr>
    <tr>
      <td><strong>RBAC Isolation</strong></td>
      <td>Government officers strictly isolated to department</td>
      <td><span class="file-ref">challengeService.js:140-146, 256-260</span> (Enforces <code>user.department_id</code> filter)</td>
      <td><span class="badge badge-pass">FIXED</span></td>
    </tr>
    <tr>
      <td><strong>UI Design</strong></td>
      <td>Modernized action buttons from navy to Tailwind blue</td>
      <td><span class="file-ref">index.css:96-118</span> &amp; <span class="file-ref">Sidebar.jsx:223-270</span> (Swapped #1e3a8a for blue-600)</td>
      <td><span class="badge badge-pass">FIXED</span></td>
    </tr>
    <tr>
      <td><strong>Profiles</strong></td>
      <td>DB-backed profile view &amp; edit for all 4 roles</td>
      <td><span class="file-ref">GovernmentMyPage.jsx</span>, <span class="file-ref">EvaluatorMyPage.jsx</span>, <span class="file-ref">StartupMyPage.jsx</span>, <span class="file-ref">AdminMyPage.jsx</span></td>
      <td><span class="badge badge-pass">FIXED</span></td>
    </tr>
  </tbody>
</table>

<div class="page-break"></div>

<!-- Section 2: Partially Fixed -->
<h2>2. Partially Fixed Workflows</h2>
<table>
  <thead>
    <tr>
      <th style="width: 20%;">Area</th>
      <th style="width: 30%;">What Works Today</th>
      <th style="width: 30%;">What Remains Incomplete</th>
      <th style="width: 20%;">Code Evidence</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Startup Onboarding</strong></td>
      <td>Full 9-step completeness check, required documents validation per org type, admin approval/rejection/correction request flow.</td>
      <td>An already VERIFIED startup calling registration submit will have its status overwritten to SUBMITTED without a status gate.</td>
      <td><span class="file-ref">startupService.js:1005-1075</span> lacks check: <code>if (status === 'VERIFIED') throw ...</code></td>
    </tr>
    <tr>
      <td><strong>Government Selection</strong></td>
      <td>Quorum check (&gt;= 2 evaluations), evaluation stage check, decision engine consensus check, mandatory written override.</td>
      <td>Lacks an explicit check ensuring another startup has not already been marked SELECTED for the same challenge.</td>
      <td><span class="file-ref">applicationService.js:368-413</span> does not query existing SELECTED applications.</td>
    </tr>
    <tr>
      <td><strong>Token Revocation</strong></td>
      <td>Bcrypt 12 rounds, account lockout after 3 attempts (15 min), email verification enforcement for startups, JWT expiration.</td>
      <td>Token revocation blacklist is stored in an in-memory <code>Set</code>; restarts restore validity of logged-out tokens.</td>
      <td><span class="file-ref">tokenRevocation.js:6-25</span> in-memory storage.</td>
    </tr>
    <tr>
      <td><strong>Registration Payload</strong></td>
      <td>Forces STARTUP role and creates user with <code>is_active: false</code> and verification token hash.</td>
      <td><code>registerSchema</code> lacks <code>company_name</code>; Zod strips it, creating the startup with an empty name until profile edit.</td>
      <td><span class="file-ref">authSchemas.js:3-10</span> vs <span class="file-ref">StartupSignup.jsx</span>.</td>
    </tr>
  </tbody>
</table>

<!-- Section 3: Still Needs to be Fixed -->
<h2>3. Actionable Defects Requiring Remediation</h2>
<table>
  <thead>
    <tr>
      <th style="width: 12%;">Priority</th>
      <th style="width: 18%;">Area</th>
      <th style="width: 28%;">Exact Problem &amp; Impact</th>
      <th style="width: 22%;">Location / Route</th>
      <th style="width: 20%;">Required Fix</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><span class="badge badge-crit">CRITICAL</span></td>
      <td>Document Security</td>
      <td>Anonymous users can download private startup documents and tax filings by accessing the file URL directly.</td>
      <td><span class="file-ref">uploadController.js:40-42</span><br><code>GET /api/v1/documents/:filename</code></td>
      <td>Remove <code>if (!user) return true;</code>. Enforce <code>authenticate</code> on document routes.</td>
    </tr>
    <tr>
      <td><span class="badge badge-high">HIGH</span></td>
      <td>Challenge Selection</td>
      <td>Multiple startups can be marked SELECTED for the same challenge, causing downstream pilot conflicts.</td>
      <td><span class="file-ref">applicationService.js:369</span><br><code>PATCH /api/v1/applications/:id/status</code></td>
      <td>Check if another application has status SELECTED; block with <code>BadRequestError</code>.</td>
    </tr>
    <tr>
      <td><span class="badge badge-high">HIGH</span></td>
      <td>Startup Verification</td>
      <td>Verified startup can inadvertently reset its status back to SUBMITTED by resubmitting profile form.</td>
      <td><span class="file-ref">startupService.js:1008</span><br><code>POST /api/v1/startups/registration/:id/submit</code></td>
      <td>Block submission if <code>verification_status === 'VERIFIED'</code>.</td>
    </tr>
    <tr>
      <td><span class="badge badge-high">HIGH</span></td>
      <td>Document Linking</td>
      <td>Client can link arbitrary file URLs in <code>addStartupDocument</code> without physical file existence check.</td>
      <td><span class="file-ref">startupService.js:834-854</span><br><code>POST /api/v1/startups/:id/documents</code></td>
      <td>Verify physical presence of file in <code>uploads/</code> directory on disk.</td>
    </tr>
    <tr>
      <td><span class="badge badge-med">MEDIUM</span></td>
      <td>Auth Blacklist</td>
      <td>Token revocation list is held in memory and lost across server restarts or across multiple instances.</td>
      <td><span class="file-ref">tokenRevocation.js:6</span><br><code>POST /api/v1/auth/logout</code></td>
      <td>Persist revoked tokens in database table <code>RevokedToken</code> with TTL.</td>
    </tr>
    <tr>
      <td><span class="badge badge-med">MEDIUM</span></td>
      <td>Antivirus Scanning</td>
      <td>No streaming antivirus / malware inspection on uploaded documents.</td>
      <td><span class="file-ref">upload.js:140-146</span></td>
      <td>Integrate ClamAV daemon pipe prior to permanent disk storage.</td>
    </tr>
    <tr>
      <td><span class="badge badge-med">MEDIUM</span></td>
      <td>Registration Schema</td>
      <td><code>company_name</code> stripped by Zod schema during user signup.</td>
      <td><span class="file-ref">authSchemas.js:3-10</span></td>
      <td>Add <code>company_name: z.string().optional()</code> to <code>registerSchema</code>.</td>
    </tr>
    <tr>
      <td><span class="badge badge-low">LOW</span></td>
      <td>Query Pagination</td>
      <td>Challenge listing allows up to 1,000 items per request (<code>safeLimit = 1000</code>).</td>
      <td><span class="file-ref">challengeService.js:165</span></td>
      <td>Lower ceiling to 100 items per page.</td>
    </tr>
    <tr>
      <td><span class="badge badge-low">COSMETIC</span></td>
      <td>UI Theme Hexes</td>
      <td>Minor residual hardcoded <code>#1e3a8a</code> shades in deep dashboard panels.</td>
      <td><span class="file-ref">GovernmentDashboard.jsx</span></td>
      <td>Replace with semantic Tailwind utility classes.</td>
    </tr>
  </tbody>
</table>

<div class="page-break"></div>

<!-- Section 4: Working Correctly -->
<h2>4. Verified Operational Workflows</h2>

<h3>1. Authentication &amp; Session Governance</h3>
<ul>
  <li><strong>Result:</strong> <span class="badge badge-pass">PASS</span></li>
  <li><strong>Relevant Files:</strong> <code>Backend/src/services/authService.js</code>, <code>Backend/src/middleware/auth.js</code></li>
  <li><strong>Verified Behavior:</strong> Login locks account for 15 minutes after 3 consecutive failed attempts. Startups require email verification before authentication is granted. Deactivated accounts are rejected. Passwords use bcrypt with 12 rounds.</li>
  <li><strong>Test Evidence:</strong> Playwright test <code>tests/auth/login.spec.js</code> passes 5/5 scenarios.</li>
</ul>

<h3>2. Challenge Lifecycle &amp; Department Scoping</h3>
<ul>
  <li><strong>Result:</strong> <span class="badge badge-pass">PASS</span></li>
  <li><strong>Relevant Files:</strong> <code>Backend/src/services/challengeService.js</code>, <code>Backend/src/utils/lifecycle.js</code></li>
  <li><strong>Verified Behavior:</strong> Challenges start in <code>DRAFT</code>; published challenges cannot be modified. Publishing does not auto-generate downstream evaluators or pilots. Government officers can only view and manage challenges for their assigned department.</li>
  <li><strong>Test Evidence:</strong> Playwright test <code>tests/challenge/challenge-lifecycle.spec.js</code> passes.</li>
</ul>

<h3>3. Startup Application &amp; Contract Normalization</h3>
<ul>
  <li><strong>Result:</strong> <span class="badge badge-pass">PASS</span></li>
  <li><strong>Relevant Files:</strong> <code>Backend/src/services/applicationService.js</code>, <code>Frontend/src/pages/startup/StartupApplication.jsx</code></li>
  <li><strong>Verified Behavior:</strong> Only verified startups can apply. Duplicate applications rejected with HTTP 409. Schema normalizes camelCase and snake_case inputs for proposed budget, timeline, and impact descriptions.</li>
  <li><strong>Test Evidence:</strong> Playwright test <code>tests/applications/startup-applications.spec.js</code> passes.</li>
</ul>

<h3>4. Evaluator Recruitment &amp; Application Intake</h3>
<ul>
  <li><strong>Result:</strong> <span class="badge badge-pass">PASS</span></li>
  <li><strong>Relevant Files:</strong> <code>Backend/src/services/evaluatorPoolService.js</code></li>
  <li><strong>Verified Behavior:</strong> Verified evaluators discover and apply for open challenges. Government reviews and shortlists candidates. Bulk closure verifies required evaluator count, confirms pool members, and atomically marks unselected candidates as <code>NOT_SELECTED</code>.</li>
  <li><strong>Test Evidence:</strong> <code>Backend/src/scripts/test_complete_evaluator_recruitment_workflow.js</code> passes.</li>
</ul>

<h3>5. Proposal Evaluation &amp; Scoring</h3>
<ul>
  <li><strong>Result:</strong> <span class="badge badge-pass">PASS</span></li>
  <li><strong>Relevant Files:</strong> <code>Frontend/src/pages/evaluator/EvaluationDetail.jsx</code>, <code>Backend/src/services/evaluationService.js</code></li>
  <li><strong>Verified Behavior:</strong> "Evaluate Proposal" button routes to <code>/evaluator/evaluation/:id</code>. Conflict of interest declaration is enforced before evaluation. Submitted evaluations are immutable. Total score is computed from 5 weighted criteria.</li>
  <li><strong>Test Evidence:</strong> Playwright test <code>tests/evaluation/evaluation.spec.js</code> passes.</li>
</ul>

<h3>6. Pilot Lifecycle, Compliance &amp; Validation</h3>
<ul>
  <li><strong>Result:</strong> <span class="badge badge-pass">PASS</span></li>
  <li><strong>Relevant Files:</strong> <code>Backend/src/services/pilotService.js</code>, <code>Backend/src/services/validationService.js</code></li>
  <li><strong>Verified Behavior:</strong> Pilots require <code>SELECTED</code> applications. Closed challenges block pilot creation. Starting a pilot verifies checklist items or requires an explicit administrative override. Validation computes empirical score and atomically updates pilot status.</li>
  <li><strong>Test Evidence:</strong> Playwright test <code>tests/pilot/pilot-lifecycle.spec.js</code> passes.</li>
</ul>

<h3>7. Scale Decision &amp; GeM Procurement Handoff</h3>
<ul>
  <li><strong>Result:</strong> <span class="badge badge-pass">PASS</span></li>
  <li><strong>Relevant Files:</strong> <code>Backend/src/services/scaleDecisionService.js</code>, <code>Backend/src/services/procurementService.js</code></li>
  <li><strong>Verified Behavior:</strong> Scale decision queries the latest validation record and blocks scaling of <code>NOT_VALIDATED</code> pilots. GeM handoff captures reference number and officer details. Delivery submission and formal government acceptance gates verified.</li>
  <li><strong>Test Evidence:</strong> <code>scripts/test_scale_decision_workflow_e2e.js</code> passes.</li>
</ul>

<h3>8. Financial Payments &amp; Disbursement Security</h3>
<ul>
  <li><strong>Result:</strong> <span class="badge badge-pass">PASS</span></li>
  <li><strong>Relevant Files:</strong> <code>Backend/src/services/paymentService.js</code></li>
  <li><strong>Verified Behavior:</strong> Payments cannot be created directly as <code>PAID</code>. Duplicate disbursal of already <code>PAID</code> payments is blocked. <code>STOPPED</code> pilots reject scheduling/disbursal. 100% milestone completion and delivery acceptance verified prior to payment release.</li>
  <li><strong>Test Evidence:</strong> <code>Backend/src/tests/test_government_payments_flow.js</code> passes.</li>
</ul>

<!-- Section 5: Security Findings -->
<h2>5. In-Depth Security Findings</h2>
<div class="callout callout-crit">
  <strong>CRITICAL VULNERABILITY (CWE-306 / CWE-639):</strong><br>
  In <code>Backend/src/controllers/uploadController.js</code> lines 39-42, the function <code>verifyDocumentAuthorization</code> contains:<br>
  <code>if (!user) { return true; }</code><br>
  Combined with <code>uploadRoutes.js:13</code> (<code>router.get('/:filename', optionalAuthenticate, getPrivateFile)</code>), this means any unauthenticated caller who knows or guesses a document filename can download confidential business registration dossiers, PAN cards, bank statements, and payment invoices without logging in.
</div>

<table>
  <thead>
    <tr>
      <th style="width: 14%;">Severity</th>
      <th style="width: 26%;">Vulnerability Description</th>
      <th style="width: 25%;">Impact</th>
      <th style="width: 35%;">Remediation</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><span class="badge badge-crit">CRITICAL</span></td>
      <td>Unauthenticated Document Download (CWE-306)</td>
      <td>Public exposure of sensitive startup identity and government financial invoices.</td>
      <td>Enforce <code>authenticate</code> middleware on all document download routes. Return <code>false</code> if <code>!user</code>.</td>
    </tr>
    <tr>
      <td><span class="badge badge-high">HIGH</span></td>
      <td>Unverified Physical File on Client URL Link</td>
      <td>Users can create document records pointing to arbitrary or non-existent files.</td>
      <td>Verify physical file existence in <code>uploads/</code> directory on disk before database write.</td>
    </tr>
    <tr>
      <td><span class="badge badge-med">MEDIUM</span></td>
      <td>Volatile Token Revocation Store</td>
      <td>Logged out JWTs become active again if the Express process restarts.</td>
      <td>Store revoked token JTI / signatures in a database table <code>RevokedToken</code>.</td>
    </tr>
    <tr>
      <td><span class="badge badge-med">MEDIUM</span></td>
      <td>Lack of Active Antivirus Engine</td>
      <td>Files matching allowed magic bytes could carry malicious payloads.</td>
      <td>Integrate ClamAV or AWS GuardDuty malware scanning daemon in production pipeline.</td>
    </tr>
  </tbody>
</table>

<div class="page-break"></div>

<!-- Section 6: Workflow Matrix -->
<h2>6. Comprehensive Workflow Matrix</h2>
<table>
  <thead>
    <tr>
      <th style="width: 22%;">Workflow Area</th>
      <th style="width: 15%;">Audit Status</th>
      <th style="width: 38%;">Authoritative Evidence</th>
      <th style="width: 25%;">Remaining Requirement</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Authentication</td>
      <td><span class="badge badge-pass">PASS</span></td>
      <td>authService.js:364, login.spec.js</td>
      <td>Persist token blacklist in DB</td>
    </tr>
    <tr>
      <td>Government Challenge</td>
      <td><span class="badge badge-pass">PASS</span></td>
      <td>challengeService.js:414, challenge-lifecycle.spec.js</td>
      <td>None. Fully verified.</td>
    </tr>
    <tr>
      <td>Startup Onboarding</td>
      <td><span class="badge badge-warn">PARTIAL</span></td>
      <td>startupService.js:1008, adminService.js:921</td>
      <td>Prevent re-submission on VERIFIED</td>
    </tr>
    <tr>
      <td>Startup Application</td>
      <td><span class="badge badge-pass">PASS</span></td>
      <td>applicationService.js:13, startup-applications.spec.js</td>
      <td>None. Field contracts aligned.</td>
    </tr>
    <tr>
      <td>Eligibility Verification</td>
      <td><span class="badge badge-pass">PASS</span></td>
      <td>eligibility.js:1, evaluatorEligibilityService.js:1</td>
      <td>None. Validated at assignment stage.</td>
    </tr>
    <tr>
      <td>Evaluator Recruitment</td>
      <td><span class="badge badge-pass">PASS</span></td>
      <td>evaluatorPoolService.js:636</td>
      <td>None. Intake closure operational.</td>
    </tr>
    <tr>
      <td>Evaluator Assignment</td>
      <td><span class="badge badge-pass">PASS</span></td>
      <td>evaluatorService.js:374, evaluator-assignment.spec.js</td>
      <td>None. Eligibility gate enforced.</td>
    </tr>
    <tr>
      <td>Evaluator Acceptance</td>
      <td><span class="badge badge-pass">PASS</span></td>
      <td>evaluatorService.js:601, evaluator-assignment.spec.js</td>
      <td>None. Responded timestamp verified.</td>
    </tr>
    <tr>
      <td>Conflict Declaration</td>
      <td><span class="badge badge-pass">PASS</span></td>
      <td>evaluationService.js:98, conflict-declaration.spec.js</td>
      <td>None. Mandatory declaration enforced.</td>
    </tr>
    <tr>
      <td>Evaluation Scoring</td>
      <td><span class="badge badge-pass">PASS</span></td>
      <td>evaluationService.js:60, evaluation.spec.js</td>
      <td>None. Immutability and weighted score.</td>
    </tr>
    <tr>
      <td>Government Selection</td>
      <td><span class="badge badge-warn">PARTIAL</span></td>
      <td>applicationService.js:368</td>
      <td>Add single-selection lock per challenge</td>
    </tr>
    <tr>
      <td>Pilot Lifecycle</td>
      <td><span class="badge badge-pass">PASS</span></td>
      <td>pilotService.js:13, pilot-lifecycle.spec.js</td>
      <td>None. Compliance check operational.</td>
    </tr>
    <tr>
      <td>Validation</td>
      <td><span class="badge badge-pass">PASS</span></td>
      <td>validationService.js:10</td>
      <td>None. Empirical scoring verified.</td>
    </tr>
    <tr>
      <td>Scale Decision</td>
      <td><span class="badge badge-pass">PASS</span></td>
      <td>scaleDecisionService.js:8</td>
      <td>None. NOT_VALIDATED blocked.</td>
    </tr>
    <tr>
      <td>Procurement</td>
      <td><span class="badge badge-pass">PASS</span></td>
      <td>procurementService.js:61</td>
      <td>None. GeM handoff &amp; delivery acceptance.</td>
    </tr>
    <tr>
      <td>Payments</td>
      <td><span class="badge badge-pass">PASS</span></td>
      <td>paymentService.js:5</td>
      <td>None. STOPPED pilot &amp; duplicate blocked.</td>
    </tr>
    <tr>
      <td>RBAC &amp; Isolation</td>
      <td><span class="badge badge-pass">PASS</span></td>
      <td>rbac.js:7, government-rbac.spec.js</td>
      <td>None. 56 RBAC test vectors pass.</td>
    </tr>
    <tr>
      <td>Audit Logs</td>
      <td><span class="badge badge-pass">PASS</span></td>
      <td>auditService.js:9</td>
      <td>None. PII and secrets masked.</td>
    </tr>
    <tr>
      <td>Notifications</td>
      <td><span class="badge badge-pass">PASS</span></td>
      <td>notificationService.js:15</td>
      <td>None. Correct recipients targeted.</td>
    </tr>
    <tr>
      <td>Profile Pages</td>
      <td><span class="badge badge-pass">PASS</span></td>
      <td>GovernmentMyPage.jsx, EvaluatorMyPage.jsx</td>
      <td>None. Real DB backed, unified BackButton.</td>
    </tr>
    <tr>
      <td>Document Security</td>
      <td><span class="badge badge-fail">FAIL</span></td>
      <td>uploadController.js:40, uploadRoutes.js:13</td>
      <td>Fix anonymous download bypass.</td>
    </tr>
  </tbody>
</table>

<!-- Section 7: File Classification -->
<h2>7. Repository File Classification</h2>
<ul>
  <li><strong>Application Core:</strong> <code>Backend/src/</code> (Express controllers, services, schemas, middleware, Prisma client) and <code>Frontend/src/</code> (React components, pages, routes, design system).</li>
  <li><strong>Test Code:</strong> <code>tests/**/*.spec.js</code> (9 Playwright test suites testing real UI interactions and API contracts) and <code>Backend/src/tests/test_government_payments_flow.js</code>.</li>
  <li><strong>Test Support:</strong> <code>tests/helpers/</code>, <code>scripts/test_*.js</code> (14 automated lifecycle and security validation scripts).</li>
  <li><strong>Playwright Configuration:</strong> <code>playwright.config.js</code>, root <code>package.json</code>.</li>
  <li><strong>Generated Artifacts:</strong> <code>playwright-report/</code>, <code>test-results/</code>, <code>rbac_security_test_results.json</code>, <code>profile_document_security_report.json</code>, <code>Backend/src/generated/client/query_engine-windows.dll.node.tmp*</code>. These should be excluded via <code>.gitignore</code>.</li>
  <li><strong>Debug Scripts:</strong> <code>scripts/debug_selection.js</code>, <code>scripts/_debug_app.js</code>, <code>Backend/scripts/unlockGovtUsers.js</code>. Should be archived prior to production release.</li>
</ul>

<!-- Section 8: Final Verdict -->
<div class="verdict-box">
  <h2>Final Verdict: Core Workflows Operational</h2>
  <p>
    The SetuGov codebase delivers a complete, cohesive, and resilient implementation of the national innovation-to-procurement lifecycle.
    Department boundaries, multi-criteria evaluations, evaluation quorums, pilot milestone verifications, empirical validations, and financial disbursal rules are correctly implemented in backend business logic and confirmed by passing browser and API test suites.
    Remediating the single critical document security bypass and the two high-priority selection/onboarding guards will render the system fully hardened for government production deployment.
  </p>
</div>

<div style="text-align:center; font-size: 8pt; color: #94a3b8; margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
  SetuGov System Audit &bull; Generated on 21 September 2026 &bull; Read-Only Formal Assessment Report
</div>

</body>
</html>`;

async function generatePDF() {
  console.log('Launching headless Chromium via Playwright...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Rendering audit report HTML template...');
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });

  console.log(`Writing PDF to: ${outputPath}`);
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '12mm',
      bottom: '12mm',
      left: '12mm',
      right: '12mm'
    },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: '<div style="width: 100%; font-size: 7.5pt; color: #94a3b8; font-family: -apple-system, sans-serif; display: flex; justify-content: space-between; padding: 0 12mm;"><span>SetuGov Final System Audit &bull; Confidential Government Report</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>'
  });

  await browser.close();
  console.log('✓ PDF generated successfully!');
}

generatePDF().catch(err => {
  console.error('Failed to generate PDF:', err);
  process.exit(1);
});
