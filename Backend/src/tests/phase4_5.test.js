import http from 'http';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

const runPhase45Tests = async () => {
  logger.info('🧪 Starting Phase 4 & 5 (Startups, Verification, Matching & Applications) Tests...');

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

    // 1. Setup Admin, Department & Government User
    const adminReg = await request('POST', '/api/v1/auth/register', {
      name: 'Admin P4',
      email: `admin.p4.${timestamp}@setugov.in`,
      password: 'AdminPassword123!',
      role: 'ADMIN'
    });
    const adminToken = adminReg.body.data.token;

    const depRes = await request('POST', '/api/v1/departments', {
      name: `Dept of Health P4 ${timestamp}`,
      state: 'Karnataka',
      contact_email: `health.p4.${timestamp}@gov.in`
    }, adminToken);
    const department = depRes.body.data.department;

    const govReg = await request('POST', '/api/v1/auth/register', {
      name: 'Dr. Ramesh Kumar',
      email: `ramesh.p4.${timestamp}@health.gov.in`,
      password: 'GovPassword123!',
      role: 'GOVERNMENT',
      department_id: department.id
    });
    const govToken = govReg.body.data.token;

    // 2. Create and Publish Challenge
    const challengeRes = await request('POST', '/api/v1/challenges', {
      title: 'Hospital Waiting Time Reduction Pilot',
      problem_description: 'Overcrowding in OPD triage causing patient wait times of 90 minutes.',
      current_baseline: 'Average OPD wait time is 90 minutes with severe peak load bottlenecks.',
      desired_outcome: 'Reduce average OPD wait time to 60 minutes with smart digital tokens.',
      location: 'Victoria Hospital, Bangalore',
      budget_min: 200000,
      budget_max: 400000,
      pilot_duration_days: 60,
      required_technologies: ['AI Queue Management', 'Predictive Analytics', 'Computer Vision', 'HL7/FHIR']
    }, govToken);
    const challenge = challengeRes.body.data.challenge;

    await request('POST', `/api/v1/challenges/${challenge.id}/publish`, null, govToken);
    logger.info(`✅ Challenge published: ${challenge.title} (${challenge.id})`);

    // 3. Register Startup 1: MediQueue AI
    logger.info('3. Registering Startup 1 (MediQueue AI)...');
    const s1UserRes = await request('POST', '/api/v1/auth/register', {
      name: 'Vikas Sharma',
      email: `vikas.${timestamp}@mediqueue.ai`,
      password: 'StartupPassword123!',
      role: 'STARTUP'
    });
    const s1Token = s1UserRes.body.data.token;

    const s1ProfileRes = await request('POST', '/api/v1/startups', {
      company_name: 'MediQueue Technologies Pvt Ltd',
      description: 'AI-driven queue management, dynamic OPD token dispatch, and patient flow intelligence for government hospitals.',
      domain: 'Healthcare',
      technologies: ['AI Queue Management', 'Predictive Analytics', 'Computer Vision', 'HL7/FHIR', 'React'],
      readiness_level: 8,
      years_experience: 4,
      previous_deployments: 3,
      location: 'Bangalore, Karnataka'
    }, s1Token);
    if (s1ProfileRes.statusCode !== 201 || !s1ProfileRes.body.data.startup) {
      throw new Error(`Startup 1 profile creation failed: ${JSON.stringify(s1ProfileRes)}`);
    }
    const startup1 = s1ProfileRes.body.data.startup;
    logger.info(`✅ Startup 1 created: ${startup1.company_name} (TRL ${startup1.readiness_level})`);

    // 4. Upload Startup Document
    logger.info('4. Uploading DPIIT Recognition Certificate...');
    const docRes = await request('POST', `/api/v1/startups/${startup1.id}/documents`, {
      document_type: 'DPIIT_RECOGNITION',
      document_url: 'https://storage.setugov.in/docs/mediqueue-dpiit.pdf'
    }, s1Token);
    if (docRes.statusCode !== 201) {
      throw new Error(`Document upload failed: ${JSON.stringify(docRes)}`);
    }
    logger.info('✅ Document uploaded for startup');

    // 5. Government Official verifies Startup 1
    logger.info('5. Government Official verifying startup...');
    const verifyRes = await request('PATCH', `/api/v1/startups/${startup1.id}/verification`, {
      verification_status: 'VERIFIED',
      comments: 'DPIIT certificate verified and active healthcare pilot references confirmed.'
    }, govToken);
    if (verifyRes.statusCode !== 200 || verifyRes.body.data.startup.verification_status !== 'VERIFIED') {
      throw new Error(`Startup verification failed: ${JSON.stringify(verifyRes)}`);
    }
    logger.info(`✅ Startup verified: status=${verifyRes.body.data.startup.verification_status}`);

    // 6. Run Matching Engine (Phase 5)
    logger.info('6. Running pgvector + 5-factor weighted matching algorithm...');
    const matchRes = await request('POST', `/api/v1/challenges/${challenge.id}/match`, null, govToken);
    if (matchRes.statusCode !== 200 || !Array.isArray(matchRes.body.data.matches)) {
      throw new Error(`Matching failed: ${JSON.stringify(matchRes)}`);
    }
    const topMatch = matchRes.body.data.matches[0];
    logger.info(`✅ Matching completed. Top ranked startup: ${topMatch.startup.company_name} with Overall Score: ${topMatch.overall_score}%`);
    logger.info(`   Breakdown -> Tech: ${topMatch.technology_score}%, Domain: ${topMatch.domain_score}%, Readiness: ${topMatch.readiness_score}%, Exp: ${topMatch.experience_score}%, Dep: ${topMatch.deployment_score}%`);

    // 7. Get Specific Match Score
    logger.info('7. Fetching specific match score record...');
    const specMatchRes = await request('GET', `/api/v1/challenges/${challenge.id}/matches/${startup1.id}`, null, govToken);
    if (specMatchRes.statusCode !== 200 || specMatchRes.body.data.match.overall_score !== topMatch.overall_score) {
      throw new Error(`Get specific match failed: ${JSON.stringify(specMatchRes)}`);
    }
    logger.info('✅ Specific match score retrieved with full AI reasoning breakdown');

    // 8. Startup 1 submits Application for Challenge
    logger.info('8. Startup 1 submitting proposal/application...');
    const appRes = await request('POST', `/api/v1/challenges/${challenge.id}/applications`, {
      proposal: 'Automated Hospital Queue and Triage Orchestration Pilot Deployment for OPD.',
      technical_approach: 'Deploying edge cameras for real-time wait estimation, QR/Kiosk token generation, and doctor consultation load balancing.',
      expected_impact: 'Expected reduction of patient waiting time from 90 minutes to under 55 minutes within 60 days.',
      estimated_cost: 380000,
      timeline: '60 days in 3 milestone sprints',
      status: 'SUBMITTED'
    }, s1Token);
    if (appRes.statusCode !== 201 || !appRes.body.data.application) {
      throw new Error(`Application submission failed: ${JSON.stringify(appRes)}`);
    }
    const application = appRes.body.data.application;
    logger.info(`✅ Application submitted: "${application.proposal.substring(0, 40)}..." (status: ${application.status})`);

    // 9. Test Duplicate Application Rejection (409 Conflict)
    logger.info('9. Testing duplicate application rejection...');
    const dupAppRes = await request('POST', `/api/v1/challenges/${challenge.id}/applications`, {
      proposal: 'Another attempt for same challenge with sufficient proposal length.',
      technical_approach: 'Comprehensive technical approach for duplicate validation test.',
      expected_impact: 'Expected significant reduction in waiting times for outpatient care.',
      estimated_cost: 350000,
      timeline: '60 days in 3 milestone phases'
    }, s1Token);
    if (dupAppRes.statusCode !== 409) {
      throw new Error(`Duplicate application expected 409, got: ${JSON.stringify(dupAppRes)}`);
    }
    logger.info('✅ Duplicate application properly prevented with 409 Conflict');

    // 10. Government shortlists Application
    logger.info('10. Government shortlisting application...');
    const statusRes = await request('PATCH', `/api/v1/applications/${application.id}/status`, {
      status: 'SHORTLISTED',
      reason: 'Meets all technical criteria and high technology match score.'
    }, govToken);
    if (statusRes.statusCode !== 200 || statusRes.body.data.application.status !== 'SHORTLISTED') {
      throw new Error(`Shortlist application failed: ${JSON.stringify(statusRes)}`);
    }
    logger.info(`✅ Application transitioned to SHORTLISTED`);

    logger.info('🎉 All Phase 4 & 5 Tests Passed Successfully!');
  } catch (error) {
    logger.error('❌ Phase 4 & 5 Test Failed:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
};

runPhase45Tests();
