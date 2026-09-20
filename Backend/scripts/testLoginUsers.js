import { login } from '../src/services/authService.js';
import { prisma } from '../src/config/prisma.js';

async function testAll() {
  const rolesToTest = [
    { email: 'govt1@setugov.in', role: 'GOVERNMENT' },
    { email: 'startup1@setugov.in', role: 'STARTUP' },
    { email: 'evaluator1@setugov.in', role: 'EVALUATOR' },
    { email: 'admin1@setugov.in', role: 'ADMIN' },
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
