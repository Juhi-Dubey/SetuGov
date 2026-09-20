import { prisma } from '../src/config/prisma.js';

async function inspectDb() {
  const tables = [
    'user',
    'department',
    'challenge',
    'challengeEligibilityReview',
    'matchScore',
    'startup',
    'startupBankDetails',
    'startupDocument',
    'application',
    'evaluatorProfile',
    'conflictDeclaration',
    'evaluation',
    'applicationDocument',
    'applicationProposalAnalysis',
    'evaluatorMatchScore',
    'evaluatorApplication',
    'challengeEvaluatorPool',
    'pilot',
    'pilotKpi',
    'pilotMeasurement',
    'milestone',
    'evidence',
    'risk',
    'pilotIssue',
    'pilotProgressUpdate',
    'validation',
    'payment',
    'scaleDecision',
    'complianceItem',
    'pilotFeedback',
    'notification',
    'auditLog',
    'accessRequest',
    'evaluatorAssignment',
    'procurementRecord',
    'systemSetting',
    'evaluationCriterion',
    'systemTemplate'
  ];

  console.log('================ DATABASE RECORD COUNTS ================');
  const counts = {};
  for (const t of tables) {
    try {
      const count = await prisma[t].count();
      counts[t] = count;
      console.log(t.padEnd(30), ':', count);
    } catch (e) {
      console.log(t.padEnd(30), ': ERROR -', e.message);
    }
  }

  console.log('\n--- USERS IN DATABASE ---');
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, department_id: true }
  });
  console.table(users);

  console.log('\n--- DEPARTMENTS IN DATABASE ---');
  const depts = await prisma.department.findMany({
    select: { id: true, name: true, state: true }
  });
  console.table(depts);

  console.log('\n--- STARTUPS IN DATABASE ---');
  const startups = await prisma.startup.findMany({
    select: { id: true, company_name: true, user: { select: { email: true } } }
  });
  console.table(startups.map(s => ({ id: s.id, company_name: s.company_name, email: s.user?.email })));

  console.log('\n--- EVALUATOR PROFILES IN DATABASE ---');
  const evaluators = await prisma.evaluatorProfile.findMany({
    select: { id: true, organization: true, user: { select: { email: true } } }
  });
  console.table(evaluators.map(e => ({ id: e.id, organization: e.organization, email: e.user?.email })));

  console.log('\n--- CHALLENGES IN DATABASE ---');
  const challenges = await prisma.challenge.findMany({
    select: { id: true, title: true, status: true }
  });
  console.table(challenges);

  return counts;
}

inspectDb()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
