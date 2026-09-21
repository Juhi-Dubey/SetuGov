import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE = 'http://localhost:5000/api/v1';

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, json };
}

async function run() {
  // ---- Login ----
  const l1 = await api('POST', '/auth/login', { email: 'govt1@setugov.in', password: 'Password123!' });
  const t1 = l1.json?.data?.token;
  const u1 = l1.json?.data?.user;
  console.log(`Govt1 login: HTTP ${l1.status} | email: ${u1?.email} | dept: ${u1?.department_id}`);

  const l2 = await api('POST', '/auth/login', { email: 'govt2@setugov.in', password: 'Password123!' });
  const t2 = l2.json?.data?.token;
  const u2 = l2.json?.data?.user;
  console.log(`Govt2 login: HTTP ${l2.status} | email: ${u2?.email} | dept: ${u2?.department_id}`);

  if (!t1) { console.log('Govt1 token MISSING — aborting'); return; }

  // ---- Govt1 creates a DRAFT challenge ----
  const cr = await api('POST', '/challenges', {
    title: 'RBAC Lifecycle Test Challenge',
    problem_description: 'Cross-department RBAC isolation and lifecycle test for Government challenge workflow.',
    current_baseline: 'No baseline for QA test.',
    desired_outcome: 'Verify department isolation and lifecycle transitions work correctly.',
    location: 'Bangalore, Karnataka',
    budget_min: 100000, budget_max: 500000,
    pilot_duration_days: 30,
    required_technologies: ['AI'],
    milestones: [{ name: 'Phase 1', description: 'Start', payment_percentage: 100, due_date: '2027-01-01' }]
  }, t1);
  const chalId = cr.json?.data?.challenge?.id;
  const chalStatus = cr.json?.data?.challenge?.status;
  console.log(`\nChallenge created: HTTP ${cr.status} | ID: ${chalId} | Status: ${chalStatus}`);

  if (!chalId) { console.log('FAIL — challenge creation failed:', JSON.stringify(cr.json)); return; }

  // ---- RBAC: Govt2 tries to access DRAFT challenge ----
  if (t2) {
    const g2get = await api('GET', `/challenges/${chalId}`, null, t2);
    console.log(`\nRBAC DRAFT - Govt2 GET: HTTP ${g2get.status} (expected 403) | msg: ${g2get.json?.error?.message}`);
    console.log(`  → ${g2get.status === 403 ? 'PASS' : 'FAIL'}`);

    const g2list = await api('GET', '/challenges', null, t2);
    const visible = (g2list.json?.data?.challenges || []).find(c => c.id === chalId);
    console.log(`RBAC DRAFT - Govt2 listing leakage: ${visible ? 'FAIL — visible!' : 'PASS — NOT visible'}`);
  } else {
    console.log('Govt2 token missing — skipping RBAC tests');
  }

  // ---- Publish challenge ----
  const pub = await api('POST', `/challenges/${chalId}/publish`, {}, t1);
  console.log(`\nPublish challenge: HTTP ${pub.status} | Status: ${pub.json?.data?.challenge?.status}`);

  // Verify no auto-created downstream records
  const assignCount = await prisma.evaluatorAssignment.count({ where: { application: { challenge_id: chalId } } });
  const evalCount = await prisma.evaluation.count({ where: { application: { challenge_id: chalId } } });
  const conflictCount = await prisma.conflictDeclaration.count({ where: { application: { challenge_id: chalId } } });
  const pilotCount = await prisma.pilot.count({ where: { challenge_id: chalId } });
  console.log(`Auto-created on publish — Assignments: ${assignCount} | Evaluations: ${evalCount} | Conflicts: ${conflictCount} | Pilots: ${pilotCount}`);
  console.log(`  → ${assignCount === 0 && evalCount === 0 && conflictCount === 0 && pilotCount === 0 ? 'PASS (no auto-created)' : 'FAIL (auto-created!)'}`);

  // ---- RBAC: Govt2 tries to access PUBLISHED challenge ----
  if (t2) {
    const g2pub = await api('GET', `/challenges/${chalId}`, null, t2);
    console.log(`\nRBAC PUBLISHED - Govt2 GET: HTTP ${g2pub.status} (expected 403) | msg: ${g2pub.json?.error?.message}`);
    console.log(`  → ${g2pub.status === 403 ? 'PASS' : 'FAIL'}`);

    const g2patch = await api('PATCH', `/challenges/${chalId}`, { title: 'Unauthorized Modification' }, t2);
    console.log(`RBAC PUBLISHED - Govt2 PATCH: HTTP ${g2patch.status} (expected 403)`);
    console.log(`  → ${g2patch.status === 403 ? 'PASS' : 'FAIL'}`);

    const g2pubAct = await api('POST', `/challenges/${chalId}/publish`, {}, t2);
    console.log(`RBAC PUBLISHED - Govt2 PUBLISH again: HTTP ${g2pubAct.status} (expected 403 or 400)`);
    console.log(`  → ${g2pubAct.status === 403 || g2pubAct.status === 400 ? 'PASS' : 'FAIL'}`);
  }

  // ---- Govt1 moves to EVALUATION ----
  const evT = await api('POST', `/challenges/${chalId}/start-evaluation`, {}, t1);
  console.log(`\nEVALUATION transition: HTTP ${evT.status} | Status: ${evT.json?.data?.challenge?.status}`);
  console.log(`  → ${evT.json?.data?.challenge?.status === 'EVALUATION' ? 'PASS' : 'FAIL'}`);

  // ---- Invalid transition: EVALUATION → PILOT directly ----
  const invPilot = await api('POST', `/challenges/${chalId}/pilot`, {}, t1);
  console.log(`\nInvalid EVALUATION→PILOT: HTTP ${invPilot.status} (expected 400/404/403)`);
  console.log(`  → ${invPilot.status !== 200 ? 'PASS (blocked)' : 'FAIL (allowed!)'}`);

  // ---- Invalid PATCH status ----
  const invStatus = await api('PATCH', `/challenges/${chalId}`, { status: 'COMPLETED' }, t1);
  console.log(`Invalid direct PATCH status=COMPLETED: HTTP ${invStatus.status} (expected 400)`);
  console.log(`  msg: ${invStatus.json?.error?.message}`);

  // ---- CLOSED behavior test ----
  const closeR = await api('POST', `/challenges/${chalId}/close`, {}, t1);
  console.log(`\nClose challenge: HTTP ${closeR.status} | Status: ${closeR.json?.data?.challenge?.status || closeR.json?.error?.message}`);

  // ---- Edit restrictions ----
  const editR = await api('PATCH', `/challenges/${chalId}`, { title: 'Unauthorized Title Change After Publish' }, t1);
  console.log(`\nEdit after publish/evaluation: HTTP ${editR.status} | msg: ${editR.json?.error?.message || editR.json?.message}`);
  console.log(`  → ${editR.status === 400 || editR.status === 403 ? 'PASS (edit blocked)' : editR.ok ? 'FAIL or PARTIAL (edit allowed — may be OK if whitelisted fields only)' : 'FAIL'}`);

  // ---- Cleanup ----
  await prisma.challenge.delete({ where: { id: chalId } }).catch(() => console.log('Cleanup: delete may have failed (foreign key or challenge already gone)'));
  console.log(`\nTest challenge ${chalId} cleaned up.`);
}

run()
  .catch(e => console.error('Error:', e.message))
  .finally(() => prisma.$disconnect());
