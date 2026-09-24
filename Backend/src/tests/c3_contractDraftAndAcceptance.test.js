import assert from 'assert';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import {
  createProcurementReadiness,
  approveProcurement,
  issueContract,
  generateContractDraft,
  acceptContract,
  declineContract,
  submitDelivery
} from '../services/procurementService.js';

const runC3Tests = async () => {
  logger.info('🧪 Starting C3 (Contract Draft & Startup Acceptance Gate) Tests...');

  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      logger.info(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      logger.error(`  ❌ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  };

  const testSuffix = Date.now();
  const randomPan = () => 'ABCDE' + Math.floor(1000 + Math.random() * 9000) + String.fromCharCode(65 + Math.floor(Math.random() * 26));
  let adminUser, govtUser, startupUser, otherStartupUser, testDept, challenge, startup, pilot, procRecord;

  try {
    // 0. Setup test department, users, challenge, startup, pilot
    testDept = await prisma.department.create({
      data: {
        name: `Dept C3 ${testSuffix}`,
        department_code: 'DEPT3',
        state: 'Delhi',
        contact_email: `dept_c3_${testSuffix}@example.com`,
        verification_status: 'VERIFIED'
      }
    });

    govtUser = await prisma.user.create({
      data: {
        name: `Nodal Officer C3 ${testSuffix}`,
        email: `govt_c3_${testSuffix}@example.com`,
        password_hash: 'hashed_pw',
        role: 'GOVERNMENT',
        department_id: testDept.id,
        is_verified: true,
        is_active: true
      }
    });

    adminUser = await prisma.user.create({
      data: {
        name: `Admin C3 ${testSuffix}`,
        email: `admin_c3_${testSuffix}@example.com`,
        password_hash: 'hashed_pw',
        role: 'ADMIN',
        is_verified: true,
        is_active: true
      }
    });

    startupUser = await prisma.user.create({
      data: {
        name: `Startup Signatory C3 ${testSuffix}`,
        email: `startup_c3_${testSuffix}@example.com`,
        password_hash: 'hashed_pw',
        role: 'STARTUP',
        is_verified: true,
        is_active: true
      }
    });

    otherStartupUser = await prisma.user.create({
      data: {
        name: `Other Startup C3 ${testSuffix}`,
        email: `other_startup_c3_${testSuffix}@example.com`,
        password_hash: 'hashed_pw',
        role: 'STARTUP',
        is_verified: true,
        is_active: true
      }
    });

    startup = await prisma.startup.create({
      data: {
        user_id: startupUser.id,
        company_name: `AgriTech Innovations ${testSuffix}`,
        verification_status: 'VERIFIED',
        domain: 'Agritech',
        technologies: ['IoT', 'AI'],
        readiness_level: 8,
        org_type: 'PRIVATE_LIMITED',
        registered_address: 'Barakhamba Road',
        city: 'New Delhi',
        state: 'Delhi',
        location: 'Delhi',
        pincode: '110001',
        pan_number: randomPan(),
        dpiit_number: `DPIIT${testSuffix}`.slice(0, 10),
        authorized_person_name: 'Dr. Ramesh Kumar',
        authorized_person_email: startupUser.email,
        description: 'Pioneering agricultural telemetry and crop sensing startup.',
        bank_details: {
          create: {
            account_number: '987654321098',
            ifsc_code: 'PUNB0123456',
            account_holder_name: 'AgriTech Innovations Pvt Ltd',
            bank_name: 'Punjab National Bank'
          }
        }
      }
    });

    challenge = await prisma.challenge.create({
      data: {
        title: `Crop Telemetry System ${testSuffix}`,
        problem_description: 'Automated soil moisture & pest detection',
        current_baseline: 'Manual field checks',
        desired_outcome: 'High density sensor deployment & predictive alerts',
        location: 'Punjab',
        budget_min: 500000,
        budget_max: 2000000,
        pilot_duration_days: 90,
        required_technologies: ['IoT', 'AI'],
        status: 'PILOT',
        ip_ownership: 'STARTUP_OWNED',
        created_by: govtUser.id,
        department_id: testDept.id
      }
    });

    pilot = await prisma.pilot.create({
      data: {
        challenge_id: challenge.id,
        startup_id: startup.id,
        status: 'SCALED',
        budget: 1200000,
        location: 'Ludhiana',
        start_date: new Date(),
        end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        overall_score: 94.5
      }
    });

    // Create validation and scale decision records for realistic draft synthesis
    await prisma.validation.create({
      data: {
        pilot_id: pilot.id,
        validator_id: govtUser.id,
        performance_score: 94.5,
        kpi_achievement_score: 95.0,
        evidence_quality_score: 95.0,
        technical_stability_score: 94.0,
        user_satisfaction_score: 94.0,
        status: 'VALIDATED',
        comments: 'Outstanding performance in pilot validation.'
      }
    });

    await prisma.scaleDecision.create({
      data: {
        pilot_id: pilot.id,
        decision: 'SCALE',
        reasoning: 'Pilot exceeded key sensor uptime and accuracy targets.',
        approved_by: govtUser.id
      }
    });

    // Create procurement record initialized via readiness package
    procRecord = await createProcurementReadiness(pilot.id, {
      route: 'DIRECT_APPROVED_ROUTE',
      estimated_value: 1200000,
      justification: 'Sandbox innovation direct procurement exemption under GFR Rule 149.',
      technical_readiness: true,
      compliance_readiness: true,
      cybersecurity_clearance: true,
      data_protection_clearance: true
    }, govtUser);

    // Approve the procurement package
    await approveProcurement(procRecord.id, {
      decision: 'APPROVE',
      approval_notes: 'Procurement sanction order signed by department head.'
    }, govtUser);

    // Test 1: generateContractDraft synthesizes structured JSON and markdown
    await test('1. generateContractDraft synthesizes structured contract terms, parties, and markdown', async () => {
      const draftResult = await generateContractDraft(procRecord.id, govtUser);
      assert.ok(draftResult.draft, 'Draft object must exist');
      assert.strictEqual(draftResult.draft.parties.buyer.department_name, testDept.name);
      assert.strictEqual(draftResult.draft.parties.supplier.company_name, startup.company_name);
      assert.strictEqual(draftResult.draft.pilot_outcome_summary.validation_score, 94.5);
      assert.strictEqual(draftResult.draft.pilot_outcome_summary.scale_decision, 'SCALE');
      assert.ok(draftResult.markdown.includes('Commercial Procurement Agreement Draft'));
      assert.ok(draftResult.suggested_form_values.contract_reference.includes('DEPT3'));

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: { entity_id: procRecord.id, action: 'CONTRACT_DRAFT_GENERATED' }
      });
      assert.ok(audit, 'Audit log must record CONTRACT_DRAFT_GENERATED');
    });

    // Test 2: issueContract accepts contract_draft_content and transitions to CONTRACT_ISSUED
    await test('2. issueContract stores contract_draft_content and transitions status to CONTRACT_ISSUED', async () => {
      const draftResult = await generateContractDraft(procRecord.id, govtUser);

      const issued = await issueContract(procRecord.id, {
        po_reference_number: `PO/AGRI/${testSuffix}`,
        contract_reference: `CTR/AGRI/${testSuffix}`,
        final_contract_value: 1200000,
        contract_duration_days: 90,
        contract_effective_date: new Date(),
        contract_draft_content: draftResult.draft
      }, govtUser);

      assert.strictEqual(issued.status, 'CONTRACT_ISSUED');
      assert.strictEqual(issued.final_contract_value.toNumber(), 1200000);
      assert.ok(issued.contract_draft_content, 'contract_draft_content must be persisted in database');
      assert.strictEqual(issued.contract_draft_content.draft_id, draftResult.draft.draft_id);
    });

    // Test 3: submitDelivery is BLOCKED when status is CONTRACT_ISSUED (Acceptance Gate)
    await test('3. submitDelivery throws error when status is CONTRACT_ISSUED (requires explicit CONTRACT_ACCEPTED)', async () => {
      await assert.rejects(
        async () => {
          await submitDelivery(procRecord.id, {
            delivery_scope: 'Final telemetry hardware deployed across 20 farm sites',
            delivery_evidence_url: 'https://example.com/delivery.zip'
          }, startupUser);
        },
        (err) => err.message.includes('The startup must explicitly accept the contract before submitting delivery')
      );
    });

    // Test 4: declineContract transitions to CONTRACT_DECLINED and records mandatory notes
    await test('4. declineContract requires mandatory decline_notes, updates to CONTRACT_DECLINED', async () => {
      // Rejection: Empty decline notes
      await assert.rejects(
        async () => {
          await declineContract(procRecord.id, { decline_notes: '' }, startupUser);
        },
        (err) => err.message.includes('Decline notes are mandatory')
      );

      // Rejection: Other startup cannot decline
      await assert.rejects(
        async () => {
          await declineContract(procRecord.id, { decline_notes: 'Wrong startup' }, otherStartupUser);
        },
        (err) => err.message.includes('You are not authorized to access another startup')
      );

      // Valid decline by contracted startup
      const declined = await declineContract(procRecord.id, {
        decline_notes: 'Payment milestone schedule needs to be 40-40-20 instead of 100% on final acceptance.'
      }, startupUser);

      assert.strictEqual(declined.status, 'CONTRACT_DECLINED');
      assert.strictEqual(declined.contract_decline_notes, 'Payment milestone schedule needs to be 40-40-20 instead of 100% on final acceptance.');

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: { entity_id: procRecord.id, action: 'PROCUREMENT_CONTRACT_DECLINED' }
      });
      assert.ok(audit, 'Audit log must record PROCUREMENT_CONTRACT_DECLINED');

      // Delivery is still blocked
      await assert.rejects(
        async () => {
          await submitDelivery(procRecord.id, { delivery_scope: 'Test' }, startupUser);
        },
        (err) => err.message.includes('The startup must explicitly accept the contract')
      );
    });

    // Test 5: Directive Q2 — Direct re-issuance from CONTRACT_DECLINED
    await test('5. Directive Q2: Government can directly re-issue contract from CONTRACT_DECLINED status', async () => {
      // Issue revised contract directly from CONTRACT_DECLINED
      const reissued = await issueContract(procRecord.id, {
        po_reference_number: `PO/AGRI/REV/${testSuffix}`,
        contract_reference: `CTR/AGRI/REV/${testSuffix}`,
        final_contract_value: 1250000,
        contract_duration_days: 90,
        contract_effective_date: new Date()
      }, govtUser);

      assert.strictEqual(reissued.status, 'CONTRACT_ISSUED', 'Must transition back to CONTRACT_ISSUED');
      assert.strictEqual(reissued.contract_decline_notes, null, 'Must clear decline notes on re-issuance');
      assert.strictEqual(reissued.final_contract_value.toNumber(), 1250000);

      // Audit log must reflect re-issuance
      const audit = await prisma.auditLog.findFirst({
        where: { entity_id: procRecord.id, action: 'PROCUREMENT_CONTRACT_REISSUED' }
      });
      assert.ok(audit, 'Audit log must record PROCUREMENT_CONTRACT_REISSUED');
      assert.strictEqual(audit.details?.reissued_after_decline, true);
    });

    // Test 6: acceptContract transitions to CONTRACT_ACCEPTED
    await test('6. acceptContract allows contracted startup to accept, sets contract_accepted_at and contract_accepted_by', async () => {
      // Rejection: Other startup cannot accept
      await assert.rejects(
        async () => {
          await acceptContract(procRecord.id, otherStartupUser);
        },
        (err) => err.message.includes('You are not authorized to access another startup')
      );

      // Valid acceptance by contracted startup
      const accepted = await acceptContract(procRecord.id, startupUser);
      assert.strictEqual(accepted.status, 'CONTRACT_ACCEPTED');
      assert.ok(accepted.contract_accepted_at, 'contract_accepted_at must be populated');
      assert.strictEqual(accepted.contract_accepted_by, startupUser.id);

      // Audit log
      const audit = await prisma.auditLog.findFirst({
        where: { entity_id: procRecord.id, action: 'PROCUREMENT_CONTRACT_ACCEPTED' }
      });
      assert.ok(audit, 'Audit log must record PROCUREMENT_CONTRACT_ACCEPTED');
    });

    // Test 7: submitDelivery succeeds once status is CONTRACT_ACCEPTED
    await test('7. submitDelivery succeeds once status is CONTRACT_ACCEPTED, advancing to DELIVERY_SUBMITTED', async () => {
      const delivered = await submitDelivery(procRecord.id, {
        delivery_scope: 'Final telemetry hardware deployed across 20 farm sites in Ludhiana',
        delivery_evidence_url: 'https://example.com/delivery_evidence.pdf',
        delivery_notes: 'All telemetry feeds live on state IoT gateway'
      }, startupUser);

      assert.strictEqual(delivered.status, 'DELIVERY_SUBMITTED');
      assert.strictEqual(delivered.acceptance_status, 'PENDING');
      assert.ok(delivered.delivery_date);
    });

  } finally {
    // Cleanup test data
    try {
      if (procRecord) {
        await prisma.payment.deleteMany({ where: { procurement_id: procRecord.id } });
        await prisma.procurementRecord.delete({ where: { id: procRecord.id } }).catch(() => {});
      }
      if (pilot) {
        await prisma.scaleDecision.deleteMany({ where: { pilot_id: pilot.id } });
        await prisma.validation.deleteMany({ where: { pilot_id: pilot.id } });
        await prisma.pilot.delete({ where: { id: pilot.id } }).catch(() => {});
      }
      if (challenge) await prisma.challenge.delete({ where: { id: challenge.id } }).catch(() => {});
      if (startup) {
        await prisma.startupBankDetails.deleteMany({ where: { startup_id: startup.id } });
        await prisma.startup.delete({ where: { id: startup.id } }).catch(() => {});
      }
      if (startupUser) await prisma.user.delete({ where: { id: startupUser.id } }).catch(() => {});
      if (otherStartupUser) await prisma.user.delete({ where: { id: otherStartupUser.id } }).catch(() => {});
      if (govtUser) await prisma.user.delete({ where: { id: govtUser.id } }).catch(() => {});
      if (adminUser) await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
      if (testDept) await prisma.department.delete({ where: { id: testDept.id } }).catch(() => {});
    } catch (cleanErr) {
      logger.warn(`Cleanup error: ${cleanErr.message}`);
    }
  }

  logger.info(`\n📊 Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runC3Tests();
