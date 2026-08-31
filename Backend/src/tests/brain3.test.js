import http from 'http';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import {
  proposalAnalysisSchema,
  proposalContentSchema,
  eligibilityInfoSchema
} from '../schemas/aiSchemas.js';
import { analyzeProposal, analyzeApplicationProposal } from '../services/aiService.js';

const runBrain3Tests = async () => {
  logger.info('🧪 Starting Brain 3 (Proposal Assistant / Application Intelligence) Tests...');

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
      challenge: {
        title: 'Smart Traffic Flow Optimization',
        description: 'AI-driven traffic signaling to reduce peak congestion across urban corridors.',
        domain: 'Urban Mobility',
        technology_categories: ['Computer Vision', 'Edge AI', 'IoT'],
        location: 'Bangalore Central',
        kpis: [
          {
            name: 'Average Peak Delay',
            unit: 'minutes',
            baseline: 45,
            target: 25,
            direction: 'decrease'
          }
        ]
      },
      startup: {
        name: 'TrafficPulse Analytics Pvt Ltd',
        description: 'Edge-based adaptive traffic signal controllers with real-time vehicle density detection.',
        technologies: ['Computer Vision', 'Edge AI', 'IoT'],
        domain: 'Urban Mobility',
        experience: '3 years experience in municipal deployments',
        deployments: ['2 live municipal junctions'],
        certifications: ['ISO 9001', 'DPIIT Registered'],
        team_size: 12,
        location: 'Bangalore, Karnataka'
      },
      proposal: {
        summary: 'Deploying edge cameras and adaptive phase controllers at 10 major city junctions.',
        technical_approach: 'YOLO-based vehicle telemetry coupled with decentralized RL signal timing.',
        implementation_timeline: '60 days in 3 deployment sprints',
        estimated_cost: '350000',
        expected_impact: 'Targeting 35% reduction in commuter wait times.',
        team_composition: 'Lead ML engineer, Embedded systems architect, 2 Deployment technicians',
        past_experience: '3 years in municipal intelligent transportation systems'
      },
      eligibility: {
        dpiit_registered: true,
        incorporation_date: '2022-04-15',
        annual_turnover: '4500000',
        certifications: ['DPIIT_RECOGNITION'],
        additional_documents: ['DPIIT_CERT', 'PITCH_DECK']
      },
      available_documents: ['DPIIT_CERT', 'PITCH_DECK']
    };

    // A1: Valid schema parses cleanly
    const parseResult = proposalAnalysisSchema.safeParse(validPayload);
    assert(parseResult.success === true, 'A1: Valid ProposalAnalysisRequest schema parses successfully');

    // A2: Missing challenge.title is rejected
    const invalidChalTitle = JSON.parse(JSON.stringify(validPayload));
    delete invalidChalTitle.challenge.title;
    const rA2 = proposalAnalysisSchema.safeParse(invalidChalTitle);
    assert(rA2.success === false, 'A2: Missing challenge.title rejected');

    // A3: Missing challenge.description is rejected
    const invalidChalDesc = JSON.parse(JSON.stringify(validPayload));
    delete invalidChalDesc.challenge.description;
    const rA3 = proposalAnalysisSchema.safeParse(invalidChalDesc);
    assert(rA3.success === false, 'A3: Missing challenge.description rejected');

    // A4: Missing startup.name is rejected
    const invalidStartupName = JSON.parse(JSON.stringify(validPayload));
    delete invalidStartupName.startup.name;
    const rA4 = proposalAnalysisSchema.safeParse(invalidStartupName);
    assert(rA4.success === false, 'A4: Missing startup.name rejected');

    // A5: Missing startup.description is rejected
    const invalidStartupDesc = JSON.parse(JSON.stringify(validPayload));
    delete invalidStartupDesc.startup.description;
    const rA5 = proposalAnalysisSchema.safeParse(invalidStartupDesc);
    assert(rA5.success === false, 'A5: Missing startup.description rejected');

    // A6: Optional proposal fields work when null
    const nullProposalFields = JSON.parse(JSON.stringify(validPayload));
    nullProposalFields.proposal.team_composition = null;
    nullProposalFields.eligibility = null;
    nullProposalFields.available_documents = null;
    const rA6 = proposalAnalysisSchema.safeParse(nullProposalFields);
    assert(rA6.success === true, 'A6: Optional/nullable proposal and eligibility fields parse cleanly');

    // ══════════════════════════════════════════════════════════════
    // B. Mock Mode Tests (analyzeProposal)
    // ══════════════════════════════════════════════════════════════
    logger.info('─── B. Mock Mode Tests (analyzeProposal) ───');

    const mockResult = await analyzeProposal(validPayload);

    assert(typeof mockResult.executive_summary === 'string' && mockResult.executive_summary.length > 10, 'B1: executive_summary is a non-empty string');
    assert(typeof mockResult.technical_approach === 'string', 'B2: technical_approach is present as string');
    assert(typeof mockResult.expected_impact === 'string', 'B3: expected_impact is present as string');
    assert(typeof mockResult.technology_readiness === 'string', 'B4: technology_readiness is present as string');
    assert(Array.isArray(mockResult.risks) && mockResult.risks.length > 0, 'B5: risks is a non-empty array');
    assert(mockResult.risks[0].category && mockResult.risks[0].severity && mockResult.risks[0].description, 'B6: risk item has category, severity, and description');
    assert(mockResult.estimated_cost === '350000', 'B7: estimated_cost is preserved from input');
    assert(mockResult.implementation_timeline === '60 days in 3 deployment sprints', 'B8: implementation_timeline is preserved from input');
    assert(Array.isArray(mockResult.missing_information), 'B9: missing_information is an array');
    assert(Array.isArray(mockResult.questions_for_evaluator) && mockResult.questions_for_evaluator.length > 0, 'B10: questions_for_evaluator is a non-empty array');
    assert(mockResult.ai_metadata && mockResult.ai_metadata.mode === 'mock', 'B11: ai_metadata is present with mock mode indicated');

    // ══════════════════════════════════════════════════════════════
    // C. Database Setup & Integration Tests
    // ══════════════════════════════════════════════════════════════
    logger.info('─── C. Database Setup & Application Data Mapping ───');

    const timestamp = Date.now();

    // 1. Setup Admin, Departments & Users
    const adminLogin = await request('POST', '/api/v1/auth/login', {
      email: 'admin@setugov.in',
      password: 'Password123!'
    });
    const adminToken = adminLogin.body.data.token;

    // Dept A (Transport)
    const depARes = await request('POST', '/api/v1/departments', {
      name: `Dept of Transport B3 ${timestamp}`,
      state: 'Maharashtra',
      contact_email: `transport.b3.${timestamp}@gov.in`
    }, adminToken);
    const departmentA = depARes.body.data.department;

    // Dept B (Health)
    const depBRes = await request('POST', '/api/v1/departments', {
      name: `Dept of Health B3 ${timestamp}`,
      state: 'Maharashtra',
      contact_email: `health.b3.${timestamp}@gov.in`
    }, adminToken);
    const departmentB = depBRes.body.data.department;

    // Gov A in Dept A
    const govAReg = await request('POST', '/api/v1/auth/register', {
      name: `Gov Official Dept A ${timestamp}`,
      email: `govA.b3.${timestamp}@transport.gov.in`,
      password: 'GovPassword123!',
      role: 'GOVERNMENT',
      department_id: departmentA.id
    });
    const govAToken = govAReg.body.data.token;

    // Gov B in Dept B
    const govBReg = await request('POST', '/api/v1/auth/register', {
      name: `Gov Official Dept B ${timestamp}`,
      email: `govB.b3.${timestamp}@health.gov.in`,
      password: 'GovPassword123!',
      role: 'GOVERNMENT',
      department_id: departmentB.id
    });
    const govBToken = govBReg.body.data.token;

    // Gov C with NO Department
    const govCReg = await request('POST', '/api/v1/auth/register', {
      name: `Gov Unassigned ${timestamp}`,
      email: `govC.b3.${timestamp}@unassigned.gov.in`,
      password: 'GovPassword123!',
      role: 'GOVERNMENT'
    });
    const govCToken = govCReg.body.data.token;

    // Evaluator
    const evalReg = await request('POST', '/api/v1/auth/register', {
      name: `Dr. Evaluator B3 ${timestamp}`,
      email: `eval.b3.${timestamp}@evaluators.in`,
      password: 'EvalPassword123!',
      role: 'EVALUATOR'
    });
    const evalToken = evalReg.body.data.token;

    // Startup 1 (Owner)
    const s1Reg = await request('POST', '/api/v1/auth/register', {
      name: `Founder S1 ${timestamp}`,
      email: `founder1.b3.${timestamp}@trafficpulse.io`,
      password: 'StartupPassword123!',
      role: 'STARTUP'
    });
    const s1Token = s1Reg.body.data.token;

    // Startup 2 (Competitor)
    const s2Reg = await request('POST', '/api/v1/auth/register', {
      name: `Founder S2 ${timestamp}`,
      email: `founder2.b3.${timestamp}@competitor.io`,
      password: 'StartupPassword123!',
      role: 'STARTUP'
    });
    const s2Token = s2Reg.body.data.token;

    // Create Challenge in Dept A
    const chalRes = await request('POST', '/api/v1/challenges', {
      title: `Urban Traffic Congestion Reduction ${timestamp}`,
      problem_description: 'Severe peak-hour congestion at municipal intersections causing 45m delays.',
      current_baseline: 'Average intersection wait time is 45 minutes.',
      desired_outcome: 'Reduce average intersection wait time below 25 minutes.',
      location: 'Pune Smart City Corridor',
      budget_min: 200000,
      budget_max: 500000,
      pilot_duration_days: 60,
      required_technologies: ['Computer Vision', 'Edge AI', 'Adaptive Signaling']
    }, govAToken);
    const challenge = chalRes.body.data.challenge;

    // Publish Challenge
    await request('POST', `/api/v1/challenges/${challenge.id}/publish`, null, govAToken);

    // Startup 1 Profile & Verification
    const s1Profile = await request('POST', '/api/v1/startups', {
      company_name: `TrafficPulse Technologies Pvt Ltd ${timestamp}`,
      description: 'Edge-based computer vision adaptive traffic signaling and telemetry.',
      domain: 'Urban Mobility',
      technologies: ['Computer Vision', 'Edge AI', 'Adaptive Signaling'],
      readiness_level: 8,
      years_experience: 3,
      previous_deployments: 2,
      location: 'Pune, Maharashtra'
    }, s1Token);
    const startup1 = s1Profile.body.data.startup;

    await request('POST', `/api/v1/startups/${startup1.id}/documents`, {
      document_type: 'DPIIT_RECOGNITION',
      document_url: 'https://storage.setugov.in/docs/trafficpulse-dpiit.pdf'
    }, s1Token);

    await request('PATCH', `/api/v1/startups/${startup1.id}/verification`, {
      verification_status: 'VERIFIED',
      comments: 'Verified by Department Official.'
    }, govAToken);

    // Startup 1 Submits Application
    const appRes = await request('POST', `/api/v1/challenges/${challenge.id}/applications`, {
      proposal: 'Automated Smart Traffic Signal Synchronization and Queue Offload Pilot Deployment.',
      technical_approach: 'Deploying edge cameras running YOLOv8 at 8 junctions with dynamic phase adjustments.',
      expected_impact: 'Expected to reduce average intersection wait time from 45m to 22m within 60 days.',
      estimated_cost: 380000,
      timeline: '60 days in 3 milestone phases',
      status: 'SUBMITTED'
    }, s1Token);
    assert(appRes.statusCode === 201, 'C1: Application submitted successfully (201 Created)');
    const application = appRes.body.data.application;

    // ══════════════════════════════════════════════════════════════
    // D. Security, Authorization & Tenant Scoping Tests
    // ══════════════════════════════════════════════════════════════
    logger.info('─── D. Security, Authorization & Tenant Scoping Tests ───');

    // D1: ADMIN can invoke Brain 3 analysis -> 200
    const adminAiRes = await request('POST', `/api/v1/ai/applications/${application.id}/analyze`, null, adminToken);
    assert(adminAiRes.statusCode === 200, 'D1: Admin can invoke Brain 3 analysis (200 OK)');
    assert(adminAiRes.body.data.executive_summary !== undefined, 'D2: Admin response contains executive_summary');
    assert(Array.isArray(adminAiRes.body.data.questions_for_evaluator), 'D3: Admin response contains questions_for_evaluator');

    // D2: EVALUATOR can invoke Brain 3 analysis -> 200
    const evalAiRes = await request('POST', `/api/v1/ai/applications/${application.id}/analyze`, null, evalToken);
    assert(evalAiRes.statusCode === 200, 'D4: Evaluator can invoke Brain 3 analysis (200 OK)');
    assert(evalAiRes.body.data.executive_summary !== undefined, 'D5: Evaluator response contains executive_summary');

    // D3: GOVERNMENT (Same Department) can invoke Brain 3 analysis -> 200
    const govAAiRes = await request('POST', `/api/v1/ai/applications/${application.id}/analyze`, null, govAToken);
    assert(govAAiRes.statusCode === 200, 'D6: Government in assigned department can invoke Brain 3 analysis (200 OK)');
    assert(Array.isArray(govAAiRes.body.data.risks), 'D7: Government response contains risks array');

    // D4: GOVERNMENT (Different Department) is blocked -> 403
    const govBAiRes = await request('POST', `/api/v1/ai/applications/${application.id}/analyze`, null, govBToken);
    assert(govBAiRes.statusCode === 403, 'D8: Government from different department blocked with 403 Forbidden');

    // D5: GOVERNMENT (Without Department) is blocked -> 403
    const govCAiRes = await request('POST', `/api/v1/ai/applications/${application.id}/analyze`, null, govCToken);
    assert(govCAiRes.statusCode === 403, 'D9: Government without department blocked with 403 Forbidden');

    // D6: STARTUP (Own Application) is blocked -> 403
    const s1AiRes = await request('POST', `/api/v1/ai/applications/${application.id}/analyze`, null, s1Token);
    assert(s1AiRes.statusCode === 403, 'D10: Startup owner blocked from proposal intelligence with 403 Forbidden');

    // D7: STARTUP (Competitor Application) is blocked -> 403
    const s2AiRes = await request('POST', `/api/v1/ai/applications/${application.id}/analyze`, null, s2Token);
    assert(s2AiRes.statusCode === 403, 'D11: Startup competitor blocked from proposal intelligence with 403 Forbidden');

    // D8: Non-existent application returns 404
    const nonExistentRes = await request('POST', '/api/v1/ai/applications/00000000-0000-0000-0000-000000000000/analyze', null, adminToken);
    assert(nonExistentRes.statusCode === 404, 'D12: Non-existent application ID returns 404 Not Found');

    // ══════════════════════════════════════════════════════════════
    // E. Application Integrity & Immutability Verification
    // ══════════════════════════════════════════════════════════════
    logger.info('─── E. Application Integrity & Immutability Verification ───');

    const appInDb = await prisma.application.findUnique({
      where: { id: application.id }
    });

    assert(appInDb.status === 'SUBMITTED', 'E1: Application status is completely unchanged (still SUBMITTED)');
    assert(appInDb.proposal === application.proposal, 'E2: Proposal text remains untouched');
    assert(appInDb.technical_approach === application.technical_approach, 'E3: Technical approach remains untouched');
    assert(appInDb.timeline === application.timeline, 'E4: Timeline remains untouched');
    assert(Number(appInDb.estimated_cost) === 380000, 'E5: Estimated cost remains untouched');

    logger.info('\n======================================================');
    logger.info(`🧪 Brain 3 Tests Complete: ${passed} passed, ${failed} failed`);
    logger.info('======================================================\n');
  } catch (error) {
    logger.error('❌ Brain 3 Test Failed:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
};

runBrain3Tests();
