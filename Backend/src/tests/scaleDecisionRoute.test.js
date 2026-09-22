import assert from 'assert';
import http from 'http';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';

const generateToken = (payload) =>
  jwt.sign(
    { userId: payload.id, role: payload.role, email: payload.email, ...payload },
    config.JWT_SECRET,
    { expiresIn: '1h' }
  );

async function runScaleDecisionRouteTests() {
  console.log('================================================================');
  console.log('⚖️  RUNNING SCALE DECISION ROUTE (TASK 2) HTTP INTEGRATION TESTS');
  console.log('================================================================');

  const suffix = Date.now();
  const password_hash = await bcrypt.hash('Password123!', 10);

  // Spin up test server on dynamic port
  const app = createApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let deptA, deptB;
  let adminUser, govUserA, govUserB, startupUser, evalUser;
  let adminToken, govTokenA, govTokenB, startupToken, evalToken;
  let startup;
  let challengeA, challengeB;
  let appA1, appA2, appA3, appB;
  let pilotScale, pilotExtend, pilotStop, pilotNoValidation, pilotFailedValidation;

  try {
    // 1. Departments
    deptA = await prisma.department.create({
      data: {
        name: `Scale Route Dept A ${suffix}`,
        state: 'Maharashtra',
        contact_email: `scale_dept_a_${suffix}@gov.in`,
        department_code: `SDA_${suffix}`
      }
    });

    deptB = await prisma.department.create({
      data: {
        name: `Scale Route Dept B ${suffix}`,
        state: 'Karnataka',
        contact_email: `scale_dept_b_${suffix}@gov.in`,
        department_code: `SDB_${suffix}`
      }
    });

    // 2. Users & Tokens
    adminUser = await prisma.user.create({
      data: {
        email: `scale_admin_${suffix}@setugov.in`,
        password_hash,
        name: 'System Admin',
        role: 'ADMIN',
        is_active: true,
        is_verified: true
      }
    });
    adminToken = generateToken(adminUser);

    govUserA = await prisma.user.create({
      data: {
        email: `scale_gov_a_${suffix}@gov.in`,
        password_hash,
        name: 'Officer Dept A',
        role: 'GOVERNMENT',
        department_id: deptA.id,
        is_active: true,
        is_verified: true
      }
    });
    govTokenA = generateToken(govUserA);

    govUserB = await prisma.user.create({
      data: {
        email: `scale_gov_b_${suffix}@gov.in`,
        password_hash,
        name: 'Officer Dept B',
        role: 'GOVERNMENT',
        department_id: deptB.id,
        is_active: true,
        is_verified: true
      }
    });
    govTokenB = generateToken(govUserB);

    startupUser = await prisma.user.create({
      data: {
        email: `scale_startup_${suffix}@startup.in`,
        password_hash,
        name: 'Startup Founder',
        role: 'STARTUP',
        is_active: true,
        is_verified: true
      }
    });
    startupToken = generateToken(startupUser);

    evalUser = await prisma.user.create({
      data: {
        email: `scale_eval_${suffix}@eval.in`,
        password_hash,
        name: 'Evaluator User',
        role: 'EVALUATOR',
        is_active: true,
        is_verified: true
      }
    });
    evalToken = generateToken(evalUser);

    // 3. Startup
    startup = await prisma.startup.create({
      data: {
        user_id: startupUser.id,
        company_name: `AgriScale Systems ${suffix}`,
        description: 'Automated Grain Sorting',
        domain: 'AgriTech',
        technologies: ['ComputerVision', 'IoT'],
        readiness_level: 3,
        location: 'Pune',
        verification_status: 'VERIFIED',
        verification_source: 'SELF_DECLARED'
      }
    });

    // 4. Challenges
    challengeA = await prisma.challenge.create({
      data: {
        department_id: deptA.id,
        created_by: govUserA.id,
        title: `Grain AI Challenge ${suffix}`,
        problem_description: 'Quality sorting inefficiency at mandis',
        current_baseline: 'Manual visual inspection leads to 20% waste',
        desired_outcome: '98% automated grading accuracy',
        location: 'Pune',
        budget_min: 100000,
        budget_max: 800000,
        pilot_duration_days: 120,
        required_technologies: ['ComputerVision'],
        status: 'PILOT'
      }
    });

    challengeB = await prisma.challenge.create({
      data: {
        department_id: deptB.id,
        created_by: govUserB.id,
        title: `Karnataka Urban Challenge ${suffix}`,
        problem_description: 'Traffic bottlenecks',
        current_baseline: 'Static signals',
        desired_outcome: 'Adaptive signaling',
        location: 'Bengaluru',
        budget_min: 200000,
        budget_max: 900000,
        pilot_duration_days: 90,
        required_technologies: ['IoT'],
        status: 'PILOT'
      }
    });

    // 5. Applications
    appA1 = await prisma.application.create({
      data: {
        challenge_id: challengeA.id,
        startup_id: startup.id,
        proposal: 'Grain Sorting Pilot Scale',
        technical_approach: 'High speed camera belts with edge inference',
        expected_impact: '98% sorting accuracy',
        estimated_cost: 400000,
        timeline: '4 months',
        status: 'SELECTED'
      }
    });

    // 6. Pilot 1: Eligible for SCALE (in VALIDATION state with VALIDATED status)
    pilotScale = await prisma.pilot.create({
      data: {
        challenge_id: challengeA.id,
        startup_id: startup.id,
        location: 'Pune',
        status: 'VALIDATION',
        budget: 400000,
        start_date: new Date(),
        end_date: new Date(Date.now() + 90 * 86400000),
        overall_score: 94.5
      }
    });

    await prisma.validation.create({
      data: {
        pilot_id: pilotScale.id,
        validator_id: evalUser.id,
        performance_score: 95.0,
        kpi_achievement_score: 94.0,
        evidence_quality_score: 96.0,
        technical_stability_score: 95.0,
        user_satisfaction_score: 93.0,
        comments: 'Outstanding pilot performance exceeding all KPIs.',
        status: 'VALIDATED'
      }
    });

    // 7. Pilot 2: Eligible for EXTEND (in VALIDATION state with VALIDATED status)
    pilotExtend = await prisma.pilot.create({
      data: {
        challenge_id: challengeA.id,
        startup_id: startup.id,
        location: 'Pune',
        status: 'VALIDATION',
        budget: 350000,
        start_date: new Date(),
        end_date: new Date(Date.now() + 60 * 86400000),
        overall_score: 78.0
      }
    });

    await prisma.validation.create({
      data: {
        pilot_id: pilotExtend.id,
        validator_id: evalUser.id,
        performance_score: 78.0,
        kpi_achievement_score: 80.0,
        evidence_quality_score: 76.0,
        technical_stability_score: 77.0,
        user_satisfaction_score: 79.0,
        comments: 'Solid progress but needs extended trial period.',
        status: 'VALIDATED'
      }
    });

    // 8. Pilot 3: Eligible for STOP (in VALIDATION state with VALIDATED status)
    pilotStop = await prisma.pilot.create({
      data: {
        challenge_id: challengeA.id,
        startup_id: startup.id,
        location: 'Pune',
        status: 'VALIDATION',
        budget: 200000,
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 86400000),
        overall_score: 42.0
      }
    });

    await prisma.validation.create({
      data: {
        pilot_id: pilotStop.id,
        validator_id: evalUser.id,
        performance_score: 42.0,
        kpi_achievement_score: 40.0,
        evidence_quality_score: 45.0,
        technical_stability_score: 41.0,
        user_satisfaction_score: 42.0,
        comments: 'Pilot failed to meet operational thresholds.',
        status: 'NOT_VALIDATED'
      }
    });

    // 9. Pilot 4: Missing Validation (Not eligible)
    pilotNoValidation = await prisma.pilot.create({
      data: {
        challenge_id: challengeA.id,
        startup_id: startup.id,
        location: 'Pune',
        status: 'VALIDATION',
        budget: 250000,
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 86400000),
        overall_score: 50.0
      }
    });

    // 10. Pilot 5: Failed Validation but trying SCALE
    pilotFailedValidation = await prisma.pilot.create({
      data: {
        challenge_id: challengeA.id,
        startup_id: startup.id,
        location: 'Pune',
        status: 'VALIDATION',
        budget: 200000,
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 86400000),
        overall_score: 30.0
      }
    });

    await prisma.validation.create({
      data: {
        pilot_id: pilotFailedValidation.id,
        validator_id: evalUser.id,
        performance_score: 30.0,
        kpi_achievement_score: 25.0,
        evidence_quality_score: 35.0,
        technical_stability_score: 30.0,
        user_satisfaction_score: 30.0,
        comments: 'Critical performance deficiencies observed.',
        status: 'NOT_VALIDATED'
      }
    });

    console.log('\n--- TEST SUITE EXECUTION ---');

    // -------------------------------------------------------------------------
    // TEST 1: Reachability & Invalid Pilot ID -> 404
    // -------------------------------------------------------------------------
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    const invalidIdRes = await fetch(`${baseUrl}/api/v1/pilots/${fakeUuid}/scale-decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${govTokenA}`
      },
      body: JSON.stringify({
        decision: 'SCALE',
        reasoning: 'Testing non-existent pilot identifier should return 404.'
      })
    });
    assert.strictEqual(invalidIdRes.status, 404, 'Invalid pilot ID must return 404 Not Found');
    console.log('✅ TEST 1: Invalid pilot ID returned 404 Not Found');

    // -------------------------------------------------------------------------
    // TEST 2: Anonymous user -> 401 Unauthorized
    // -------------------------------------------------------------------------
    const anonRes = await fetch(`${baseUrl}/api/v1/pilots/${pilotScale.id}/scale-decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision: 'SCALE',
        reasoning: 'Anonymous user attempt to finalize scale decision.'
      })
    });
    assert.strictEqual(anonRes.status, 401, 'Anonymous request must return 401 Unauthorized');
    console.log('✅ TEST 2: Anonymous user rejected with 401 Unauthorized');

    // -------------------------------------------------------------------------
    // TEST 3: Startup user -> 403 Forbidden
    // -------------------------------------------------------------------------
    const startupRes = await fetch(`${baseUrl}/api/v1/pilots/${pilotScale.id}/scale-decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${startupToken}`
      },
      body: JSON.stringify({
        decision: 'SCALE',
        reasoning: 'Startup user attempt to finalize own scale decision.'
      })
    });
    assert.strictEqual(startupRes.status, 403, 'Startup user must return 403 Forbidden');
    console.log('✅ TEST 3: Startup user rejected with 403 Forbidden');

    // -------------------------------------------------------------------------
    // TEST 4: Evaluator user -> 403 Forbidden
    // -------------------------------------------------------------------------
    const evalRes = await fetch(`${baseUrl}/api/v1/pilots/${pilotScale.id}/scale-decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${evalToken}`
      },
      body: JSON.stringify({
        decision: 'SCALE',
        reasoning: 'Evaluator user attempt to finalize scale decision.'
      })
    });
    assert.strictEqual(evalRes.status, 403, 'Evaluator user must return 403 Forbidden');
    console.log('✅ TEST 4: Evaluator user rejected with 403 Forbidden');

    // -------------------------------------------------------------------------
    // TEST 5: Government officer outside authorized department -> 403 Forbidden
    // -------------------------------------------------------------------------
    const outsideGovRes = await fetch(`${baseUrl}/api/v1/pilots/${pilotScale.id}/scale-decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${govTokenB}`
      },
      body: JSON.stringify({
        decision: 'SCALE',
        reasoning: 'Officer Dept B attempting to scale Dept A pilot.'
      })
    });
    assert.strictEqual(outsideGovRes.status, 403, 'Officer outside department must return 403 Forbidden');
    console.log('✅ TEST 5: Government officer outside department rejected with 403 Forbidden');

    // -------------------------------------------------------------------------
    // TEST 6: Invalid decision string -> 400 Bad Request
    // -------------------------------------------------------------------------
    const invalidDecRes = await fetch(`${baseUrl}/api/v1/pilots/${pilotScale.id}/scale-decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${govTokenA}`
      },
      body: JSON.stringify({
        decision: 'MAYBE_SCALE',
        reasoning: 'Invalid decision string provided.'
      })
    });
    assert.ok(
      invalidDecRes.status === 400 || invalidDecRes.status === 422,
      `Invalid decision enum must return 400 or 422, got ${invalidDecRes.status}`
    );
    console.log(`✅ TEST 6: Invalid decision enum rejected with ${invalidDecRes.status}`);

    // -------------------------------------------------------------------------
    // TEST 7: Reasoning too short -> 400 or 422
    // -------------------------------------------------------------------------
    const shortReasoningRes = await fetch(`${baseUrl}/api/v1/pilots/${pilotScale.id}/scale-decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${govTokenA}`
      },
      body: JSON.stringify({
        decision: 'SCALE',
        reasoning: 'Short'
      })
    });
    assert.ok(
      shortReasoningRes.status === 400 || shortReasoningRes.status === 422,
      `Reasoning under 10 chars must return 400 or 422, got ${shortReasoningRes.status}`
    );
    console.log(`✅ TEST 7: Short reasoning rejected with ${shortReasoningRes.status}`);

    // -------------------------------------------------------------------------
    // TEST 8: Missing Validation -> 400 Bad Request
    // -------------------------------------------------------------------------
    const noValRes = await fetch(`${baseUrl}/api/v1/pilots/${pilotNoValidation.id}/scale-decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${govTokenA}`
      },
      body: JSON.stringify({
        decision: 'SCALE',
        reasoning: 'Attempting scale decision on pilot with no validation report.'
      })
    });
    assert.strictEqual(noValRes.status, 400, 'Missing validation record must return 400 Bad Request');
    console.log('✅ TEST 8: Pilot without validation report rejected with 400 Bad Request');

    // -------------------------------------------------------------------------
    // TEST 9: Failed Validation trying to SCALE -> 400 Bad Request
    // -------------------------------------------------------------------------
    const failedValRes = await fetch(`${baseUrl}/api/v1/pilots/${pilotFailedValidation.id}/scale-decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${govTokenA}`
      },
      body: JSON.stringify({
        decision: 'SCALE',
        reasoning: 'Attempting to scale a pilot that failed validation.'
      })
    });
    assert.strictEqual(failedValRes.status, 400, 'Failed validation cannot SCALE, must return 400 Bad Request');
    console.log('✅ TEST 9: Failed validation cannot SCALE (rejected with 400 Bad Request)');

    // -------------------------------------------------------------------------
    // TEST 10: Authorized Government Officer -> SCALE Success (201 Created)
    // -------------------------------------------------------------------------
    const scaleRes = await fetch(`${baseUrl}/api/v1/pilots/${pilotScale.id}/scale-decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${govTokenA}`
      },
      body: JSON.stringify({
        decision: 'SCALE',
        reasoning: 'Exceptional sorting accuracy of 95% verified by third party evaluation. Authorized for state-wide mandi procurement.'
      })
    });
    assert.strictEqual(scaleRes.status, 201, 'Authorized SCALE decision must return 201 Created');
    const scaleData = await scaleRes.json();
    assert.strictEqual(scaleData.success, true);
    assert.strictEqual(scaleData.data.scaleDecision.decision, 'SCALE');
    assert.strictEqual(scaleData.data.scaleDecision.status, 'FINALIZED');

    // Verify DB pilot status transitioned to SCALED
    const updatedPilotScale = await prisma.pilot.findUnique({ where: { id: pilotScale.id } });
    assert.strictEqual(updatedPilotScale.status, 'SCALED', 'Pilot status must transition to SCALED');

    // Verify challenge status transitioned to COMPLETED
    const updatedChallengeA = await prisma.challenge.findUnique({ where: { id: challengeA.id } });
    assert.strictEqual(updatedChallengeA.status, 'COMPLETED', 'Challenge status must transition to COMPLETED');

    // Verify audit log created
    const auditLogScale = await prisma.auditLog.findFirst({
      where: {
        entity_type: 'PILOT',
        entity_id: pilotScale.id,
        action: 'SCALE_DECISION_SCALE'
      }
    });
    assert(auditLogScale, 'AuditLog SCALE_DECISION_SCALE must be created');
    console.log('✅ TEST 10: Authorized SCALE decision executed: Pilot -> SCALED, Challenge -> COMPLETED, AuditLog recorded');

    // -------------------------------------------------------------------------
    // TEST 11: Duplicate finalized decision rejected -> 400 Bad Request
    // -------------------------------------------------------------------------
    const duplicateRes = await fetch(`${baseUrl}/api/v1/pilots/${pilotScale.id}/scale-decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${govTokenA}`
      },
      body: JSON.stringify({
        decision: 'SCALE',
        reasoning: 'Duplicate scale decision attempt on already finalized pilot.'
      })
    });
    assert.strictEqual(duplicateRes.status, 400, 'Duplicate finalized decision must return 400 Bad Request');
    console.log('✅ TEST 11: Duplicate scale decision correctly blocked (400 Bad Request)');

    // -------------------------------------------------------------------------
    // TEST 12: Authorized Government Officer -> EXTEND Success (201 Created)
    // -------------------------------------------------------------------------
    const extendRes = await fetch(`${baseUrl}/api/v1/pilots/${pilotExtend.id}/scale-decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${govTokenA}`
      },
      body: JSON.stringify({
        decision: 'EXTEND',
        reasoning: 'Good progress but requires 30 days additional test run under summer climate conditions.'
      })
    });
    assert.strictEqual(extendRes.status, 201, 'Authorized EXTEND decision must return 201 Created');
    const updatedPilotExtend = await prisma.pilot.findUnique({ where: { id: pilotExtend.id } });
    assert.strictEqual(updatedPilotExtend.status, 'EXTENDED', 'Pilot status must transition to EXTENDED');
    console.log('✅ TEST 12: Authorized EXTEND decision executed: Pilot -> EXTENDED');

    // -------------------------------------------------------------------------
    // TEST 13: Authorized Government Officer -> STOP Success (201 Created)
    // -------------------------------------------------------------------------
    const stopRes = await fetch(`${baseUrl}/api/v1/pilots/${pilotStop.id}/scale-decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${govTokenA}`
      },
      body: JSON.stringify({
        decision: 'STOP',
        reasoning: 'Critical performance criteria not satisfied. Discontinuing pilot deployment.'
      })
    });
    assert.strictEqual(stopRes.status, 201, 'Authorized STOP decision must return 201 Created');
    const updatedPilotStop = await prisma.pilot.findUnique({ where: { id: pilotStop.id } });
    assert.strictEqual(updatedPilotStop.status, 'STOPPED', 'Pilot status must transition to STOPPED');
    console.log('✅ TEST 13: Authorized STOP decision executed: Pilot -> STOPPED');

    // -------------------------------------------------------------------------
    // TEST 14: ADMIN user authorized access
    // -------------------------------------------------------------------------
    // Create Pilot 6 in VALIDATION
    const pilotAdmin = await prisma.pilot.create({
      data: {
        challenge_id: challengeA.id,
        startup_id: startup.id,
        location: 'Pune',
        status: 'VALIDATION',
        budget: 300000,
        start_date: new Date(),
        end_date: new Date(Date.now() + 60 * 86400000),
        overall_score: 92.0
      }
    });

    await prisma.validation.create({
      data: {
        pilot_id: pilotAdmin.id,
        validator_id: evalUser.id,
        performance_score: 92.0,
        kpi_achievement_score: 91.0,
        evidence_quality_score: 93.0,
        technical_stability_score: 92.0,
        user_satisfaction_score: 92.0,
        comments: 'Verified by evaluator with excellent performance.',
        status: 'VALIDATED'
      }
    });

    const adminRes = await fetch(`${baseUrl}/api/v1/pilots/${pilotAdmin.id}/scale-decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        decision: 'SCALE',
        reasoning: 'System Administrator executive scale override following verified audit.'
      })
    });
    assert.strictEqual(adminRes.status, 201, 'Admin user must be authorized to finalize scale decision');
    console.log('✅ TEST 14: Administrator successfully finalized scale decision (201 Created)');

    // -------------------------------------------------------------------------
    // TEST 15: GET /api/v1/pilots/:id/scale-decision
    // -------------------------------------------------------------------------
    const getDecisionRes = await fetch(`${baseUrl}/api/v1/pilots/${pilotScale.id}/scale-decision`, {
      headers: { Authorization: `Bearer ${govTokenA}` }
    });
    assert.strictEqual(getDecisionRes.status, 200, 'GET scale decision must return 200 OK');
    const getDecisionData = await getDecisionRes.json();
    assert.strictEqual(getDecisionData.data.scaleDecision.decision, 'SCALE');
    assert.strictEqual(getDecisionData.data.scaleDecision.approver.name, 'Officer Dept A');
    console.log('✅ TEST 15: GET scale decision successfully retrieved decision and approver details');

    console.log('\n================================================================');
    console.log('🎉 ALL SCALE DECISION ROUTE TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('================================================================');
  } finally {
    // Teardown test entities
    try {
      if (pilotScale) await prisma.scaleDecision.deleteMany({ where: { pilot_id: pilotScale.id } }).catch(() => null);
      if (pilotExtend) await prisma.scaleDecision.deleteMany({ where: { pilot_id: pilotExtend.id } }).catch(() => null);
      if (pilotStop) await prisma.scaleDecision.deleteMany({ where: { pilot_id: pilotStop.id } }).catch(() => null);
      await prisma.scaleDecision.deleteMany({ where: { pilot: { startup_id: startup?.id } } }).catch(() => null);
      await prisma.validation.deleteMany({ where: { pilot: { startup_id: startup?.id } } }).catch(() => null);
      await prisma.auditLog.deleteMany({ where: { user_id: { in: [govUserA?.id, govUserB?.id, adminUser?.id].filter(Boolean) } } }).catch(() => null);
      await prisma.notification.deleteMany({ where: { user_id: { in: [startupUser?.id, govUserA?.id].filter(Boolean) } } }).catch(() => null);
      await prisma.pilot.deleteMany({ where: { startup_id: startup?.id } }).catch(() => null);
      if (appA1) await prisma.application.delete({ where: { id: appA1.id } }).catch(() => null);
      if (challengeA) await prisma.challenge.delete({ where: { id: challengeA.id } }).catch(() => null);
      if (challengeB) await prisma.challenge.delete({ where: { id: challengeB.id } }).catch(() => null);
      if (startup) await prisma.startup.delete({ where: { id: startup.id } }).catch(() => null);
      if (adminUser) await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => null);
      if (govUserA) await prisma.user.delete({ where: { id: govUserA.id } }).catch(() => null);
      if (govUserB) await prisma.user.delete({ where: { id: govUserB.id } }).catch(() => null);
      if (startupUser) await prisma.user.delete({ where: { id: startupUser.id } }).catch(() => null);
      if (evalUser) await prisma.user.delete({ where: { id: evalUser.id } }).catch(() => null);
      if (deptA) await prisma.department.delete({ where: { id: deptA.id } }).catch(() => null);
      if (deptB) await prisma.department.delete({ where: { id: deptB.id } }).catch(() => null);
    } catch {
      // Ignore cleanup error
    }
    server.close();
  }
}

runScaleDecisionRouteTests().catch((err) => {
  console.error('❌ Scale decision route test failure:', err);
  process.exit(1);
});
