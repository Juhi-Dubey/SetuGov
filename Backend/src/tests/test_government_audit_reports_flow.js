import { prisma } from '../config/prisma.js';
import * as auditService from '../services/auditService.js';
import * as departmentService from '../services/departmentService.js';
import { ForbiddenError, BadRequestError } from '../utils/errors.js';

async function runAuditAndReportsTests() {
  console.log('=== STARTING GOVERNMENT AUDIT & REPORTS INTEGRATION TESTS ===\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  };

  // Test entities IDs for cleanup
  let deptA, deptB, userA, userB, adminUser, startupUser, startup;
  let challengeA, challengeB, appA;
  let pilotA, pilotB;
  let milestoneA, paymentA;
  let validationA;
  let logA1, logA2, logA3, logB1;

  try {
    // ----------------------------------------------------
    // SETUP: Departments, Users, Challenges, Pilots, Logs
    // ----------------------------------------------------
    console.log('[Setup] Creating test departments, users, and resources...');
    deptA = await prisma.department.create({
      data: {
        name: 'Audit & Reports Dept A',
        department_code: `AUDIT_DEPT_A_${Date.now()}`,
        state: 'Maharashtra',
        contact_email: `audit_a_${Date.now()}@testgov.in`,
      },
    });

    deptB = await prisma.department.create({
      data: {
        name: 'Audit & Reports Dept B',
        department_code: `AUDIT_DEPT_B_${Date.now()}`,
        state: 'Karnataka',
        contact_email: `audit_b_${Date.now()}@testgov.in`,
      },
    });

    userA = await prisma.user.create({
      data: {
        email: `gov_audit_a_${Date.now()}@testgov.in`,
        name: 'Audit Officer Dept A',
        password_hash: 'test_hash_a',
        role: 'GOVERNMENT',
        department_id: deptA.id,
      },
    });

    userB = await prisma.user.create({
      data: {
        email: `gov_audit_b_${Date.now()}@testgov.in`,
        name: 'Audit Officer Dept B',
        password_hash: 'test_hash_b',
        role: 'GOVERNMENT',
        department_id: deptB.id,
      },
    });

    adminUser = await prisma.user.create({
      data: {
        email: `admin_audit_${Date.now()}@testgov.in`,
        name: 'System Admin Officer',
        password_hash: 'test_hash_admin',
        role: 'ADMIN',
      },
    });

    startupUser = await prisma.user.create({
      data: {
        email: `startup_audit_${Date.now()}@teststartup.in`,
        name: 'Audit Startup Founder',
        password_hash: 'test_hash_startup',
        role: 'STARTUP',
      },
    });

    startup = await prisma.startup.create({
      data: {
        user_id: startupUser.id,
        company_name: `AuditTech Solutions ${Date.now()}`,
        dpiit_number: `DPIIT_AUDIT_${Date.now()}`,
        description: 'AI and IoT technology provider for smart governance.',
        domain: 'CIVIC_TECH',
        technologies: ['IoT', 'AI'],
        location: 'Mumbai',
      },
    });

    challengeA = await prisma.challenge.create({
      data: {
        title: 'Dept A Water Grid Monitoring',
        problem_description: 'IoT Water pressure and flow monitoring.',
        current_baseline: 'Manual inspections',
        desired_outcome: 'Real-time pipeline analytics',
        location: 'Mumbai',
        pilot_location: 'Mumbai Ward A',
        pilot_duration_days: 90,
        budget_min: 500000,
        budget_max: 1000000,
        department_id: deptA.id,
        created_by: userA.id,
        status: 'PUBLISHED',
      },
    });

    challengeB = await prisma.challenge.create({
      data: {
        title: 'Dept B Traffic Signal AI',
        problem_description: 'Automated junction signal optimization.',
        current_baseline: 'Fixed timer signals',
        desired_outcome: 'Dynamic adaptive traffic flow',
        location: 'Bengaluru',
        pilot_location: 'Bengaluru Central',
        pilot_duration_days: 90,
        budget_min: 750000,
        budget_max: 1500000,
        department_id: deptB.id,
        created_by: userB.id,
        status: 'PUBLISHED',
      },
    });

    pilotA = await prisma.pilot.create({
      data: {
        challenge_id: challengeA.id,
        startup_id: startup.id,
        location: 'Mumbai Ward A',
        start_date: new Date('2026-01-01'),
        end_date: new Date('2026-04-01'),
        budget: 800000,
        status: 'RUNNING',
        overall_score: 88.5,
      },
    });

    pilotB = await prisma.pilot.create({
      data: {
        challenge_id: challengeB.id,
        startup_id: startup.id,
        location: 'Bengaluru Central',
        start_date: new Date('2026-01-01'),
        end_date: new Date('2026-04-01'),
        budget: 1200000,
        status: 'RUNNING',
        overall_score: 92.0,
      },
    });

    milestoneA = await prisma.milestone.create({
      data: {
        pilot_id: pilotA.id,
        name: 'Sensor Calibration Milestone',
        due_date: new Date(Date.now() + 30 * 86400000),
        completion_percentage: 100,
        payment_percentage: 40,
        status: 'COMPLETED',
      },
    });

    paymentA = await prisma.payment.create({
      data: {
        pilot_id: pilotA.id,
        milestone_id: milestoneA.id,
        amount: 320000,
        payment_percentage: 40,
        status: 'PAID',
        payment_date: new Date(),
        reference_number: `REF_PAY_${Date.now()}`,
      },
    });

    validationA = await prisma.validation.create({
      data: {
        pilot_id: pilotA.id,
        validator_id: adminUser.id,
        performance_score: 90,
        kpi_achievement_score: 85,
        evidence_quality_score: 88,
        technical_stability_score: 92,
        user_satisfaction_score: 87,
        status: 'VALIDATED',
      },
    });

    // Create Audit Logs for Dept A and Dept B
    logA1 = await auditService.createAuditLog({
      user_id: userA.id,
      action: 'CHALLENGE_CREATED',
      entity_type: 'CHALLENGE',
      entity_id: challengeA.id,
      details: {
        title: challengeA.title,
        budget_max: challengeA.budget_max,
        sensitive_token: 'secret_jwt_token_12345',
        password_hash: 'sensitive_hash_value'
      },
      ip_address: '192.168.1.10',
    });

    logA2 = await auditService.createAuditLog({
      user_id: userA.id,
      action: 'PAYMENT_RELEASED',
      entity_type: 'PAYMENT',
      entity_id: paymentA.id,
      details: {
        amount: 320000,
        account_number: '123456789012',
        bank_account_number: '987654321098'
      },
      ip_address: '192.168.1.10',
    });

    logA3 = await auditService.createAuditLog({
      user_id: userA.id,
      action: 'PILOT_CREATED',
      entity_type: 'PILOT',
      entity_id: pilotA.id,
      details: {
        pilot_title: pilotA.title,
        budget: 800000
      },
      ip_address: '192.168.1.10',
    });

    logB1 = await auditService.createAuditLog({
      user_id: userB.id,
      action: 'CHALLENGE_CREATED',
      entity_type: 'CHALLENGE',
      entity_id: challengeB.id,
      details: {
        title: challengeB.title,
        budget_max: challengeB.budget_max
      },
      ip_address: '192.168.2.20',
    });

    console.log('[Setup] Completed successfully.\n');

    // ====================================================
    // TEST 1: ADMIN AUDIT LOG ACCESS
    // ====================================================
    console.log('--- TEST 1: Admin Audit Log Access (Unrestricted & Paginated) ---');
    const adminLogsRes = await auditService.getAuditLogs({ page: 1, limit: 10 }, adminUser);
    assert(adminLogsRes && Array.isArray(adminLogsRes.logs), 'Admin retrieves audit logs array');
    assert(adminLogsRes.logs.length >= 4, 'Admin receives all system audit logs across departments');
    assert(adminLogsRes.pagination && adminLogsRes.pagination.total >= 4, 'Pagination metadata is provided');

    // ====================================================
    // TEST 2: GOVERNMENT AUDIT ACCESS & DEPARTMENT SCOPING
    // ====================================================
    console.log('\n--- TEST 2: Government Audit Access & Department Scoping ---');
    const userALogsRes = await auditService.getAuditLogs({ page: 1, limit: 50 }, userA);
    assert(userALogsRes && Array.isArray(userALogsRes.logs), 'Government User A retrieves audit logs array');

    const userALogIds = userALogsRes.logs.map((l) => l.id);
    assert(userALogIds.includes(logA1.id), 'User A can see Dept A Challenge creation log');
    assert(userALogIds.includes(logA2.id), 'User A can see Dept A Payment release log');
    assert(userALogIds.includes(logA3.id), 'User A can see Dept A Pilot creation log');
    assert(!userALogIds.includes(logB1.id), 'User A CANNOT see Dept B Audit Log (Strict Department Isolation)');

    const userBLogsRes = await auditService.getAuditLogs({ page: 1, limit: 50 }, userB);
    const userBLogIds = userBLogsRes.logs.map((l) => l.id);
    assert(userBLogIds.includes(logB1.id), 'User B can see Dept B Challenge creation log');
    assert(!userBLogIds.includes(logA1.id), 'User B CANNOT see Dept A Challenge creation log');

    // ====================================================
    // TEST 3: AUDIT FILTERING BY ENTITY ID & CROSS-DEPARTMENT PROTECTION
    // ====================================================
    console.log('\n--- TEST 3: Audit Filtering by Entity ID & Cross-Dept Protection ---');
    const challengeAFilterRes = await auditService.getAuditLogs({ entity_id: challengeA.id }, userA);
    assert(challengeAFilterRes.logs.length >= 1, 'User A querying Dept A Challenge returns audit logs');
    assert(challengeAFilterRes.logs.some((l) => l.id === logA1.id), 'Challenge A audit log found');

    // User A trying to query Dept B Challenge directly
    const crossDeptFilterRes = await auditService.getAuditLogs({ entity_id: challengeB.id }, userA);
    assert(crossDeptFilterRes.logs.length === 0, 'User A querying Dept B Challenge returns 0 logs (No Data Leak)');

    // ====================================================
    // TEST 4: DIRECT AUDIT DETAIL BY ID ACCESS CONTROL
    // ====================================================
    console.log('\n--- TEST 4: Direct Audit Log Detail Access Control (RBAC & Isolation) ---');
    const logADetail = await auditService.getAuditLogById(logA1.id, userA);
    assert(logADetail && logADetail.id === logA1.id, 'User A can view own department audit log detail');

    let crossDeptDetailBlocked = false;
    try {
      await auditService.getAuditLogById(logB1.id, userA);
    } catch (err) {
      if (err instanceof ForbiddenError || err.statusCode === 403) {
        crossDeptDetailBlocked = true;
      }
    }
    assert(crossDeptDetailBlocked, 'Direct fetch of Dept B audit log by User A throws 403 Forbidden');

    // Admin can fetch any log detail
    const adminFetchB = await auditService.getAuditLogById(logB1.id, adminUser);
    assert(adminFetchB && adminFetchB.id === logB1.id, 'Admin can fetch Dept B audit log detail');

    // ====================================================
    // TEST 5: SENSITIVE DATA REDACTION & MASKING
    // ====================================================
    console.log('\n--- TEST 5: Sensitive Data Redaction & Masking in Audit Logs ---');
    const sensitiveLog1 = await auditService.getAuditLogById(logA1.id, userA);
    assert(sensitiveLog1.details.sensitive_token === '[REDACTED]', 'sensitive_token is redacted in response');
    assert(sensitiveLog1.details.password_hash === '[REDACTED]', 'password_hash is redacted in response');

    const sensitiveLog2 = await auditService.getAuditLogById(logA2.id, userA);
    assert(sensitiveLog2.details.account_number === '****9012', 'account_number is masked (****9012)');
    assert(sensitiveLog2.details.bank_account_number === '****1098', 'bank_account_number is masked (****1098)');

    // ====================================================
    // TEST 6: AUDIT LOG DATE FILTERING & VALIDATION
    // ====================================================
    console.log('\n--- TEST 6: Audit Log Date Filtering & Validation ---');
    const nowIso = new Date().toISOString();
    const yesterdayIso = new Date(Date.now() - 86400000).toISOString();
    const tomorrowIso = new Date(Date.now() + 86400000).toISOString();

    const dateFilteredLogs = await auditService.getAuditLogs({
      start_date: yesterdayIso,
      end_date: tomorrowIso
    }, userA);
    assert(dateFilteredLogs.logs.length >= 3, 'Valid date range query returns audit logs');

    let invalidDateRangeBlocked = false;
    try {
      await auditService.getAuditLogs({
        start_date: tomorrowIso,
        end_date: yesterdayIso
      }, userA);
    } catch (err) {
      if (err instanceof BadRequestError || err.statusCode === 400) {
        invalidDateRangeBlocked = true;
      }
    }
    assert(invalidDateRangeBlocked, 'Invalid date range (start > end) throws 400 BadRequestError');

    // ====================================================
    // TEST 7: GOVERNMENT REPORTS & ANALYTICS DEPARTMENT SCOPING
    // ====================================================
    console.log('\n--- TEST 7: Government Analytics & Reports Department Scoping ---');
    const userAAnalytics = await departmentService.getGovernmentAnalytics(userA);
    assert(userAAnalytics && userAAnalytics.metrics, 'User A receives department analytics');
    assert(userAAnalytics.metrics.total_challenges === 1, 'User A metrics shows exactly 1 challenge for Dept A');
    assert(userAAnalytics.metrics.total_pilots === 1, 'User A metrics shows exactly 1 pilot for Dept A');
    assert(userAAnalytics.budget.allocated_budget === 1000000, 'Allocated budget matches Dept A Challenge budget (10,00,000)');
    assert(userAAnalytics.budget.paid_amount === 320000, 'Paid amount matches Dept A Payment (3,20,000)');
    assert(userAAnalytics.budget.remaining_amount === 680000, 'Remaining budget calculated correctly (6,80,000)');
    assert(userAAnalytics.metrics.avg_validation_score > 85, 'Average validation score aggregated authoritatively from database');

    const userBAnalytics = await departmentService.getGovernmentAnalytics(userB);
    assert(userBAnalytics.metrics.total_challenges === 1, 'User B metrics shows exactly 1 challenge for Dept B');
    assert(userBAnalytics.budget.allocated_budget === 1500000, 'User B budget shows Dept B challenge budget (15,00,000)');
    assert(userBAnalytics.budget.paid_amount === 0, 'User B paid amount is 0 (Dept B has 0 payments)');

    // ====================================================
    // TEST 8: CROSS-DEPARTMENT REPORT ISOLATION
    // ====================================================
    console.log('\n--- TEST 8: Cross-Department Report Direct API Isolation ---');
    // User A passes department_id of Dept B in query: must NOT override their department_id
    const tamperedQueryAnalytics = await departmentService.getGovernmentAnalytics(userA, {
      department_id: deptB.id
    });
    assert(
      tamperedQueryAnalytics.metrics.total_challenges === 1 &&
      tamperedQueryAnalytics.budget.allocated_budget === 1000000,
      'User A query with Dept B param is still strictly bound to Dept A (No cross-department elevation)'
    );

    // ====================================================
    // TEST 9: REPORT DATE FILTERING & VALIDATION
    // ====================================================
    console.log('\n--- TEST 9: Report Date Filtering & Validation ---');
    const dateFilteredReport = await departmentService.getGovernmentAnalytics(userA, {
      start_date: yesterdayIso,
      end_date: tomorrowIso
    });
    assert(dateFilteredReport.metrics.total_challenges === 1, 'Report date filter returns current period metrics');

    let invalidReportDateBlocked = false;
    try {
      await departmentService.getGovernmentAnalytics(userA, {
        start_date: tomorrowIso,
        end_date: yesterdayIso
      });
    } catch (err) {
      if (err instanceof BadRequestError || err.statusCode === 400) {
        invalidReportDateBlocked = true;
      }
    }
    assert(invalidReportDateBlocked, 'Report query with start_date > end_date throws 400 BadRequestError');

    // ====================================================
    // TEST 10: FINANCIAL REPORT ACCURACY & SECURITY
    // ====================================================
    console.log('\n--- TEST 10: Financial Report Accuracy & Security ---');
    assert(userAAnalytics.budget.utilization_percentage === 32, 'Budget utilization percentage computed correctly (32%)');
    assert(userAAnalytics.status_breakdowns.pilots.RUNNING === 1, 'Status breakdown correctly reflects database RUNNING pilot');

  } catch (error) {
    console.error('Test execution error:', error);
    failed++;
  } finally {
    // ----------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------
    console.log('\n[Cleanup] Cleaning up test data...');
    try {
      if (logA1 || logA2 || logA3 || logB1) {
        await prisma.auditLog.deleteMany({
          where: {
            id: {
              in: [logA1?.id, logA2?.id, logA3?.id, logB1?.id].filter(Boolean)
            }
          }
        });
      }
      if (validationA) await prisma.validation.delete({ where: { id: validationA.id } }).catch(() => {});
      if (paymentA) await prisma.payment.delete({ where: { id: paymentA.id } }).catch(() => {});
      if (milestoneA) await prisma.milestone.delete({ where: { id: milestoneA.id } }).catch(() => {});
      if (pilotA) await prisma.pilot.delete({ where: { id: pilotA.id } }).catch(() => {});
      if (pilotB) await prisma.pilot.delete({ where: { id: pilotB.id } }).catch(() => {});
      if (appA) await prisma.application.delete({ where: { id: appA.id } }).catch(() => {});
      if (challengeA) await prisma.challenge.delete({ where: { id: challengeA.id } }).catch(() => {});
      if (challengeB) await prisma.challenge.delete({ where: { id: challengeB.id } }).catch(() => {});
      if (startup) await prisma.startup.delete({ where: { id: startup.id } }).catch(() => {});
      if (startupUser) await prisma.user.delete({ where: { id: startupUser.id } }).catch(() => {});
      if (userA) await prisma.user.delete({ where: { id: userA.id } }).catch(() => {});
      if (userB) await prisma.user.delete({ where: { id: userB.id } }).catch(() => {});
      if (adminUser) await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
      if (deptA) await prisma.department.delete({ where: { id: deptA.id } }).catch(() => {});
      if (deptB) await prisma.department.delete({ where: { id: deptB.id } }).catch(() => {});
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr?.message);
    }
  }

  console.log(`\n=== TEST RESULTS ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  if (failed === 0) {
    console.log('🎉 ALL GOVERNMENT AUDIT & REPORTS INTEGRATION TESTS PASSED!');
  } else {
    console.error('❌ SOME TESTS FAILED');
    process.exit(1);
  }
}

runAuditAndReportsTests();
