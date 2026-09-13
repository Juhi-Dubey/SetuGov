import http from 'http';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

const runPhase6Tests = async () => {
  logger.info('🧪 Starting Phase 6 (Evaluations & Summary Aggregation) Tests...');

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
    const timestamp = Date.now();

    // 1. Setup Admin, Department, Government & Challenge
    const adminLogin = await request('POST', '/api/v1/auth/login', {
      email: 'admin@setugov.in',
      password: 'Password123!'
    });
    const adminToken = adminLogin.body.data.token;

    const depRes = await request('POST', '/api/v1/departments', {
      name: `Dept of Health P6 ${timestamp}`,
      state: 'Karnataka',
      contact_email: `health.p6.${timestamp}@gov.in`
    }, adminToken);
    const department = depRes.body.data.department;

    const govReg = await request('POST', '/api/v1/auth/register', {
      name: 'Dr. Ramesh Kumar',
      email: `ramesh.p6.${timestamp}@health.gov.in`,
      password: 'GovPassword123!',
      role: 'GOVERNMENT',
      department_id: department.id
    });
    const govToken = govReg.body.data.token;

    const chalRes = await request('POST', '/api/v1/challenges', {
      title: 'OPD Queue Reduction & Triage Pilot',
      problem_description: '90 minutes average wait time in district hospital OPD.',
      current_baseline: '90 minutes average wait time.',
      desired_outcome: '60 minutes average wait time.',
      location: 'Victoria Hospital',
      budget_min: 200000,
      budget_max: 400000,
      pilot_duration_days: 60,
      required_technologies: ['AI', 'Queue Engine']
    }, govToken);
    const challenge = chalRes.body.data.challenge;
    await request('POST', `/api/v1/challenges/${challenge.id}/publish`, null, govToken);

    // 2. Setup Startup & Application
    const startReg = await request('POST', '/api/v1/auth/register', {
      name: 'Startup Founder',
      email: `founder.p6.${timestamp}@meditech.in`,
      password: 'StartupPassword123!',
      role: 'STARTUP'
    });
    const startToken = startReg.body.data.token;

    const sProfile = await request('POST', '/api/v1/startups', {
      company_name: 'MediQueue AI Solutions',
      description: 'Intelligent OPD token allocation and computer vision crowd density monitoring.',
      domain: 'Healthcare',
      technologies: ['AI', 'Queue Engine', 'FastAPI'],
      readiness_level: 8,
      years_experience: 3,
      previous_deployments: 2,
      location: 'Bangalore'
    }, startToken);
    const startup = sProfile.body.data.startup;

    // Verify startup
    await request('PATCH', `/api/v1/startups/${startup.id}/verification`, { verification_status: 'VERIFIED' }, govToken);

    // Submit Application
    const appRes = await request('POST', `/api/v1/challenges/${challenge.id}/applications`, {
      proposal: 'Automated Hospital Queue and Triage Orchestration Pilot Deployment for OPD.',
      technical_approach: 'Deploying edge cameras for real-time wait estimation, QR/Kiosk token generation, and doctor consultation load balancing.',
      expected_impact: 'Expected reduction of patient waiting time from 90 minutes to under 55 minutes within 60 days.',
      estimated_cost: 380000,
      timeline: '60 days in 3 milestone sprints',
      status: 'SUBMITTED'
    }, startToken);
    const application = appRes.body.data.application;

    // 3. Register Evaluator 1 & 2
    logger.info('3. Registering Evaluator 1 & 2...');
    const eval1Reg = await request('POST', '/api/v1/auth/register', {
      name: 'Dr. Satish Chandra (Senior Healthcare Evaluator)',
      email: `satish.eval.${timestamp}@setugov.in`,
      password: 'EvalPassword123!',
      role: 'EVALUATOR'
    });
    const eval1Token = eval1Reg.body.data.token;

    const eval2Reg = await request('POST', '/api/v1/auth/register', {
      name: 'Prof. Meera Sen (Tech Evaluator)',
      email: `meera.eval.${timestamp}@setugov.in`,
      password: 'EvalPassword123!',
      role: 'EVALUATOR'
    });
    const eval2Token = eval2Reg.body.data.token;

    // 4. Evaluator 1 submits evaluation
    logger.info('4. Evaluator 1 submitting evaluation...');
    // Tech: 90*0.25 (22.5) + Innov: 85*0.20 (17.0) + Impact: 90*0.25 (22.5) + Scalability: 80*0.15 (12.0) + Cost: 80*0.15 (12.0) = 86.0
    const eval1Res = await request('POST', `/api/v1/applications/${application.id}/evaluations`, {
      technical_score: 90,
      innovation_score: 85,
      impact_score: 90,
      scalability_score: 80,
      cost_score: 80,
      comments: 'Strong technical architecture with proven camera integration and clear patient flow benefits.'
    }, eval1Token);

    if (eval1Res.statusCode !== 201 || !eval1Res.body.data.evaluation) {
      throw new Error(`Eval 1 failed: ${JSON.stringify(eval1Res)}`);
    }
    const evaluation1 = eval1Res.body.data.evaluation;
    if (evaluation1.total_score !== 86.0) {
      throw new Error(`Expected total_score 86.0, got: ${evaluation1.total_score}`);
    }
    logger.info(`✅ Evaluator 1 evaluation submitted. Total weighted score calculated by backend: ${evaluation1.total_score}%`);

    // 5. Evaluator 2 submits evaluation
    logger.info('5. Evaluator 2 submitting evaluation...');
    // Tech: 80*0.25 (20.0) + Innov: 80*0.20 (16.0) + Impact: 85*0.25 (21.25) + Scalability: 85*0.15 (12.75) + Cost: 90*0.15 (13.5) = 83.5
    const eval2Res = await request('POST', `/api/v1/applications/${application.id}/evaluations`, {
      technical_score: 80,
      innovation_score: 80,
      impact_score: 85,
      scalability_score: 85,
      cost_score: 90,
      comments: 'Cost-effective deployment approach with practical hospital staff training modules.'
    }, eval2Token);

    if (eval2Res.statusCode !== 201 || eval2Res.body.data.evaluation.total_score !== 83.5) {
      throw new Error(`Eval 2 failed: ${JSON.stringify(eval2Res)}`);
    }
    logger.info(`✅ Evaluator 2 evaluation submitted. Total weighted score: ${eval2Res.body.data.evaluation.total_score}%`);

    // 6. Evaluator views application evaluations
    logger.info('6. Evaluator querying application evaluations...');
    const listEvalsRes = await request('GET', `/api/v1/applications/${application.id}/evaluations`, null, eval1Token);
    if (listEvalsRes.statusCode !== 200 || listEvalsRes.body.data.evaluations.length !== 1) {
      throw new Error(`List evals failed: ${JSON.stringify(listEvalsRes)}`);
    }
    logger.info('✅ Evaluator isolated to viewing own score sheet');

    // 7. Government views Challenge Evaluation Summary (Aggregated)
    logger.info('7. Government querying aggregated Challenge Evaluation Summary...');
    const sumRes = await request('GET', `/api/v1/challenges/${challenge.id}/evaluation-summary`, null, govToken);
    if (sumRes.statusCode !== 200 || !sumRes.body.data.ranked_applications) {
      throw new Error(`Summary failed: ${JSON.stringify(sumRes)}`);
    }
    const topApp = sumRes.body.data.ranked_applications[0];
    // (86.0 + 83.5) / 2 = 84.75
    if (topApp.average_scores.overall_total !== 84.75 || topApp.evaluation_count !== 2) {
      throw new Error(`Expected avg overall 84.75 with 2 evals, got: ${JSON.stringify(topApp)}`);
    }
    logger.info(`✅ Challenge evaluation summary aggregated successfully: Rank 1 avg total = ${topApp.average_scores.overall_total}% across ${topApp.evaluation_count} independent evaluations`);

    logger.info('🎉 All Phase 6 Tests Passed Successfully!');
  } catch (error) {
    logger.error('❌ Phase 6 Test Failed:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
};

runPhase6Tests();
