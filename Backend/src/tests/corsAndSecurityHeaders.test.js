import assert from 'assert';
import http from 'http';
import { createApp } from '../app.js';
import { config } from '../config/env.js';
import { prisma } from '../config/prisma.js';

async function runCorsAndSecurityHeadersTests() {
  console.log('===============================================================');
  console.log('🛡️  RUNNING CORS & SECURITY HEADERS VERIFICATION SUITE');
  console.log('===============================================================');

  // Start temporary test server
  const app = createApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Allowed Origin Receives Specific Matching CORS Header (Not Wildcard)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: Allowed Frontend Origin Allowed ---');
    const allowedOriginRes = await fetch(`${baseUrl}/api/v1/health`, {
      headers: {
        Origin: 'http://localhost:5173'
      }
    });

    assert.strictEqual(allowedOriginRes.status, 200, 'Health endpoint must respond 200');
    const allowOriginHeader = allowedOriginRes.headers.get('access-control-allow-origin');
    assert.strictEqual(
      allowOriginHeader,
      'http://localhost:5173',
      'CORS header must strictly match allowed origin, never wildcard *'
    );
    assert.notStrictEqual(allowOriginHeader, '*', 'Access-Control-Allow-Origin must not be wildcard');
    assert.strictEqual(
      allowedOriginRes.headers.get('access-control-allow-credentials'),
      null,
      'credentials should not be enabled when not required'
    );
    console.log('✅ [PASS] Allowed origin received explicit matching Access-Control-Allow-Origin header (no wildcard).');

    // -------------------------------------------------------------------------
    // TEST 2: Unauthorized Origin Rejected (No Allow Header Returned)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Unauthorized Origin Rejected ---');
    const unauthorizedOriginRes = await fetch(`${baseUrl}/api/v1/health`, {
      headers: {
        Origin: 'http://malicious-attacker-site.com'
      }
    });

    assert.strictEqual(
      unauthorizedOriginRes.headers.get('access-control-allow-origin'),
      null,
      'Unauthorized origin must NOT receive Access-Control-Allow-Origin header'
    );
    console.log('✅ [PASS] Unauthorized origin does not receive permissive CORS headers.');

    // -------------------------------------------------------------------------
    // TEST 3: Preflight OPTIONS from Allowed Origin
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Preflight OPTIONS Request from Allowed Origin ---');
    const preflightRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });

    assert.strictEqual(preflightRes.status, 204, 'Preflight OPTIONS must respond with 204 No Content');
    assert.strictEqual(preflightRes.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    const allowMethods = preflightRes.headers.get('access-control-allow-methods');
    assert(allowMethods.includes('POST'), 'Must allow POST method');
    assert(allowMethods.includes('OPTIONS'), 'Must allow OPTIONS method');
    const allowHeaders = preflightRes.headers.get('access-control-allow-headers');
    assert(allowHeaders.toLowerCase().includes('authorization'), 'Must allow Authorization header');
    assert(allowHeaders.toLowerCase().includes('content-type'), 'Must allow Content-Type header');
    console.log('✅ [PASS] OPTIONS preflight request from allowed origin returns 204 with correct CORS methods and headers.');

    // -------------------------------------------------------------------------
    // TEST 4: Preflight OPTIONS from Unauthorized Origin
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Preflight OPTIONS Request from Unauthorized Origin ---');
    const unauthorizedPreflightRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://evil-site.org',
        'Access-Control-Request-Method': 'POST'
      }
    });

    assert.strictEqual(
      unauthorizedPreflightRes.headers.get('access-control-allow-origin'),
      null,
      'Unauthorized preflight must not receive Access-Control-Allow-Origin header'
    );
    console.log('✅ [PASS] OPTIONS preflight from unauthorized origin refused CORS allow headers.');

    // -------------------------------------------------------------------------
    // TEST 5: HTTP Security Headers Validation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: HTTP Security Headers Presence ---');
    const secRes = await fetch(`${baseUrl}/api/v1/health`);

    // 5.1 X-Content-Type-Options
    assert.strictEqual(
      secRes.headers.get('x-content-type-options'),
      'nosniff',
      'X-Content-Type-Options must be nosniff'
    );

    // 5.2 X-Frame-Options
    assert.strictEqual(
      secRes.headers.get('x-frame-options'),
      'DENY',
      'X-Frame-Options must be DENY'
    );

    // 5.3 Referrer-Policy
    assert.strictEqual(
      secRes.headers.get('referrer-policy'),
      'strict-origin-when-cross-origin',
      'Referrer-Policy must be strict-origin-when-cross-origin'
    );

    // 5.4 Content-Security-Policy
    const csp = secRes.headers.get('content-security-policy');
    assert(csp, 'Content-Security-Policy must be present');
    assert(csp.includes("default-src 'none'"), 'CSP must include default-src none');
    assert(csp.includes("frame-ancestors 'none'"), 'CSP must include frame-ancestors none');

    // 5.5 Permissions-Policy
    const permPolicy = secRes.headers.get('permissions-policy');
    assert(permPolicy, 'Permissions-Policy must be present');
    assert(permPolicy.includes('camera=()'), 'Must restrict camera');
    assert(permPolicy.includes('microphone=()'), 'Must restrict microphone');

    // 5.6 Cross-Origin-Resource-Policy
    assert.strictEqual(
      secRes.headers.get('cross-origin-resource-policy'),
      'cross-origin',
      'Cross-Origin-Resource-Policy must be cross-origin'
    );
    console.log('✅ [PASS] All standard security headers verified (nosniff, DENY, CSP, Permissions-Policy, Referrer-Policy).');

    // -------------------------------------------------------------------------
    // TEST 6: HSTS Behavior (Disabled in Local/Test, Enabled in Production)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: HSTS Environment-Aware Behavior ---');
    // Current environment is test/development
    assert.strictEqual(
      secRes.headers.get('strict-transport-security'),
      null,
      'HSTS must not be sent in local HTTP/development/test mode'
    );

    // Verify production app instance enables HSTS
    const prevEnv = config.NODE_ENV;
    try {
      config.NODE_ENV = 'production';
      const prodApp = createApp();
      const prodServer = http.createServer(prodApp);
      await new Promise((resolve) => prodServer.listen(0, resolve));
      const prodPort = prodServer.address().port;

      const prodRes = await fetch(`http://127.0.0.1:${prodPort}/api/v1/health`);
      const prodHsts = prodRes.headers.get('strict-transport-security');
      assert(prodHsts, 'HSTS must be enabled in production environment');
      assert(prodHsts.includes('max-age=31536000'), 'HSTS max-age must be 1 year (31536000)');
      assert(prodHsts.includes('includeSubDomains'), 'HSTS must include subdomains');

      await new Promise((resolve) => prodServer.close(resolve));
      console.log('✅ [PASS] HSTS is omitted in development/test and strictly enforced in production.');
    } finally {
      config.NODE_ENV = prevEnv;
    }

    // -------------------------------------------------------------------------
    // TEST 7: Authenticated Requests Work with CORS
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Authenticated Request with Allowed Origin ---');
    // Login to obtain token
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:5173'
      },
      body: JSON.stringify({
        email: 'vikas@mediqueue.ai',
        password: 'Password123!'
      })
    });

    const loginData = await loginRes.json();
    assert.strictEqual(loginRes.status, 200, 'Login must succeed');
    const token = loginData.data?.token;
    assert(token, 'Token must be present');
    assert.strictEqual(loginRes.headers.get('access-control-allow-origin'), 'http://localhost:5173');

    // Authenticated profile fetch
    const profileRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Origin: 'http://localhost:5173'
      }
    });
    assert.strictEqual(profileRes.status, 200, 'Profile request must succeed');
    assert.strictEqual(profileRes.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    console.log('✅ [PASS] Authenticated request with Authorization header works seamlessly with CORS.');

    // -------------------------------------------------------------------------
    // TEST 8: Error Responses Do Not Leak Secrets or Internal Details
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Error Response Information Disclosure Prevention ---');
    const errorRes = await fetch(`${baseUrl}/api/v1/unknown-route-for-testing-404`);
    assert.strictEqual(errorRes.status, 404);
    const errorJson = await errorRes.json();

    assert.strictEqual(errorJson.success, false);
    assert(errorJson.error?.code, 'Error code must be present');
    assert.strictEqual(errorJson.stack, undefined, 'Stack trace must not be exposed');
    assert.strictEqual(errorJson.error?.stack, undefined, 'Stack trace must not be exposed in error object');
    assert(!JSON.stringify(errorJson).includes('node_modules'), 'Filesystem paths must not be leaked');
    console.log('✅ [PASS] Error responses do not expose internal stack traces, paths, or secrets.');

    console.log('\n===============================================================');
    console.log('🎉 ALL CORS & SECURITY HEADERS TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('===============================================================');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  }
}

runCorsAndSecurityHeadersTests().catch((err) => {
  console.error('❌ Test execution failed:', err);
  process.exit(1);
});
