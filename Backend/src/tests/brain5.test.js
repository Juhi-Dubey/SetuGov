import http from 'http';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import {
  documentAssistanceSchema,
  documentTypeEnum
} from '../schemas/aiSchemas.js';
import { generateDocumentDraft } from '../services/aiService.js';

const runBrain5Tests = async () => {
  logger.info('🧪 Starting Brain 5 (Document Assistance & Governance Drafting) Tests...');
  await prisma.$connect();

  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (!condition) {
      logger.error(`  ❌ FAILED: ${message}`);
      failed++;
      throw new Error(message);
    } else {
      logger.info(`  ✅ ${message}`);
      passed++;
    }
  };

  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const request = (method, path, body = null, token = null) => {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const postData = body ? JSON.stringify(body) : null;

      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      };

      const req = http.request(options, (res) => {
        let resBody = '';
        res.on('data', chunk => (resBody += chunk));
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: JSON.parse(resBody)
            });
          } catch {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              rawBody: resBody
            });
          }
        });
      });

      req.on('error', reject);
      if (postData) req.write(postData);
      req.end();
    });
  };

  try {
    // ══════════════════════════════════════════════════════════════
    // A. Schema Validation Tests
    // ══════════════════════════════════════════════════════════════
    logger.info('─── A. Schema Validation Tests ───');

    const validPayload = {
      document_type: 'PILOT_AGREEMENT_DRAFT',
      challenge_title: 'AI-Powered OPD Queue Optimization',
      challenge_description: 'District hospitals experience excessive OPD waiting times.',
      startup_name: 'MediQueue Technologies Pvt Ltd',
      pilot_duration: '60 days',
      pilot_sites: ['Pune District Civil Hospital'],
      pilot_budget: '₹5,00,000',
      kpis: [
        {
          name: 'Average OPD Wait Time',
          unit: 'minutes',
          baseline: 90,
          target: 45,
          direction: 'decrease',
          description: 'Average patient waiting time',
          measurement_method: 'Timestamp audit',
          weight: 80
        }
      ],
      objectives: ['Reduce average OPD waiting time'],
      additional_context: 'Under State Health Department Innovation Sandbox.'
    };

    // A1: Valid DocumentAssistanceRequest parses cleanly
    const parseResult = documentAssistanceSchema.safeParse(validPayload);
    assert(parseResult.success === true, 'A1: Valid DocumentAssistanceRequest schema parses successfully');

    // A2: Missing document_type is rejected
    const invalidNoDocType = JSON.parse(JSON.stringify(validPayload));
    delete invalidNoDocType.document_type;
    const rA2 = documentAssistanceSchema.safeParse(invalidNoDocType);
    assert(rA2.success === false, 'A2: Missing document_type rejected');

    // A3: Invalid document_type is rejected
    const invalidDocTypeEnum = { ...validPayload, document_type: 'CONFIDENTIAL_LEGAL_MEMO' };
    const rA3 = documentAssistanceSchema.safeParse(invalidDocTypeEnum);
    assert(rA3.success === false, 'A3: Unsupported document_type rejected');

    // A4: Invalid KPI structure rejected
    const invalidKpiPayload = {
      ...validPayload,
      kpis: [{ description: 'No name' }]
    };
    const rA4 = documentAssistanceSchema.safeParse(invalidKpiPayload);
    assert(rA4.success === false, 'A4: Malformed KPI item missing name rejected');

    // A5: Optional fields parse cleanly as null or omitted
    const minimalPayload = {
      document_type: 'GOVERNANCE_CHECKLIST'
    };
    const rA5 = documentAssistanceSchema.safeParse(minimalPayload);
    assert(rA5.success === true, 'A5: Minimal payload with only document_type parses successfully');

    // ══════════════════════════════════════════════════════════════
    // B. All 5 Document Types Verification (Mock Mode)
    // ══════════════════════════════════════════════════════════════
    logger.info('─── B. All 5 Document Types Verification (generateDocumentDraft) ───');

    const docTypes = [
      'CHALLENGE_STATEMENT',
      'EVALUATION_CRITERIA',
      'PILOT_AGREEMENT_DRAFT',
      'GOVERNANCE_CHECKLIST',
      'PROCUREMENT_PATHWAY_SUMMARY'
    ];

    for (const dt of docTypes) {
      const draft = await generateDocumentDraft({
        ...validPayload,
        document_type: dt
      });

      assert(draft.document_type === dt, `B1 [${dt}]: document_type matches requested enum`);
      assert(typeof draft.title === 'string' && draft.title.length > 0, `B2 [${dt}]: title is non-empty`);
      assert(typeof draft.content === 'string' && draft.content.length > 100, `B3 [${dt}]: substantive content generated`);
      assert(Array.isArray(draft.sections) && draft.sections.length > 0, `B4 [${dt}]: sections list returned`);
      assert(Array.isArray(draft.missing_information), `B5 [${dt}]: missing_information list returned`);
      assert(draft.review_label === 'AI-generated draft — requires authorized review.', `B6 [${dt}]: mandatory review_label present`);
      assert(draft.ai_metadata && draft.ai_metadata.mode === 'mock', `B7 [${dt}]: ai_metadata contains mock notice`);
    }

    // ══════════════════════════════════════════════════════════════
    // C. Fact Preservation & Placeholder Sanitization
    // ══════════════════════════════════════════════════════════════
    logger.info('─── C. Fact Preservation & Placeholder Sanitization ───');

    const agreementDraft = await generateDocumentDraft({
      ...validPayload,
      document_type: 'PILOT_AGREEMENT_DRAFT'
    });

    assert(agreementDraft.content.includes('MediQueue Technologies Pvt Ltd'), 'C1: Startup name preserved exactly');
    assert(agreementDraft.content.includes('AI-Powered OPD Queue Optimization'), 'C2: Challenge title preserved exactly');
    assert(agreementDraft.content.includes('₹5,00,000'), 'C3: Budget value preserved exactly (₹5,00,000)');
    assert(agreementDraft.content.includes('60 days'), 'C4: Duration preserved exactly (60 days)');
    assert(agreementDraft.content.includes('Pune District Civil Hospital'), 'C5: Pilot sites preserved exactly');
    assert(agreementDraft.content.includes('Average OPD Wait Time') && agreementDraft.content.includes('45'), 'C6: KPI name and target (45) preserved exactly');
    assert(agreementDraft.content.includes('[IP OWNERSHIP TERMS NOT SPECIFIED — SUBJECT TO AUTHORIZED LEGAL REVIEW]'), 'C7: Unsupplied IP terms replaced with standard review placeholder');
    assert(agreementDraft.content.includes('[PAYMENT SCHEDULE NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]'), 'C8: Unsupplied payment schedule replaced with standard placeholder');

    // ══════════════════════════════════════════════════════════════
    // D. RBAC & Security Authorization Tests
    // ══════════════════════════════════════════════════════════════
    logger.info('─── D. RBAC & Security Authorization Tests ───');

    const timestamp = Date.now();

    // 1. Register Admin
    const adminLogin = await request('POST', '/api/v1/auth/login', {
      email: 'admin@setugov.in',
      password: 'Password123!'
    });
    const adminToken = adminLogin.body.data.token;

    // 2. Register Department & Gov Official
    const depRes = await request('POST', '/api/v1/departments', {
      name: `Dept of Healthcare B5 ${timestamp}`,
      state: 'Maharashtra',
      contact_email: `health.b5.${timestamp}@gov.in`
    }, adminToken);
    const department = depRes.body.data.department;

    const govReg = await request('POST', '/api/v1/auth/register', {
      name: `Gov Official Health B5 ${timestamp}`,
      email: `gov.b5.${timestamp}@health.gov.in`,
      password: 'GovPassword123!',
      role: 'GOVERNMENT',
      department_id: department.id
    });
    const govToken = govReg.body.data.token;

    // 3. Register Evaluator
    const evalReg = await request('POST', '/api/v1/auth/register', {
      name: `Dr. Evaluator B5 ${timestamp}`,
      email: `eval.b5.${timestamp}@evaluators.in`,
      password: 'EvalPassword123!',
      role: 'EVALUATOR'
    });
    const evalToken = evalReg.body.data.token;

    // 4. Register Startup
    const s1Reg = await request('POST', '/api/v1/auth/register', {
      name: `Founder S1 B5 ${timestamp}`,
      email: `founder.b5.${timestamp}@mediqueue.io`,
      password: 'StartupPassword123!',
      role: 'STARTUP'
    });
    const s1Token = s1Reg.body.data.token;

    // D1: ADMIN can generate document draft -> 200
    const adminDraftRes = await request('POST', '/api/v1/ai/documents/generate', validPayload, adminToken);
    assert(adminDraftRes.statusCode === 200, 'D1: Admin can generate document draft (200 OK)');
    assert(adminDraftRes.body.data.document_type === 'PILOT_AGREEMENT_DRAFT', 'D2: Admin response has correct document_type');

    // D2: GOVERNMENT can generate document draft -> 200
    const govDraftRes = await request('POST', '/api/v1/ai/documents/generate', {
      ...validPayload,
      document_type: 'CHALLENGE_STATEMENT'
    }, govToken);
    assert(govDraftRes.statusCode === 200, 'D3: Government can generate document draft (200 OK)');
    assert(govDraftRes.body.data.document_type === 'CHALLENGE_STATEMENT', 'D4: Government response has correct document_type');

    // D3: EVALUATOR can generate document draft -> 200
    const evalDraftRes = await request('POST', '/api/v1/ai/documents/generate', {
      ...validPayload,
      document_type: 'EVALUATION_CRITERIA'
    }, evalToken);
    assert(evalDraftRes.statusCode === 200, 'D5: Evaluator can generate document draft (200 OK)');
    assert(evalDraftRes.body.data.document_type === 'EVALUATION_CRITERIA', 'D6: Evaluator response has correct document_type');

    // D4: STARTUP is blocked -> 403 Forbidden
    const startupDraftRes = await request('POST', '/api/v1/ai/documents/generate', validPayload, s1Token);
    assert(startupDraftRes.statusCode === 403, 'D7: Startup is blocked with 403 Forbidden');

    // D5: Unauthenticated request is blocked -> 401 Unauthorized
    const unauthDraftRes = await request('POST', '/api/v1/ai/documents/generate', validPayload, null);
    assert(unauthDraftRes.statusCode === 401, 'D8: Unauthenticated request is blocked with 401 Unauthorized');

    // ══════════════════════════════════════════════════════════════
    // E. Database State Immutability Verification
    // ══════════════════════════════════════════════════════════════
    logger.info('─── E. Database State Immutability Verification ───');

    const countsBefore = {
      users: await prisma.user.count(),
      departments: await prisma.department.count(),
      challenges: await prisma.challenge.count(),
      startups: await prisma.startup.count(),
      documents: await prisma.startupDocument.count(),
      applications: await prisma.application.count(),
      pilots: await prisma.pilot.count(),
      scaleDecisions: await prisma.scaleDecision.count()
    };

    // Execute 3 document generation calls
    await request('POST', '/api/v1/ai/documents/generate', { document_type: 'GOVERNANCE_CHECKLIST' }, govToken);
    await request('POST', '/api/v1/ai/documents/generate', { document_type: 'PROCUREMENT_PATHWAY_SUMMARY' }, evalToken);
    await request('POST', '/api/v1/ai/documents/generate', { document_type: 'PILOT_AGREEMENT_DRAFT' }, adminToken);

    const countsAfter = {
      users: await prisma.user.count(),
      departments: await prisma.department.count(),
      challenges: await prisma.challenge.count(),
      startups: await prisma.startup.count(),
      documents: await prisma.startupDocument.count(),
      applications: await prisma.application.count(),
      pilots: await prisma.pilot.count(),
      scaleDecisions: await prisma.scaleDecision.count()
    };

    assert(countsAfter.users === countsBefore.users, 'E1: User count unchanged');
    assert(countsAfter.departments === countsBefore.departments, 'E2: Department count unchanged');
    assert(countsAfter.challenges === countsBefore.challenges, 'E3: Challenge count unchanged');
    assert(countsAfter.startups === countsBefore.startups, 'E4: Startup count unchanged');
    assert(countsAfter.documents === countsBefore.documents, 'E5: StartupDocument count unchanged');
    assert(countsAfter.applications === countsBefore.applications, 'E6: Application count unchanged');
    assert(countsAfter.pilots === countsBefore.pilots, 'E7: Pilot count unchanged');
    assert(countsAfter.scaleDecisions === countsBefore.scaleDecisions, 'E8: ScaleDecision count unchanged (No DB mutations)');

    logger.info('\n======================================================');
    logger.info(`🧪 Brain 5 Tests Complete: ${passed} passed, ${failed} failed`);
    logger.info('======================================================\n');
  } catch (error) {
    logger.error('❌ Brain 5 Test Failed:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
};

runBrain5Tests();
