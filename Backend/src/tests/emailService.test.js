import assert from 'assert';
import { maskEmail, escapeHtml, sendEmail } from '../services/emailService.js';
import { config } from '../config/env.js';

async function runEmailServiceTests() {
  console.log('=== EMAIL SERVICE UNIT TESTS ===');

  // Test 1: maskEmail helper
  console.log('\n--- TEST 1: maskEmail helper ---');
  assert.strictEqual(maskEmail('juhidubey9906@gmail.com'), 'j***********6@gmail.com');
  assert.strictEqual(maskEmail('ab@example.com'), 'a*@example.com');
  assert.strictEqual(maskEmail(''), '');
  assert.strictEqual(maskEmail(null), '');
  console.log('✅ maskEmail masks email addresses without leaking full local-part');

  // Test 2: escapeHtml helper
  console.log('\n--- TEST 2: escapeHtml helper ---');
  assert.strictEqual(escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  console.log('✅ escapeHtml escapes HTML injection characters');

  // Test 3: recipient validation
  console.log('\n--- TEST 3: Recipient validation ---');
  try {
    await sendEmail({ to: '', subject: 'test', text: 'test', html: '<p>test</p>' });
    assert.fail('Should fail on empty recipient');
  } catch (err) {
    assert(err.message.includes('recipient (to) is required'));
    console.log('✅ sendEmail rejects empty recipient');
  }

  // Test 4: Environment loading test
  console.log('\n--- TEST 4: Environment Configuration ---');
  assert(config.EMAIL_PROVIDER, 'EMAIL_PROVIDER should be defined');
  assert(config.EMAIL_FROM, 'EMAIL_FROM should be defined');
  console.log(`✅ Config resolved: EMAIL_PROVIDER=${config.EMAIL_PROVIDER}, EMAIL_FROM=${config.EMAIL_FROM}`);

  // Test 5: sendAccessRequestEmail export and validation
  console.log('\n--- TEST 5: sendAccessRequestEmail validation ---');
  const { sendAccessRequestEmail } = await import('../services/emailService.js');
  assert(typeof sendAccessRequestEmail === 'function', 'sendAccessRequestEmail must be a function');
  try {
    await sendAccessRequestEmail({ role: 'GOVERNMENT', recipientEmail: '', applicantName: 'Test', applicantEmail: 'test@example.com' });
    assert.fail('Should fail on empty recipient');
  } catch (err) {
    assert(err.message.includes('recipient (to) is required'));
    console.log('✅ sendAccessRequestEmail rejects empty recipient');
  }

  console.log('\n=== ALL EMAIL SERVICE UNIT TESTS PASSED ===\n');
}

runEmailServiceTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exitCode = 1;
});
