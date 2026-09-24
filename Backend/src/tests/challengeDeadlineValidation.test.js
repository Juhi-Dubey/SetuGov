/**
 * P2 Regression Test: Challenge Deadline Validation
 * 
 * Verifies that challenges cannot be created with deadlines that have already passed.
 * Covers createChallengeSchema validation in challengeSchemas.js.
 */
import { createChallengeSchema } from '../schemas/challengeSchemas.js';

const baseChallenge = {
  title: 'AI-Based Traffic Management System for Smart Cities',
  problem_description: 'Urban traffic congestion causes 30% productivity loss. Current signal systems are static and cannot adapt to real-time conditions.',
  current_baseline: 'Manual signal timing with 90-second fixed cycles',
  desired_outcome: 'Reduce average commute time by 25% using adaptive AI signals',
  location: 'Bengaluru',
  budget_min: 500000,
  budget_max: 2000000,
  pilot_duration_days: 90,
  required_technologies: ['Computer Vision', 'IoT', 'Machine Learning'],
  application_deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
};

let passed = 0;
let failed = 0;

const test = async (name, fn) => {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ❌ ${name}: ${err.message}`);
  }
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

console.log('\n🔒 P2 Regression: Challenge Deadline Validation');
console.log('═'.repeat(55));

await test('1. Rejects challenge with past deadline', async () => {
  const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
  const data = { ...baseChallenge, application_deadline: pastDate };
  const result = createChallengeSchema.safeParse(data);
  assert(!result.success, 'Schema should reject past deadlines');
  const deadlineError = result.error.issues.find(i => i.path.includes('application_deadline'));
  assert(deadlineError, 'Error should reference application_deadline path');
  assert(
    deadlineError.message.toLowerCase().includes('future'),
    `Error message should mention 'future', got: "${deadlineError.message}"`
  );
});

await test('2. Rejects challenge with deadline that just expired (1 second ago)', async () => {
  const justPast = new Date(Date.now() - 1000).toISOString();
  const data = { ...baseChallenge, application_deadline: justPast };
  const result = createChallengeSchema.safeParse(data);
  assert(!result.success, 'Schema should reject deadlines that just passed');
});

await test('3. Accepts challenge with future deadline (30 days ahead)', async () => {
  const futureDate = new Date(Date.now() + 30 * 86400000).toISOString();
  const data = { ...baseChallenge, application_deadline: futureDate };
  const result = createChallengeSchema.safeParse(data);
  assert(result.success, `Schema should accept future deadlines. Errors: ${result.error?.issues?.map(i => i.message).join(', ')}`);
});

await test('4. Rejects challenge with null deadline', async () => {
  const data = { ...baseChallenge, application_deadline: null };
  const result = createChallengeSchema.safeParse(data);
  assert(!result.success, 'Schema should reject null deadline');
  const deadlineError = result.error.issues.find(i => i.path.includes('application_deadline'));
  assert(deadlineError, 'Error should reference application_deadline path');
});

await test('5. Rejects challenge with omitted deadline (undefined)', async () => {
  const { application_deadline, ...data } = baseChallenge; // Omit application_deadline
  const result = createChallengeSchema.safeParse(data);
  assert(!result.success, 'Schema should reject missing deadline');
  const deadlineError = result.error.issues.find(i => i.path.includes('application_deadline'));
  assert(deadlineError, 'Error should reference application_deadline path');
});

await test('6. Budget validation still works with deadline validation chained', async () => {
  const data = { ...baseChallenge, budget_min: 5000000, budget_max: 1000000 }; // min > max
  const result = createChallengeSchema.safeParse(data);
  assert(!result.success, 'Schema should reject budget_min > budget_max');
  const budgetError = result.error.issues.find(i => i.path.includes('budget_max'));
  assert(budgetError, 'Error should reference budget_max path');
});

console.log('═'.repeat(55));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed}`);

if (failed > 0) {
  console.error('\n❌ DEADLINE VALIDATION TESTS FAILED');
  process.exit(1);
} else {
  console.log('\n✅ ALL DEADLINE VALIDATION TESTS PASSED');
}
