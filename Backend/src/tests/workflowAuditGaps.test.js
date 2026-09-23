import assert from 'node:assert';
import { prisma } from '../config/prisma.js';
import * as applicationService from '../services/applicationService.js';
import * as pilotService from '../services/pilotService.js';
import * as scaleDecisionService from '../services/scaleDecisionService.js';
import * as evaluatorPoolService from '../services/evaluatorPoolService.js';
import * as aiService from '../services/aiService.js';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000/api/v1';

async function runAuditGapsTests() {
  console.log('===============================================================');
  console.log('🧪 RUNNING WORKFLOW AUDIT GAPS VERIFICATION SUITE');
  console.log('===============================================================');

  const timestamp = Date.now();
  let dept, govUser, startupUser1, startup1, startupUser2, startup2, evalUser1, evalUser2, challenge;
  let challengeCap, startupUser3, startup3, appCap3;
  let passed = 0;
  let failed = 0;

  try {
    // -------------------------------------------------------------------------
    // Setup Test Data
    // -------------------------------------------------------------------------
    console.log('\n[Setup] Creating test users, department, and challenge...');
    dept = await prisma.department.create({
      data: {
        name: `Audit Dept ${timestamp}`,
        department_code: `AUDIT_${timestamp}`,
        state: 'Maharashtra',
        contact_email: `audit_dept_${timestamp}@gov.in`,
      },
    });

    govUser = await prisma.user.create({
      data: {
        email: `gov_audit_${timestamp}@gov.in`,
        name: 'Audit Gov Officer',
        password_hash: 'hash',
        role: 'GOVERNMENT',
        department_id: dept.id,
      },
    });

    startupUser1 = await prisma.user.create({
      data: {
        email: `startup1_audit_${timestamp}@startup.in`,
        name: 'Audit Startup 1 Founder',
        password_hash: 'hash',
        role: 'STARTUP',
      },
    });

    startup1 = await prisma.startup.create({
      data: {
        user_id: startupUser1.id,
        company_name: `AuditTech One ${timestamp}`,
        description: 'AI Vision for Civic Sanitation',
        domain: 'SANITATION',
        technologies: ['AI', 'Computer Vision'],
        location: 'Mumbai',
      },
    });

    startupUser2 = await prisma.user.create({
      data: {
        email: `startup2_audit_${timestamp}@startup.in`,
        name: 'Audit Startup 2 Founder',
        password_hash: 'hash',
        role: 'STARTUP',
      },
    });

    startup2 = await prisma.startup.create({
      data: {
        user_id: startupUser2.id,
        company_name: `AuditTech Two ${timestamp}`,
        description: 'IoT Sensors for Civic Sanitation',
        domain: 'SANITATION',
        technologies: ['IoT', 'Edge Computing'],
        location: 'Mumbai',
      },
    });

    evalUser1 = await prisma.user.create({
      data: {
        email: `eval1_audit_${timestamp}@evaluator.in`,
        name: 'Audit Evaluator 1',
        password_hash: 'hash',
        role: 'EVALUATOR',
      },
    });

    evalUser2 = await prisma.user.create({
      data: {
        email: `eval2_audit_${timestamp}@evaluator.in`,
        name: 'Audit Evaluator 2',
        password_hash: 'hash',
        role: 'EVALUATOR',
      },
    });

    challenge = await prisma.challenge.create({
      data: {
        title: `Audit Civic Challenge ${timestamp}`,
        problem_description: 'Automated municipal sorting and validation',
        current_baseline: 'Manual sorting',
        desired_outcome: 'High accuracy classification',
        location: 'Mumbai',
        pilot_location: 'Central Ward',
        budget_min: 500000,
        budget_max: 1500000,
        pilot_duration_days: 90,
        required_technologies: ['AI', 'IoT'],
        department_id: dept.id,
        created_by: govUser.id,
        status: 'EVALUATION',
        required_evaluator_count: 2,
      },
    });
    console.log('[Setup Complete]');

    // -------------------------------------------------------------------------
    // TEST SECTION A4: Evaluator Pool Recruitment Rules
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION A4: Evaluator Pool Recruitment Rules ---');
    try {
      // 1. Setting required_evaluator_count < 2 must be rejected
      let threwMinCount = false;
      try {
        await evaluatorPoolService.updateChallengeEvaluatorRecruitment(
          challenge.id,
          { required_evaluator_count: 1 },
          govUser
        );
      } catch (err) {
        threwMinCount = true;
        assert(err.message.includes('required_evaluator_count must be at least 2') || err.statusCode === 400);
      }
      assert(threwMinCount, 'Rejecting required_evaluator_count < 2 must throw');
      console.log('✅ A4.1: Setting required_evaluator_count < 2 correctly rejected with 400');
      passed++;

      // 2. Closing recruitment with 0 evaluators in pool must be rejected
      let threwCloseEmpty = false;
      try {
        await evaluatorPoolService.closeEvaluatorRecruitment(challenge.id, { override: false }, govUser);
      } catch (err) {
        threwCloseEmpty = true;
        assert(err.message.includes('requires at least 2 evaluators') || err.statusCode === 400);
      }
      assert(threwCloseEmpty, 'Closing recruitment with fewer than 2 evaluators must be rejected');
      console.log('✅ A4.2: Closing recruitment with fewer than 2 evaluators correctly rejected');
      passed++;

      // Add evaluators to pool so subsequent tests have a valid pool
      await prisma.challengeEvaluatorPool.create({
        data: {
          challenge: { connect: { id: challenge.id } },
          evaluator: { connect: { id: evalUser1.id } },
          adder: { connect: { id: govUser.id } },
          source: 'ADMIN_ASSIGNED'
        },
      });
      await prisma.challengeEvaluatorPool.create({
        data: {
          challenge: { connect: { id: challenge.id } },
          evaluator: { connect: { id: evalUser2.id } },
          adder: { connect: { id: govUser.id } },
          source: 'ADMIN_ASSIGNED'
        },
      });
      console.log('✅ A4.3: Evaluator pool successfully populated with 2 evaluators');
      passed++;
    } catch (err) {
      console.error('❌ Section A4 failed:', err);
      failed++;
    }

    // -------------------------------------------------------------------------
    // TEST SECTION A1: Request Changes / Resubmit Loop
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION A1: Request Changes / Resubmit Loop (Step 14) ---');
    let app1;
    try {
      // 1. Create Application 1 in SUBMITTED status
      app1 = await prisma.application.create({
        data: {
          challenge_id: challenge.id,
          startup_id: startup1.id,
          proposal: 'Version 1 of Vision AI sorting',
          technical_approach: 'YOLOv8 on edge devices',
          expected_impact: '70% efficiency boost',
          timeline: '3 months',
          estimated_cost: 600000,
          status: 'SUBMITTED',
        },
      });

      // 2. Evaluator submits evaluation with suggest_changes: true
      const evalRecord = await prisma.evaluation.create({
        data: {
          application_id: app1.id,
          evaluator_id: evalUser1.id,
          technical_score: 72,
          innovation_score: 75,
          impact_score: 72,
          scalability_score: 70,
          cost_score: 68,
          total_score: 71.4,
          is_submitted: true,
          comments: 'Promising concept but hardware specs are underspecified.',
          suggest_changes: true,
          change_suggestion_notes: 'Please provide exact camera frame rate and lens specifications for outdoor use.',
        },
      });
      assert.strictEqual(evalRecord.suggest_changes, true);
      assert.strictEqual(evalRecord.change_suggestion_notes.includes('camera frame rate'), true);
      console.log('✅ A1.1: Evaluator successfully submitted change suggestions on evaluation');
      passed++;

      // 3. Persist AI Proposal Analysis for Brain 3 check
      await prisma.applicationProposalAnalysis.create({
        data: {
          application_id: app1.id,
          executive_summary: 'Preliminary AI Advisory summary',
          technical_feasibility: 'Feasible with edge hardware',
          innovation: 'Moderate innovation with computer vision',
          expected_impact: '70% efficiency boost in sorting',
          scalability: 'Deployable across multiple municipal wards',
          cost_effectiveness: 'Within budget ceiling',
          strengths: ['Good vision model'],
          weaknesses: ['Vague camera specs'],
          risks: ['Dust fouling'],
          missing_information: ['Camera hardware specs'],
          evaluator_questions: ['What is the camera frame rate?'],
        },
      });

      // 4. Government officer requests changes WITHOUT notes -> should reject (400)
      let threwNoNotes = false;
      try {
        await applicationService.updateApplicationStatus(
          app1.id,
          'CHANGES_REQUESTED',
          govUser,
          null,
          ''
        );
      } catch (err) {
        threwNoNotes = true;
        assert(err.message.includes('Notes explaining the requested changes are mandatory') || err.statusCode === 400);
      }
      assert(threwNoNotes, 'Requesting changes without notes must throw BadRequestError');
      console.log('✅ A1.2: Requesting changes without notes correctly rejected with 400');
      passed++;

      // 5. Government officer requests changes WITH notes -> succeeds
      const updatedApp = await applicationService.updateApplicationStatus(
        app1.id,
        'CHANGES_REQUESTED',
        govUser,
        null,
        'Please specify camera model, dust/moisture IP rating, and edge compute board specs.'
      );
      assert.strictEqual(updatedApp.status, 'CHANGES_REQUESTED');
      assert.strictEqual(updatedApp.change_request_notes.includes('IP rating'), true);
      assert(updatedApp.change_requested_at !== null, 'change_requested_at must be populated');
      assert.strictEqual(updatedApp.change_requested_by, govUser.id);
      console.log('✅ A1.3: Government officer requested changes; status set to CHANGES_REQUESTED');
      passed++;

      // 6. Startup edits proposal and resubmits
      const resubmittedApp = await applicationService.updateApplication(
        app1.id,
        {
          proposal: 'Version 2: Vision AI sorting with IP67 Industrial Sony IMX cameras & Jetson AGX Orin.',
          resubmit: true,
        },
        startupUser1
      );
      assert.strictEqual(resubmittedApp.status, 'SUBMITTED', 'Status must return to SUBMITTED upon resubmission');
      console.log('✅ A1.4: Startup successfully resubmitted; status transitioned back to SUBMITTED');
      passed++;

      // 7. Verify ArchivedEvaluation record exists
      const archivedEvals = await prisma.archivedEvaluation.findMany({
        where: { application_id: app1.id },
      });
      assert.strictEqual(archivedEvals.length, 1, 'Exactly 1 evaluation must be archived');
      assert.strictEqual(archivedEvals[0].evaluator_id, evalUser1.id);
      assert.strictEqual(archivedEvals[0].suggest_changes, true);
      console.log('✅ A1.5: Superseded evaluation archived in archived_evaluations table');
      passed++;

      // 8. Verify active evaluations deleted so quorum resets
      const activeEvals = await prisma.evaluation.findMany({
        where: { application_id: app1.id },
      });
      assert.strictEqual(activeEvals.length, 0, 'Active evaluations must be cleared to reset quorum');
      console.log('✅ A1.6: Active evaluations reset to 0/2 for clean re-evaluation quorum');
      passed++;

      // 9. Verify AI Proposal Analysis cleared so Brain 3 can screen fresh submission
      const aiAnalysis = await prisma.applicationProposalAnalysis.findUnique({
        where: { application_id: app1.id },
      });
      assert.strictEqual(aiAnalysis, null, 'AI proposal analysis must be cleared upon resubmission');
      console.log('✅ A1.7: ApplicationProposalAnalysis cleared for re-screening');
      passed++;
    } catch (err) {
      console.error('❌ Section A1 failed:', err);
      failed++;
    }

    // -------------------------------------------------------------------------
    // TEST SECTION A2 & SINGLE-SELECTION LOCK: Pilot STOP & Alternate Selection
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION A2: Pilot STOP Decision & Single Selection Lock ---');
    let app2, pilot1;
    try {
      // 1. Complete evaluation for App 1 so it can be SELECTED
      await prisma.evaluation.create({
        data: {
          application_id: app1.id,
          evaluator_id: evalUser1.id,
          technical_score: 90,
          innovation_score: 92,
          impact_score: 92,
          scalability_score: 88,
          cost_score: 85,
          total_score: 89.4,
          is_submitted: true,
          comments: 'Excellent V2 revision.',
        },
      });
      await prisma.evaluation.create({
        data: {
          application_id: app1.id,
          evaluator_id: evalUser2.id,
          technical_score: 92,
          innovation_score: 90,
          impact_score: 91,
          scalability_score: 90,
          cost_score: 87,
          total_score: 90.0,
          is_submitted: true,
          comments: 'High quality proposal.',
        },
      });

      // Select App 1
      const selectedApp1 = await applicationService.updateApplicationStatus(
        app1.id,
        'SELECTED',
        govUser,
        null,
        null,
        'Executive departmental justification for startup 1 selection'
      );
      assert.strictEqual(selectedApp1.status, 'SELECTED');
      console.log('✅ A2.1: Application 1 successfully SELECTED');
      passed++;

      // 2. Create Application 2 and evaluate it
      app2 = await prisma.application.create({
        data: {
          challenge_id: challenge.id,
          startup_id: startup2.id,
          proposal: 'IoT Ultrasonic and weight monitoring sensors',
          technical_approach: 'LoRaWAN ultrasonic mesh',
          expected_impact: 'Realtime bin fill-level optimization',
          timeline: '2 months',
          estimated_cost: 500000,
          status: 'SUBMITTED',
        },
      });
      await prisma.evaluation.create({
        data: {
          application_id: app2.id,
          evaluator_id: evalUser1.id,
          technical_score: 85,
          innovation_score: 86,
          impact_score: 88,
          scalability_score: 82,
          cost_score: 80,
          total_score: 84.2,
          is_submitted: true,
          comments: 'Solid IoT approach.',
        },
      });
      await prisma.evaluation.create({
        data: {
          application_id: app2.id,
          evaluator_id: evalUser2.id,
          technical_score: 84,
          innovation_score: 85,
          impact_score: 85,
          scalability_score: 86,
          cost_score: 82,
          total_score: 84.4,
          is_submitted: true,
          comments: 'Good feasibility.',
        },
      });

      // 3. Test Single-Selection Lock: Selecting App 2 while App 1 is SELECTED must fail (400)
      let threwDuplicateSelect = false;
      try {
        await applicationService.updateApplicationStatus(
          app2.id,
          'SELECTED',
          govUser,
          null,
          null,
          'Attempting second selection'
        );
      } catch (err) {
        threwDuplicateSelect = true;
        assert(err.message.includes('Another application has already been SELECTED') || err.statusCode === 400);
      }
      assert(threwDuplicateSelect, 'Single-selection lock must reject selecting App 2 while App 1 is SELECTED');
      console.log('✅ A2.2: Single-selection lock strictly enforced: competing SELECTED transition rejected (400)');
      passed++;

      // 4. Create Pilot 1 for App 1
      pilot1 = await pilotService.createPilot(
        {
          challenge_id: challenge.id,
          startup_id: startup1.id,
          location: 'Central Municipal Hub',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          budget: 600000,
        },
        govUser
      );
      assert.strictEqual(pilot1.status, 'PLANNED');
      console.log('✅ A2.3: Pilot 1 created for Application 1');
      passed++;

      // 5. Add validation report for Pilot 1
      await prisma.validation.create({
        data: {
          pilot_id: pilot1.id,
          validator_id: evalUser1.id,
          performance_score: 42.0,
          kpi_achievement_score: 38.0,
          evidence_quality_score: 45.0,
          technical_stability_score: 40.0,
          user_satisfaction_score: 41.0,
          comments: 'Pilot failed to meet municipal sorting accuracy thresholds.',
          status: 'NOT_VALIDATED',
        },
      });

      // 6. Issue STOP Decision on Pilot 1
      const stopDecision = await scaleDecisionService.createScaleDecision(
        pilot1.id,
        {
          decision: 'STOP',
          reasoning: 'Optical camera sensors suffered excessive fouling in humid municipal waste conditions. Terminating pilot.',
        },
        govUser
      );
      assert.strictEqual(stopDecision.decision, 'STOP');
      console.log('✅ A2.4: STOP decision recorded for Pilot 1');
      passed++;

      // 7. Verify Pilot is STOPPED, Challenge is still in PILOT (not COMPLETED), App 1 is REJECTED
      const stoppedPilot = await prisma.pilot.findUnique({ where: { id: pilot1.id } });
      assert.strictEqual(stoppedPilot.status, 'STOPPED', 'Pilot status must transition to STOPPED');

      const activeChallenge = await prisma.challenge.findUnique({ where: { id: challenge.id } });
      assert.strictEqual(activeChallenge.status, 'PILOT', 'Challenge status must remain in PILOT stage');

      const rejectedApp1 = await prisma.application.findUnique({ where: { id: app1.id } });
      assert.strictEqual(rejectedApp1.status, 'REJECTED', 'Failed application must transition to REJECTED');
      console.log('✅ A2.5: Verified pilot -> STOPPED, challenge remains in PILOT, application 1 -> REJECTED');
      passed++;

      // 8. Now select App 2 (Single-selection lock permits it because App 1 is now REJECTED)
      const selectedApp2 = await applicationService.updateApplicationStatus(
        app2.id,
        'SELECTED',
        govUser,
        null,
        null,
        'Executive selection of alternate IoT startup following pilot 1 stop'
      );
      assert.strictEqual(selectedApp2.status, 'SELECTED', 'App 2 can now be selected after App 1 STOP rejection');
      console.log('✅ A2.6: Application 2 successfully selected following Pilot 1 STOP');
      passed++;
    } catch (err) {
      console.error('❌ Section A2 failed:', err);
      failed++;
    }

    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    // TEST SECTION A5: Pilot Cap Per Problem Statement
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION A5: Pilot Cap (Max 2 Active Non-Stopped Pilots) ---');
    try {
      challengeCap = await prisma.challenge.create({
        data: {
          title: `Pilot Cap Test Challenge ${timestamp}`,
          problem_description: 'Test challenge for pilot capacity limits',
          current_baseline: 'Manual baseline',
          desired_outcome: 'Automated outcome',
          location: 'Pune',
          pilot_location: 'Station 1',
          budget_min: 200000,
          budget_max: 800000,
          pilot_duration_days: 60,
          required_technologies: ['IoT'],
          department_id: dept.id,
          created_by: govUser.id,
          status: 'EVALUATION',
          required_evaluator_count: 2,
        },
      });

      // Create pilot A directly in RUNNING state (active count = 1)
      const capPilot1 = await prisma.pilot.create({
        data: {
          challenge_id: challengeCap.id,
          startup_id: startup1.id,
          location: 'Ward 1',
          start_date: new Date(),
          end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          budget: 200000,
          status: 'RUNNING',
        },
      });

      // Create pilot B directly in RUNNING state (active count = 2)
      const capPilot2 = await prisma.pilot.create({
        data: {
          challenge_id: challengeCap.id,
          startup_id: startup2.id,
          location: 'Ward 2',
          start_date: new Date(),
          end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          budget: 250000,
          status: 'RUNNING',
        },
      });

      // Create startup 3 and application in SELECTED status for challengeCap
      startupUser3 = await prisma.user.create({
        data: {
          email: `startup3_audit_${timestamp}@startup.in`,
          name: 'Audit Startup 3 Founder',
          password_hash: 'hash',
          role: 'STARTUP',
        },
      });
      startup3 = await prisma.startup.create({
        data: {
          user_id: startupUser3.id,
          company_name: `AuditTech Three ${timestamp}`,
          description: 'Pilot Cap Startup',
          domain: 'SANITATION',
          technologies: ['IoT'],
          location: 'Pune',
        },
      });
      appCap3 = await prisma.application.create({
        data: {
          challenge_id: challengeCap.id,
          startup_id: startup3.id,
          proposal: 'Cap test proposal',
          technical_approach: 'Cap test approach',
          expected_impact: 'Cap test impact',
          timeline: '1 month',
          estimated_cost: 200000,
          status: 'SELECTED',
        },
      });

      // Attempting to create a 3rd active pilot via pilotService.createPilot must fail with 400
      let threwPilotCap = false;
      try {
        await pilotService.createPilot(
          {
            challenge_id: challengeCap.id,
            startup_id: startup3.id,
            location: 'Ward 3',
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
            budget: 200000,
          },
          govUser
        );
      } catch (err) {
        threwPilotCap = true;
        assert(err.message.includes('already has 2 active or completed pilots') || err.statusCode === 400);
      }
      assert(threwPilotCap, 'Creating 3rd active pilot must throw BadRequestError (cap of 2 enforced)');
      console.log('✅ A5.1: Attempt to exceed 2 active pilots correctly rejected with 400');
      passed++;

      // Stop capPilot1 (status -> STOPPED)
      await prisma.pilot.update({
        where: { id: capPilot1.id },
        data: { status: 'STOPPED' },
      });

      // Now creating the pilot for startup 3 succeeds because stopped pilots are excluded from cap!
      const createdPilotAfterStop = await pilotService.createPilot(
        {
          challenge_id: challengeCap.id,
          startup_id: startup3.id,
          location: 'Ward 3',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          budget: 200000,
        },
        govUser
      );
      assert.strictEqual(createdPilotAfterStop.status, 'PLANNED');
      console.log('✅ A5.2: Pilot successfully created after previous pilot reached STOPPED (stopped pilots excluded from cap)');
      passed++;
      passed++;
    } catch (err) {
      console.error('❌ Section A5 failed:', err);
      failed++;
    }

    // -------------------------------------------------------------------------
    // TEST SECTION A6: Document Download Authentication Defense-in-Depth
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION A6: Document Download Authentication ---');
    try {
      // 1. Unauthenticated GET to root /uploads/:filename -> 401
      const rootRes = await fetch(`${BASE_URL.replace('/api/v1', '')}/uploads/nonexistent-doc.pdf`);
      assert.strictEqual(rootRes.status, 401, 'Anonymous GET /uploads/:filename must return 401');

      // 2. Unauthenticated GET to /uploads/private/:filename -> 401
      const privRes = await fetch(`${BASE_URL.replace('/api/v1', '')}/uploads/private/nonexistent-doc.pdf`);
      assert.strictEqual(privRes.status, 401, 'Anonymous GET /uploads/private/:filename must return 401');

      // 3. Unauthenticated GET to /api/v1/documents/:filename -> 401
      const docRes = await fetch(`${BASE_URL}/documents/nonexistent-doc.pdf`);
      assert.strictEqual(docRes.status, 401, 'Anonymous GET /api/v1/documents/:filename must return 401');

      console.log('✅ A6.1: All document download paths strictly enforce HTTP 401 for anonymous requests');
      passed++;
    } catch (err) {
      console.error('❌ Section A6 failed:', err);
      failed++;
    }

    // -------------------------------------------------------------------------
    // TEST SECTION B2: AI Screening Trigger Restricted to Evaluators
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION B2: AI Proposal Analysis RBAC ---');
    try {
      // 1. Verify that analyzeApplicationProposal throws 403 when called by non-evaluator
      let threwNonEval = false;
      try {
        await aiService.analyzeApplicationProposal(app1.id, govUser);
      } catch (err) {
        threwNonEval = true;
        assert(err.statusCode === 403 || err.message.includes('Only assigned evaluators'));
      }
      assert(threwNonEval, 'Non-evaluator must be rejected from triggering AI analysis with 403');
      console.log('✅ B2.1: Government user strictly blocked from triggering AI proposal analysis (403)');
      passed++;

      // Create an evaluator assignment for evalUser1 so they are authorized
      await prisma.evaluatorAssignment.upsert({
        where: {
          application_id_evaluator_id: {
            application_id: app1.id,
            evaluator_id: evalUser1.id,
          },
        },
        create: {
          application_id: app1.id,
          evaluator_id: evalUser1.id,
          assigned_by: govUser.id,
          status: 'ACCEPTED',
        },
        update: {
          status: 'ACCEPTED',
        },
      });

      // 2. Assigned evaluator CAN trigger AI screening
      const analysisResult = await aiService.analyzeApplicationProposal(app1.id, evalUser1);
      assert(analysisResult, 'Assigned evaluator can run proposal screening');
      assert(analysisResult.executive_summary, 'Analysis executive_summary returned');
      console.log('✅ B2.2: Assigned evaluator successfully triggered AI proposal screening');
      passed++;

      // 3. Read-only GET analysis is accessible to government officer
      const govAdvisoryView = await aiService.getApplicationProposalAnalysis(app1.id, govUser);
      assert(govAdvisoryView, 'Government officer can view AI advisory screening');
      assert(govAdvisoryView.executive_summary, 'Advisory executive_summary returned');
      console.log('✅ B2.3: Government officer successfully accessed read-only advisory analysis');
      passed++;
    } catch (err) {
      console.error('❌ Section B2 failed:', err);
      failed++;
    }

  } finally {
    console.log('\n[Cleanup] Removing test entities...');
    try {
      if (challenge?.id) {
        const pilots = await prisma.pilot.findMany({ where: { challenge_id: challenge.id } });
        const pilotIds = pilots.map((p) => p.id);
        if (pilotIds.length > 0) {
          await prisma.scaleDecision.deleteMany({ where: { pilot_id: { in: pilotIds } } });
          await prisma.validation.deleteMany({ where: { pilot_id: { in: pilotIds } } });
          await prisma.auditLog.deleteMany({ where: { entity_id: { in: pilotIds } } });
          await prisma.pilot.deleteMany({ where: { id: { in: pilotIds } } });
        }

        await prisma.applicationProposalAnalysis.deleteMany({
          where: { application: { challenge_id: challenge.id } },
        });
        await prisma.archivedEvaluation.deleteMany({
          where: { application: { challenge_id: challenge.id } },
        });
        await prisma.evaluation.deleteMany({
          where: { application: { challenge_id: challenge.id } },
        });
        await prisma.evaluatorAssignment.deleteMany({
          where: { application: { challenge_id: challenge.id } },
        });
        await prisma.challengeEvaluatorPool.deleteMany({ where: { challenge_id: challenge.id } });
        await prisma.application.deleteMany({ where: { challenge_id: challenge.id } });
        await prisma.challenge.delete({ where: { id: challenge.id } });
      }

      if (challengeCap?.id) {
        await prisma.pilot.deleteMany({ where: { challenge_id: challengeCap.id } });
        await prisma.application.deleteMany({ where: { challenge_id: challengeCap.id } });
        await prisma.challenge.delete({ where: { id: challengeCap.id } });
      }
      if (startup3?.id) await prisma.startup.delete({ where: { id: startup3.id } });
      if (startupUser3?.id) await prisma.user.delete({ where: { id: startupUser3.id } });

      if (startup1?.id) await prisma.startup.delete({ where: { id: startup1.id } });
      if (startup2?.id) await prisma.startup.delete({ where: { id: startup2.id } });
      if (startupUser1?.id) await prisma.user.delete({ where: { id: startupUser1.id } });
      if (startupUser2?.id) await prisma.user.delete({ where: { id: startupUser2.id } });
      if (evalUser1?.id) await prisma.user.delete({ where: { id: evalUser1.id } });
      if (evalUser2?.id) await prisma.user.delete({ where: { id: evalUser2.id } });
      if (govUser?.id) await prisma.user.delete({ where: { id: govUser.id } });
      if (dept?.id) await prisma.department.delete({ where: { id: dept.id } });
      console.log('[Cleanup Complete]\n');
    } catch (cleanErr) {
      console.warn('Cleanup error (non-fatal):', cleanErr.message);
    }
  }

  console.log(`===============================================================`);
  console.log(`AUDIT GAPS SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`===============================================================`);
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAuditGapsTests();
