import { prisma } from './src/config/prisma.js';
import { createGovernmentAccessRequest, createEvaluatorSelfApplication } from './src/services/accessRequestService.js';

const testEmail = process.env.TEST_EMAIL || 'juhidubey9906@gmail.com';

async function runTests() {
  console.log('====================================================');
  console.log('TEST 1: GOVERNMENT OFFICER ACCESS REQUEST');
  console.log('====================================================');

  // Clean previous requests for this test email
  await prisma.accessRequest.deleteMany({ where: { email: { equals: testEmail.toLowerCase().trim() } } });

  const govData = {
    name: 'Juhi Dubey',
    email: testEmail,
    phone: '8709220714',
    department_name: 'Department of Science & Technology',
    state: 'Karnataka',
    designation: 'Director of Technology',
    reason: 'To evaluate and approve innovative procurement proposals for state tech challenges'
  };

  const govResult = await createGovernmentAccessRequest(govData);
  console.log('✅ Government Access Request created. ID:', govResult.id);

  // Clean up before Evaluator test
  await prisma.accessRequest.deleteMany({ where: { email: { equals: testEmail.toLowerCase().trim() } } });

  console.log('\n====================================================');
  console.log('TEST 2: EVALUATOR SELF APPLICATION');
  console.log('====================================================');

  const evalData = {
    name: 'Juhi Dubey',
    email: testEmail,
    phone: '8709220714',
    organization: 'Independent Tech Consultant',
    designation: 'AI Domain Specialist',
    domain_expertise: ['Artificial Intelligence', 'Public Health Systems'],
    years_experience: 8,
    reason: 'To evaluate startup technical proposals for state government innovation challenges'
  };

  const evalResult = await createEvaluatorSelfApplication(evalData);
  console.log('✅ Evaluator Application created. ID:', evalResult.id);

  console.log('\n=== BOTH ACCESS REQUEST EMAIL TESTS COMPLETED ===');
}

runTests()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exitCode = 1;
  });
