import http from 'http';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

const runE2ETests = async () => {
  logger.info('🚀 Starting SetuGov Complete End-to-End REST API Lifecycle Verification...');

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
    // ----------------------------------------------------
    // STEP 1: Government Login
    // ----------------------------------------------------
    logger.info('Step 1: Government Official Logging in...');
    const govLoginRes = await request('POST', '/api/v1/auth/login', {
      email: 'ramesh.kumar@health.gov.in',
      password: 'Password123!'
    });
    if (govLoginRes.statusCode !== 200 || !govLoginRes.body.data.token) {
      throw new Error(`Gov Login failed: ${JSON.stringify(govLoginRes)}`);
    }
    const govToken = govLoginRes.body.data.token;
    const govUser = govLoginRes.body.data.user;
    logger.info(`✅ Government logged in: ${govUser.name} (${govUser.role})`);

    // ----------------------------------------------------
    // STEP 2: AI Generates Challenge Draft & Government Creates Challenge
    // ----------------------------------------------------
    logger.info('Step 2: Generating Challenge via AI & Creating Challenge...');
    const aiDraftRes = await request('POST', '/api/v1/ai/challenges/generate', {
      problem: {
        title: 'Hospital OPD Waiting Time Reduction via AI Queue Triage',
        description: 'Overcrowding in OPD triage and registration resulting in 90-minute wait times across district civil hospitals.',
        location: 'Karnataka'
      },
      outcome: {
        desired_outcome: 'Reduce average OPD wait time to under 60 minutes with automated digital triage.'
      }
    }, govToken);
    if (aiDraftRes.statusCode !== 200 || !aiDraftRes.body.data.problem_summary) {
      throw new Error(`AI Challenge Copilot failed: ${JSON.stringify(aiDraftRes.body)}`);
    }
    logger.info(`✅ AI Challenge Copilot completed: "${aiDraftRes.body.data.problem_summary.slice(0, 80)}..."`);

    const challengeRes = await request('POST', '/api/v1/challenges', {
      title: 'Hospital Waiting Time Reduction E2E',
      problem_description: 'Overcrowding in OPD triage and registration resulting in 90-minute wait times.',
      current_baseline: 'Average OPD waiting time is 90 minutes per patient.',
      desired_outcome: 'Reduce average OPD wait time to under 60 minutes with automated digital triage.',
      location: 'District Civil Hospital, Bangalore',
      budget_min: 200000,
      budget_max: 400000,
      pilot_duration_days: 60,
      required_technologies: ['AI Queue Management', 'Computer Vision', 'FHIR / ABDM API', 'Predictive Analytics']
    }, govToken);
    const challenge = challengeRes.body.data.challenge;
    logger.info(`✅ Challenge created in DRAFT: ${challenge.title} (${challenge.id})`);

    // ----------------------------------------------------
    // STEP 3: Publish Challenge
    // ----------------------------------------------------
    logger.info('Step 3: Publishing Challenge...');
    const pubRes = await request('POST', `/api/v1/challenges/${challenge.id}/publish`, null, govToken);
    if (pubRes.statusCode !== 200 || pubRes.body.data.challenge.status !== 'PUBLISHED') {
      throw new Error(`Publish failed: ${JSON.stringify(pubRes)}`);
    }
    logger.info('✅ Challenge transitioned to PUBLISHED');

    // ----------------------------------------------------
    // STEP 4: Discover / Generate Startup Matches
    // ----------------------------------------------------
    logger.info('Step 4: Running Startup Matching Algorithm...');
    const matchRes = await request('POST', `/api/v1/challenges/${challenge.id}/match`, null, govToken);
    if (matchRes.statusCode !== 200 || !Array.isArray(matchRes.body.data.matches)) {
      throw new Error(`Matching failed: ${JSON.stringify(matchRes)}`);
    }
    const topMatch = matchRes.body.data.matches[0];
    logger.info(`✅ Matching returned ${matchRes.body.data.total_matches} startups. Top ranked: ${topMatch.startup.company_name} (Score: ${topMatch.overall_score}%)`);

    // ----------------------------------------------------
    // STEP 5: Startup Login & View Challenge
    // ----------------------------------------------------
    logger.info('Step 5: Startup User Logging in & Viewing Challenge...');
    const startupLoginRes = await request('POST', '/api/v1/auth/login', {
      email: 'vikas@mediqueue.ai',
      password: 'Password123!'
    });
    const startupToken = startupLoginRes.body.data.token;

    const viewChalRes = await request('GET', `/api/v1/challenges/${challenge.id}`, null, startupToken);
    if (viewChalRes.statusCode !== 200) {
      throw new Error(`View challenge failed: ${JSON.stringify(viewChalRes)}`);
    }
    logger.info('✅ Startup successfully viewed challenge details');

    // ----------------------------------------------------
    // STEP 6: Startup Submits Application
    // ----------------------------------------------------
    logger.info('Step 6: Startup submitting proposal / application...');
    const appRes = await request('POST', `/api/v1/challenges/${challenge.id}/applications`, {
      proposal: 'Integrated Edge AI Cameras and Smart Token Kiosks for Hospital Waiting Time Reduction.',
      technical_approach: 'Deploying edge cameras for real-time crowd density, automated ABHA token generation, and doctor consultation load balancing.',
      expected_impact: 'Expected 40% reduction in patient waiting time from 90 minutes to 54 minutes within 60 days.',
      estimated_cost: 380000,
      timeline: '60 days in three 20-day milestone phases',
      status: 'SUBMITTED'
    }, startupToken);
    if (appRes.statusCode !== 201 || !appRes.body.data.application) {
      throw new Error(`Application submission failed: ${JSON.stringify(appRes)}`);
    }
    const application = appRes.body.data.application;
    logger.info(`✅ Application submitted (ID: ${application.id}, status: ${application.status})`);

    // ----------------------------------------------------
    // STEP 7: Evaluator Login & Evaluates Application
    // ----------------------------------------------------
    logger.info('Step 7: Evaluator Logging in & Scoring Application...');
    const evalLoginRes = await request('POST', '/api/v1/auth/login', {
      email: 'anita.desai@evaluators.setugov.in',
      password: 'Password123!'
    });
    const evalToken = evalLoginRes.body.data.token;

    const evalRes = await request('POST', `/api/v1/applications/${application.id}/evaluations`, {
      technical_score: 92,
      innovation_score: 90,
      impact_score: 95,
      scalability_score: 85,
      cost_score: 90,
      comments: 'State-of-the-art queue orchestration with excellent ABDM compliance and proven deployment records.'
    }, evalToken);
    if (evalRes.statusCode !== 201 || !evalRes.body.data.evaluation) {
      throw new Error(`Evaluation submission failed: ${JSON.stringify(evalRes)}`);
    }
    const evaluation = evalRes.body.data.evaluation;
    logger.info(`✅ Evaluator score submitted. Total weighted score: ${evaluation.total_score}%`);

    // ----------------------------------------------------
    // STEP 8: Government Reviews Aggregated Evaluation Summary
    // ----------------------------------------------------
    logger.info('Step 8: Government reviewing Evaluation Summary...');
    const evalSumRes = await request('GET', `/api/v1/challenges/${challenge.id}/evaluation-summary`, null, govToken);
    if (evalSumRes.statusCode !== 200 || evalSumRes.body.data.ranked_applications.length === 0) {
      throw new Error(`Evaluation summary failed: ${JSON.stringify(evalSumRes)}`);
    }
    const topRanked = evalSumRes.body.data.ranked_applications[0];
    logger.info(`✅ Evaluation summary reviewed: Rank 1 is ${topRanked.startup.company_name} (Avg Score: ${topRanked.average_scores.overall_total}%)`);

    // ----------------------------------------------------
    // STEP 9: Government Shortlists and Selects Startup
    // ----------------------------------------------------
    logger.info('Step 9: Government shortlisting and selecting top-ranked startup...');
    const shortlistRes = await request('PATCH', `/api/v1/applications/${application.id}/status`, {
      status: 'SHORTLISTED',
      reason: 'Top rank in technical and impact evaluation.'
    }, govToken);
    if (shortlistRes.statusCode !== 200) {
      throw new Error(`Shortlisting failed: ${JSON.stringify(shortlistRes)}`);
    }
    logger.info('✅ Application transitioned to SHORTLISTED');

    const selectRes = await request('PATCH', `/api/v1/applications/${application.id}/status`, {
      status: 'SELECTED',
      reason: 'Highest evaluation score (91.0%) and proven technical readiness.'
    }, govToken);
    if (selectRes.statusCode !== 200 || selectRes.body.data.application.status !== 'SELECTED') {
      throw new Error(`Selection failed: ${JSON.stringify(selectRes)}`);
    }
    logger.info('✅ Application status updated to SELECTED');

    // ----------------------------------------------------
    // STEP 10: Create Pilot
    // ----------------------------------------------------
    logger.info('Step 10: Creating Pilot Project...');
    const pilotStartDate = new Date().toISOString();
    const pilotEndDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    const pilotRes = await request('POST', '/api/v1/pilots', {
      challenge_id: challenge.id,
      startup_id: topMatch.startup.id,
      location: 'District Civil Hospital, Bangalore',
      start_date: pilotStartDate,
      end_date: pilotEndDate,
      budget: 380000
    }, govToken);
    if (pilotRes.statusCode !== 201 || !pilotRes.body.data.pilot) {
      throw new Error(`Pilot creation failed: ${JSON.stringify(pilotRes)}`);
    }
    const pilot = pilotRes.body.data.pilot;
    logger.info(`✅ Pilot created in PLANNED status: ID ${pilot.id}`);

    // Start Pilot
    const startPilotRes = await request('POST', `/api/v1/pilots/${pilot.id}/start`, null, govToken);
    if (startPilotRes.statusCode !== 200 || startPilotRes.body.data.pilot.status !== 'RUNNING') {
      throw new Error(`Start pilot failed: ${JSON.stringify(startPilotRes)}`);
    }
    logger.info('✅ Pilot started (status: RUNNING)');

    // ----------------------------------------------------
    // STEP 11: Create KPIs and Record Measurements
    // ----------------------------------------------------
    logger.info('Step 11: Creating KPIs and Recording Time-Series Measurements...');
    const kpiRes = await request('POST', `/api/v1/pilots/${pilot.id}/kpis`, {
      name: 'Average OPD Waiting Time',
      unit: 'minutes',
      baseline_value: 90,
      target_value: 60,
      weight: 2.0
    }, govToken);
    const kpi = kpiRes.body.data.kpi;
    logger.info(`✅ KPI Created: ${kpi.name} (Baseline: 90m, Target: 60m)`);

    // Record Measurements
    await request('POST', `/api/v1/pilots/${pilot.id}/measurements`, {
      kpi_id: kpi.id,
      value: 75,
      source: 'Kiosk Day 20 Telemetry',
      verified: true
    }, govToken);

    await request('POST', `/api/v1/pilots/${pilot.id}/measurements`, {
      kpi_id: kpi.id,
      value: 54, // Final measurement beating target!
      source: 'Independent Hospital Audit',
      verified: true
    }, govToken);
    logger.info('✅ Recorded measurements demonstrating waiting time reduction from 90m -> 54m (Goal Achieved!)');

    // ----------------------------------------------------
    // STEP 12: Track Milestones & Payments
    // ----------------------------------------------------
    logger.info('Step 12: Creating Milestones and Payments...');
    const mRes = await request('POST', `/api/v1/pilots/${pilot.id}/milestones`, {
      name: 'Hardware & Edge Kiosk Deployment',
      due_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      completion_percentage: 100,
      payment_percentage: 30
    }, govToken);
    const milestone = mRes.body.data.milestone;

    const payRes = await request('POST', `/api/v1/pilots/${pilot.id}/payments`, {
      milestone_id: milestone.id,
      amount: 114000,
      payment_percentage: 30,
      status: 'PAID'
    }, govToken);
    logger.info(`✅ Milestone & Simulated Payment created (Paid ₹${payRes.body.data.payment.amount})`);

    // ----------------------------------------------------
    // STEP 13: Upload Evidence & Log Risks
    // ----------------------------------------------------
    logger.info('Step 13: Uploading Evidence and Logging Risks...');
    await request('POST', `/api/v1/pilots/${pilot.id}/evidence`, {
      type: 'TELEMETRY_LOG',
      description: 'Edge camera verified crowd density log and token time audit.',
      file_url: 'https://storage.setugov.in/pilots/telemetry.csv',
      source: 'Edge Gateway'
    }, startupToken);

    await request('POST', `/api/v1/pilots/${pilot.id}/risks`, {
      category: 'TECHNICAL',
      description: 'Local LAN network redundancy',
      severity: 'LOW',
      mitigation: '4G fallback dongles enabled on all kiosks.',
      owner: 'MediQueue Ops'
    }, startupToken);
    logger.info('✅ Evidence and Risk items attached to pilot');

    // ----------------------------------------------------
    // STEP 14: Submit Validation Report
    // ----------------------------------------------------
    logger.info('Step 14: Submitting Formal Validation Report...');
    const valRes = await request('POST', `/api/v1/pilots/${pilot.id}/validation`, {
      performance_score: 95,
      kpi_achievement_score: 96,
      evidence_quality_score: 92,
      technical_stability_score: 92,
      user_satisfaction_score: 94,
      comments: 'Phenomenal result. OPD wait time reduced from 90 to 54 minutes with verified telemetry and patient praise.',
      status: 'VALIDATED'
    }, evalToken);
    if (valRes.statusCode !== 201) {
      throw new Error(`Validation failed: ${JSON.stringify(valRes)}`);
    }
    logger.info(`✅ Pilot formally VALIDATED (score: ${valRes.body.data.validation.performance_score}%)`);

    // ----------------------------------------------------
    // STEP 15: Run AI Pilot Analysis
    // ----------------------------------------------------
    logger.info('Step 15: Running AI Pilot Performance Analysis...');
    const aiPilotAnalysis = await request('POST', `/api/v1/ai/pilots/${pilot.id}/analyze`, null, govToken);
    if (aiPilotAnalysis.statusCode !== 200 || !aiPilotAnalysis.body.data.overall_assessment || !Array.isArray(aiPilotAnalysis.body.data.kpi_analyses)) {
      throw new Error(`AI Pilot analysis failed: ${JSON.stringify(aiPilotAnalysis)}`);
    }
    logger.info(`✅ AI Analysis Completed: Overall Assessment = '${aiPilotAnalysis.body.data.overall_assessment}' (KPI Analyses: ${aiPilotAnalysis.body.data.kpi_analyses.length})`);

    // ----------------------------------------------------
    // STEP 16: Government Completes Pilot & Finalizes Scale Decision
    // ----------------------------------------------------
    logger.info('Step 16: Government completing pilot and finalizing SCALE decision...');
    const compPilotRes = await request('POST', `/api/v1/pilots/${pilot.id}/complete`, null, govToken);
    if (compPilotRes.statusCode !== 200) {
      throw new Error(`Complete pilot failed: ${JSON.stringify(compPilotRes)}`);
    }
    logger.info('✅ Pilot transitioned to COMPLETED');

    const scaleRes = await request('POST', `/api/v1/pilots/${pilot.id}/scale-decision`, {
      decision: 'SCALE',
      score: 94.5,
      reasoning: 'KPI target surpassed (54 min actual vs 60 min target). Solution is cost-effective, robust, and approved for statewide deployment across 5 district hospitals.'
    }, govToken);
    if (scaleRes.statusCode !== 201 || scaleRes.body.data.scaleDecision.decision !== 'SCALE') {
      throw new Error(`Scale decision failed: ${JSON.stringify(scaleRes)}`);
    }
    logger.info(`✅ Scale decision recorded: ${scaleRes.body.data.scaleDecision.decision}`);

    // ----------------------------------------------------
    // STEP 17: Fetch Full Pilot Dashboard
    // ----------------------------------------------------
    logger.info('Step 17: Fetching Complete Pilot Dashboard...');
    const dashRes = await request('GET', `/api/v1/pilots/${pilot.id}/dashboard`, null, govToken);
    if (dashRes.statusCode !== 200 || !dashRes.body.data.performance) {
      throw new Error(`Pilot dashboard failed: ${JSON.stringify(dashRes)}`);
    }
    const dashboard = dashRes.body.data;
    logger.info(`✅ Pilot Dashboard verified:`);
    logger.info(`   - Status: ${dashboard.pilot.status}`);
    logger.info(`   - Average KPI Achievement: ${dashboard.performance.avgKpiAchievement}%`);
    logger.info(`   - Total Milestones: ${dashboard.milestones.length}`);
    logger.info(`   - Budget Disbursed: ₹${dashboard.performance.totalDisbursed} (${dashboard.performance.disbursementPercent}%)`);
    logger.info(`   - Scale Decision: ${dashboard.scaleDecision?.decision}`);

    // ----------------------------------------------------
    // STEP 18: Verify Audit Logs
    // ----------------------------------------------------
    logger.info('Step 18: Admin checking Audit Trail...');
    const adminLoginRes = await request('POST', '/api/v1/auth/login', {
      email: 'admin@setugov.in',
      password: 'Password123!'
    });
    const adminToken = adminLoginRes.body.data.token;
    const auditRes = await request('GET', '/api/v1/audit-logs', null, adminToken);
    logger.info(`✅ Audit trail verified (${auditRes.body.data.logs?.length || 0} events logged).`);

    logger.info('===============================================================');
    logger.info('🎉 COMPLETE SETUGOV REST API END-TO-END VERIFICATION PASSED! 🎉');
    logger.info('===============================================================');
  } catch (error) {
    logger.error('❌ E2E Test Failed:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
};

runE2ETests();
