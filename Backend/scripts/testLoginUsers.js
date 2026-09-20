import { login } from '../src/services/authService.js';
import { prisma } from '../src/config/prisma.js';

async function testAll() {
  const rolesToTest = [
    { email: 'admin@setugov.in', role: 'ADMIN (Canonical)' },
    { email: 'ramesh.kumar@health.gov.in', role: 'GOVERNMENT (Canonical)' },
    { email: 'anita.desai@evaluators.setugov.in', role: 'EVALUATOR (Canonical)' },
    { email: 'vikas@mediqueue.ai', role: 'STARTUP (Canonical)' },
    { email: 'govt1@setugov.in', role: 'GOVERNMENT (Govt1)' },
    { email: 'startup1@setugov.in', role: 'STARTUP (Startup1)' },
    { email: 'evaluator1@setugov.in', role: 'EVALUATOR (Evaluator1)' },
    { email: 'admin1@setugov.in', role: 'ADMIN (Admin1)' },
  ];

  for (const item of rolesToTest) {
    try {
      const result = await login({
        email: item.email,
        password: 'Password123!'
      });
      console.log(`✅ Login Success for ${item.role} (${item.email}):`, {
        id: result.user.id,
        name: result.user.name,
        role: result.user.role,
        hasToken: !!result.token
      });
    } catch (err) {
      console.error(`❌ Login Failed for ${item.role} (${item.email}):`, err.message);
    }
  }
}

testAll()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
