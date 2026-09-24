import { config } from './src/config/env.js';
import { sendEmail, maskEmail } from './src/services/emailService.js';

const testRecipient = process.env.TEST_EMAIL ? process.env.TEST_EMAIL.trim() : '';

if (!testRecipient) {
  console.error('ERROR: TEST_EMAIL environment variable is required.');
  console.error('Example (bash/cmd):    TEST_EMAIL=recipient@example.com node testEmail.js');
  console.error('Example (PowerShell):  $env:TEST_EMAIL="recipient@example.com"; node testEmail.js');
  process.exit(1);
}

const maskSecret = (str) => {
  if (!str) return 'MISSING';
  if (str.length <= 4) return '****';
  return `${str.substring(0, 2)}****${str.substring(str.length - 2)} (len: ${str.length})`;
};

console.log('--- SetuGov SMTP Diagnostic ---');
console.log(`EMAIL_PROVIDER    : ${config.EMAIL_PROVIDER}`);
console.log(`EMAIL_SMTP_HOST   : ${config.EMAIL_SMTP_HOST}`);
console.log(`EMAIL_SMTP_PORT   : ${config.EMAIL_SMTP_PORT}`);
console.log(`EMAIL_SMTP_SECURE : ${config.EMAIL_SMTP_SECURE}`);
console.log(`EMAIL_SMTP_USER   : ${config.EMAIL_SMTP_USER}`);
console.log(`EMAIL_SMTP_PASS   : ${maskSecret(config.EMAIL_SMTP_PASSWORD)}`);
console.log(`EMAIL_FROM        : ${config.EMAIL_FROM}`);
console.log(`Recipient         : ${maskEmail(testRecipient)}`);
console.log('--------------------------------');

async function runTest() {
  try {
    const result = await sendEmail({
      to: testRecipient,
      subject: 'SetuGov SMTP Test',
      text: 'This is a test email from SetuGov SMTP.',
      html: '<h2>SetuGov SMTP Test</h2><p>This is a test email.</p>'
    });

    console.log(`SUCCESS: [${result?.provider?.toUpperCase()}] Email accepted. Message ID: ${result?.messageId || 'unknown'}`);
    console.log('Result payload:', JSON.stringify(result, null, 2));
    process.exitCode = 0;
  } catch (error) {
    console.error(`FAILURE: ${error.message}`);
    process.exitCode = 1;
  }
}

runTest();
