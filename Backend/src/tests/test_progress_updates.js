import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

const BASE_URL = `http://localhost:${config.PORT || 5000}/api/v1`;

const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      department_id: user.department_id || null,
      name: user.name || 'Test User'
    },
    config.JWT_SECRET || 'setugov_super_secret_jwt_key_2026',
    { expiresIn: '1h' }
  );
};

async function runTests() {
  console.log('=== STARTING PERSISTENT PILOT PROGRESS UPDATE TESTS ===\n');

  // Verify server is reachable
  const healthRes = await fetch(`${BASE_URL}/health`);
  const healthData = await healthRes.json();
  if (!healthData.success) {
    throw new Error('Backend server is not healthy: ' + JSON.stringify(healthData));
  }
  console.log('✓ Backend API server is healthy and connected to database.');

  // Authorized Startup User
  const startupUser = {
    id: 'f4fa9883-417d-4f05-8ea9-0294d71d65a8',
    email: 'vikas@mediqueue.ai',
    role: 'STARTUP'
  };
  const startupToken = generateToken(startupUser);

  // Secondary Startup User for unauthorized access test
  const foreignStartupUser = {
    id: '2ab3f9a4-4d41-4bce-91c1-b41b51a7d755',
    email: 'founder_1789634059528@hardenedtech.in',
    role: 'STARTUP'
  };
  const foreignToken = generateToken(foreignStartupUser);

  // 1. Fetch pilots list for the startup
  const pilotsRes = await fetch(`${BASE_URL}/pilots`, {
    headers: { Authorization: `Bearer ${startupToken}` }
  });
  const pilotsData = await pilotsRes.json();
  const pilots = pilotsData.data?.pilots || [];
  if (pilots.length < 2) {
    throw new Error(`Expected at least 2 pilots for startup, found ${pilots.length}`);
  }

  const pilot1 = pilots[0];
  const pilot2 = pilots[1];

  console.log(`Pilot 1 ID: ${pilot1.id} (${pilot1.title || 'Pilot 1'})`);
  console.log(`Pilot 2 ID: ${pilot2.id} (${pilot2.title || 'Pilot 2'})`);
  console.log(`Startup User: ${startupUser.email} (${startupUser.id})`);

  // TEST 1: Initial GET of progress updates
  console.log('\n--- TEST 1: Initial GET of progress updates ---');
  const getInitialRes = await fetch(`${BASE_URL}/pilots/${pilot1.id}/progress-updates`, {
    headers: { Authorization: `Bearer ${startupToken}` }
  });
  const getInitialData = await getInitialRes.json();
  console.log('Initial GET status:', getInitialRes.status);
  const initialCount = getInitialData.data?.updates?.length ?? 0;
  console.log('Initial updates count:', initialCount);
  if (getInitialRes.status !== 200) {
    throw new Error(`Expected 200, got ${getInitialRes.status}`);
  }

  // TEST 2: Submit a valid progress update
  console.log('\n--- TEST 2: Submit valid progress update ---');
  const updateTimestamp = Date.now();
  const updateText1 = `[TEST-${updateTimestamp}] Pilot is progressing according to the planned implementation.`;
  const postRes1 = await fetch(`${BASE_URL}/pilots/${pilot1.id}/progress-updates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${startupToken}`
    },
    body: JSON.stringify({
      title: 'Startup Progress Update',
      description: updateText1
    })
  });
  const postData1 = await postRes1.json();
  console.log('POST status:', postRes1.status);
  if (postRes1.status !== 201) {
    throw new Error(`Expected 201 Created, got ${postRes1.status}: ${JSON.stringify(postData1)}`);
  }
  const createdUpdate1 = postData1.data?.update;
  console.log('Created update ID:', createdUpdate1?.id);
  console.log('Created update date:', createdUpdate1?.date);
  if (!createdUpdate1?.id || createdUpdate1.description !== updateText1) {
    throw new Error('Created update object does not match expected content');
  }
  console.log('✓ Update created successfully with persistent ID.');

  // TEST 3 & 4: Re-fetch Pilot 1 updates (Simulate page refresh / reopening pilot)
  console.log('\n--- TEST 3 & 4: Refresh/Reopen Pilot - Fetch saved updates ---');
  const getRefreshedRes = await fetch(`${BASE_URL}/pilots/${pilot1.id}/progress-updates`, {
    headers: { Authorization: `Bearer ${startupToken}` }
  });
  const getRefreshedData = await getRefreshedRes.json();
  console.log('Re-fetch status:', getRefreshedRes.status);
  const foundUpdate1 = getRefreshedData.data?.updates?.find(u => u.id === createdUpdate1.id);
  if (!foundUpdate1) {
    throw new Error('Submitted update was not found after re-fetching (not persistent)!');
  }
  console.log('✓ Persistent record successfully retrieved after refresh:', foundUpdate1.description);

  // TEST 5: Submit multiple updates and verify ordering (newest first)
  console.log('\n--- TEST 5: Submit multiple updates & verify ordering ---');
  const updateText2 = `[TEST-${updateTimestamp}] Second milestone reached. Telemetry calibration completed.`;
  const postRes2 = await fetch(`${BASE_URL}/pilots/${pilot1.id}/progress-updates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${startupToken}`
    },
    body: JSON.stringify({
      title: 'Startup Progress Update',
      description: updateText2
    })
  });
  if (postRes2.status !== 201) {
    throw new Error(`Second update failed with status ${postRes2.status}`);
  }

  const getMultiRes = await fetch(`${BASE_URL}/pilots/${pilot1.id}/progress-updates`, {
    headers: { Authorization: `Bearer ${startupToken}` }
  });
  const getMultiData = await getMultiRes.json();
  const updates = getMultiData.data?.updates || [];
  console.log(`Found ${updates.length} updates for Pilot 1.`);

  const idx2 = updates.findIndex(u => u.description === updateText2);
  const idx1 = updates.findIndex(u => u.description === updateText1);
  if (idx2 > idx1 || idx2 === -1 || idx1 === -1) {
    throw new Error('Updates are not in descending chronological order (newest first)');
  }
  console.log('✓ Multiple updates submitted and correctly ordered with newest first.');

  // TEST 6: Validation check - reject empty update
  console.log('\n--- TEST 6: Validation - reject empty update ---');
  const emptyRes = await fetch(`${BASE_URL}/pilots/${pilot1.id}/progress-updates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${startupToken}`
    },
    body: JSON.stringify({
      description: '   '
    })
  });
  console.log('Empty update status:', emptyRes.status);
  if (emptyRes.status !== 400 && emptyRes.status !== 422) {
    throw new Error(`Expected 400/422 Validation Error for empty update, got ${emptyRes.status}`);
  }
  console.log(`✓ Empty update rejected with HTTP ${emptyRes.status} (Validation Error).`);

  // TEST 7: Cross-pilot isolation
  console.log('\n--- TEST 7: Cross-pilot isolation ---');
  const pilot2Res = await fetch(`${BASE_URL}/pilots/${pilot2.id}/progress-updates`, {
    headers: { Authorization: `Bearer ${startupToken}` }
  });
  const pilot2Data = await pilot2Res.json();
  const pilot2Updates = pilot2Data.data?.updates || [];
  const leakedUpdate = pilot2Updates.find(u => u.description === updateText1 || u.description === updateText2);
  if (leakedUpdate) {
    throw new Error('Update leaked from Pilot 1 into Pilot 2!');
  }
  console.log('✓ Verified: Updates from Pilot 1 do not leak into Pilot 2.');

  // TEST 7b: Security check - unauthorized startup access
  console.log('\n--- TEST 7b: Security check - unauthorized startup access ---');
  const unauthRes = await fetch(`${BASE_URL}/pilots/${pilot1.id}/progress-updates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${foreignToken}`
    },
    body: JSON.stringify({
      description: 'Malicious update attempt by unauthorized startup'
    })
  });
  console.log('Unauthorized startup POST status:', unauthRes.status);
  if (unauthRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for foreign startup, got ${unauthRes.status}`);
  }
  console.log('✓ Unauthorized access prevented with 403 Forbidden.');

  // TEST 8: Existing sub-resources regression check
  console.log('\n--- TEST 8: Existing sub-resources regression check ---');
  const [kpiRes, compRes, fbRes, issuesRes, evRes] = await Promise.all([
    fetch(`${BASE_URL}/pilots/${pilot1.id}/kpis`, { headers: { Authorization: `Bearer ${startupToken}` } }),
    fetch(`${BASE_URL}/pilots/${pilot1.id}/compliance`, { headers: { Authorization: `Bearer ${startupToken}` } }),
    fetch(`${BASE_URL}/pilots/${pilot1.id}/feedback`, { headers: { Authorization: `Bearer ${startupToken}` } }),
    fetch(`${BASE_URL}/pilots/${pilot1.id}/issues`, { headers: { Authorization: `Bearer ${startupToken}` } }),
    fetch(`${BASE_URL}/pilots/${pilot1.id}/evidence`, { headers: { Authorization: `Bearer ${startupToken}` } }),
  ]);

  console.log('KPIs endpoint status:', kpiRes.status);
  console.log('Compliance endpoint status:', compRes.status);
  console.log('Feedback endpoint status:', fbRes.status);
  console.log('Issues endpoint status:', issuesRes.status);
  console.log('Evidence endpoint status:', evRes.status);

  if (kpiRes.status !== 200 || compRes.status !== 200 || fbRes.status !== 200 || issuesRes.status !== 200 || evRes.status !== 200) {
    throw new Error('One or more existing sub-resource endpoints failed!');
  }
  console.log('✓ All existing endpoints (KPIs, Compliance, Feedback, Issues, Evidence) operating normally without regressions.');

  console.log('\n=== ALL 8 VERIFICATION TESTS PASSED SUCCESSFULLY! ===\n');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Test failure:', err);
    process.exit(1);
  });
