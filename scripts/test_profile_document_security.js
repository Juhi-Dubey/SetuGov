/**
 * SetuGov Profile and Document Security Test Suite
 * 
 * Verifies role-based security, document security, bank details privacy,
 * and server-side authorization enforcement against ID manipulation (IDOR)
 * across all 4 roles: Government, Evaluator, Startup, and Admin.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5000/api/v1';

const testResults = [];

// Helper to send API requests
async function apiRequest(method, endpoint, token = null, body = null, isFormData = false) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers
  };

  if (body) {
    if (isFormData) {
      options.body = body; // Body is already FormData
    } else {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }

  try {
    const res = await fetch(url, options);
    let data = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch {
        data = null;
      }
    } else {
      try {
        data = await res.text();
      } catch {
        data = null;
      }
    }
    return {
      status: res.status,
      ok: res.ok,
      headers: res.headers,
      data
    };
  } catch (err) {
    return {
      status: 0,
      ok: false,
      error: err.message
    };
  }
}

// Record and format test result
function recordTest({ section, method, endpoint, role, resource, expectedAccess, actualAccess, status, securityIssue = null, notes = '' }) {
  const isPass = status === 'PASS';
  const result = {
    id: testResults.length + 1,
    section,
    method,
    endpoint,
    role,
    resource,
    expectedAccess,
    actualAccess,
    status,
    securityIssue: securityIssue || (isPass ? 'None' : 'Access Control Violation'),
    notes
  };
  testResults.push(result);
  const statusBadge = isPass ? '[PASS]' : '[FAIL]';
  console.log(`${statusBadge} #${result.id} [${section}] ${method} ${endpoint} (${role})`);
  console.log(`       Resource: ${resource}`);
  console.log(`       Expected: ${expectedAccess} | Actual: ${actualAccess}`);
  if (securityIssue) {
    console.log(`       ⚠️ SECURITY ISSUE: ${securityIssue}`);
  }
  if (notes) {
    console.log(`       Details: ${notes}`);
  }
  console.log('');
  return result;
}

// Helper to authenticate
async function login(email, password = 'Password123!') {
  const res = await apiRequest('POST', '/auth/login', null, { email, password });
  if (res.status !== 200 || !res.data?.data?.token) {
    throw new Error(`Failed to login as ${email}: status=${res.status} error=${JSON.stringify(res.data)}`);
  }
  return {
    token: res.data.data.token,
    user: res.data.data.user
  };
}

// Helper to create test PDF buffer
function createDummyPdfBuffer(content = 'Test PDF Document') {
  const header = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\n0000000111 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF');
  return Buffer.concat([header, Buffer.from(`\n% ${content}`)]);
}

// Helper to create fake executable buffer
function createDummyExeBuffer() {
  return Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00');
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('STARTING SETUGOV PROFILE & DOCUMENT SECURITY TEST SUITE');
  console.log('================================================================\n');

  // 1. Authenticate Personas
  console.log('>>> Authenticating Personas...');
  const admin = await login('admin@setugov.in', 'Password123!');
  const govt1 = await login('govt1@setugov.in', 'Password123!');
  const govt2 = await login('govt2@setugov.in', 'Password123!');
  const eval1 = await login('evaluator1@setugov.in', 'Password123!');
  const eval3 = await login('evaluator3@setugov.in', 'Password123!');
  const startup1 = await login('startup1@setugov.in', 'Password123!');
  const startup2 = await login('startup2@setugov.in', 'Password123!');
  
  // Draft startup owner for upload/replace/delete testing
  const startupDraft = await login('innovator_1789918510247@teststartup.in', 'Password123!@#');
  
  // Submitted startup owner with existing verified documents
  const startupWithDocs = await login('innovator_1789919107228_5594@teststartup.in', 'Password123!@#');

  console.log(`  Admin: ${admin.user.email} (${admin.user.id})`);
  console.log(`  Govt 1 (Health): ${govt1.user.email} (${govt1.user.id}, Dept: ${govt1.user.department_id})`);
  console.log(`  Govt 2 (Urban Dev): ${govt2.user.email} (${govt2.user.id}, Dept: ${govt2.user.department_id})`);
  console.log(`  Evaluator 1: ${eval1.user.email} (${eval1.user.id})`);
  console.log(`  Evaluator 3: ${eval3.user.email} (${eval3.user.id})`);
  console.log(`  Startup 1: ${startup1.user.email} (${startup1.user.id})`);
  console.log(`  Startup 2: ${startup2.user.email} (${startup2.user.id})`);
  console.log(`  Startup Draft: ${startupDraft.user.email} (${startupDraft.user.id})`);
  console.log(`  Startup With Docs: ${startupWithDocs.user.email} (${startupWithDocs.user.id})\n`);

  // Retrieve startup records
  const s1MeRes = await apiRequest('GET', '/startups/my-registration', startup1.token);
  const startup1Id = s1MeRes.data?.data?.startup?.id;
  const s2MeRes = await apiRequest('GET', '/startups/my-registration', startup2.token);
  const startup2Id = s2MeRes.data?.data?.startup?.id;
  const sDraftMeRes = await apiRequest('GET', '/startups/my-registration', startupDraft.token);
  const startupDraftId = sDraftMeRes.data?.data?.startup?.id;
  const sDocsMeRes = await apiRequest('GET', '/startups/my-registration', startupWithDocs.token);
  const startupWithDocsId = sDocsMeRes.data?.data?.startup?.id;

  console.log(`  Startup 1 ID (Verified): ${startup1Id}`);
  console.log(`  Startup 2 ID (Verified): ${startup2Id}`);
  console.log(`  Startup Draft ID: ${startupDraftId}`);
  console.log(`  Startup With Docs ID: ${startupWithDocsId}\n`);

  // =========================================================================
  // SECTION 1: GOVERNMENT PROFILE SECURITY
  // =========================================================================
  console.log('=================================================================');
  console.log('SECTION 1: GOVERNMENT PROFILE SECURITY');
  console.log('=================================================================');

  // 1.1 Government can view own profile
  const gov1ViewOwnRes = await apiRequest('GET', `/users/${govt1.user.id}`, govt1.token);
  recordTest({
    section: 'Government Profile',
    method: 'GET',
    endpoint: `/users/${govt1.user.id}`,
    role: 'Government 1',
    resource: 'Own User Profile',
    expectedAccess: 'HTTP 200 OK (View own profile permitted)',
    actualAccess: `HTTP ${gov1ViewOwnRes.status}`,
    status: gov1ViewOwnRes.status === 200 ? 'PASS' : 'FAIL',
    notes: gov1ViewOwnRes.data?.data?.name ? `Officer Name: ${gov1ViewOwnRes.data.data.name}` : ''
  });

  // 1.2 Government can view own session via /auth/me
  const gov1AuthMeRes = await apiRequest('GET', '/auth/me', govt1.token);
  recordTest({
    section: 'Government Profile',
    method: 'GET',
    endpoint: '/auth/me',
    role: 'Government 1',
    resource: 'Current Authenticated Session Profile',
    expectedAccess: 'HTTP 200 OK',
    actualAccess: `HTTP ${gov1AuthMeRes.status}`,
    status: gov1AuthMeRes.status === 200 ? 'PASS' : 'FAIL',
    notes: `Role: ${gov1AuthMeRes.data?.data?.user?.role || gov1AuthMeRes.data?.data?.role}`
  });

  // 1.3 Government can edit permitted fields (name, phone)
  const originalGov1Name = gov1ViewOwnRes.data?.data?.name || 'Dr. Rajesh Kumar';
  const gov1EditPermittedRes = await apiRequest('PATCH', `/users/${govt1.user.id}`, govt1.token, {
    name: 'Dr. Rajesh Kumar (Verified Officer)',
    phone: '9876543210'
  });
  recordTest({
    section: 'Government Profile',
    method: 'PATCH',
    endpoint: `/users/${govt1.user.id}`,
    role: 'Government 1',
    resource: 'Own Profile Permitted Fields (name, phone)',
    expectedAccess: 'HTTP 200 OK (Update allowed for whitelisted fields)',
    actualAccess: `HTTP ${gov1EditPermittedRes.status}`,
    status: gov1EditPermittedRes.status === 200 ? 'PASS' : 'FAIL',
    notes: gov1EditPermittedRes.data?.data?.phone ? `Updated phone: ${gov1EditPermittedRes.data.data.phone}` : ''
  });

  // Revert name back
  await apiRequest('PATCH', `/users/${govt1.user.id}`, govt1.token, { name: originalGov1Name });

  // 1.4 Government cannot edit restricted security field (role: ADMIN)
  const gov1PrivEscRes = await apiRequest('PATCH', `/users/${govt1.user.id}`, govt1.token, {
    role: 'ADMIN'
  });
  const isPrivEscBlocked = gov1PrivEscRes.status === 403 || gov1PrivEscRes.status === 422 || gov1PrivEscRes.status === 400;
  recordTest({
    section: 'Government Profile',
    method: 'PATCH',
    endpoint: `/users/${govt1.user.id}`,
    role: 'Government 1',
    resource: 'Privilege Escalation attempt (role -> ADMIN)',
    expectedAccess: 'HTTP 403 Forbidden / HTTP 422 Rejected',
    actualAccess: `HTTP ${gov1PrivEscRes.status}`,
    status: isPrivEscBlocked ? 'PASS' : 'FAIL',
    notes: gov1PrivEscRes.data?.message || 'Rejected by server-side validation'
  });

  // 1.5 Government cannot edit restricted security field (is_active: false)
  const gov1TamperActiveRes = await apiRequest('PATCH', `/users/${govt1.user.id}`, govt1.token, {
    is_active: false
  });
  const isTamperActiveBlocked = gov1TamperActiveRes.status === 403 || gov1TamperActiveRes.status === 422 || gov1TamperActiveRes.status === 400;
  recordTest({
    section: 'Government Profile',
    method: 'PATCH',
    endpoint: `/users/${govt1.user.id}`,
    role: 'Government 1',
    resource: 'Restricted Status tampering (is_active)',
    expectedAccess: 'HTTP 403 Forbidden / HTTP 422 Rejected',
    actualAccess: `HTTP ${gov1TamperActiveRes.status}`,
    status: isTamperActiveBlocked ? 'PASS' : 'FAIL',
    notes: gov1TamperActiveRes.data?.message || 'Rejected by server-side validation'
  });

  // 1.6 Government cannot reassign department_id
  const gov1ReassignDeptRes = await apiRequest('PATCH', `/users/${govt1.user.id}`, govt1.token, {
    department_id: govt2.user.department_id
  });
  recordTest({
    section: 'Government Profile',
    method: 'PATCH',
    endpoint: `/users/${govt1.user.id}`,
    role: 'Government 1',
    resource: 'Department Reassignment (department_id)',
    expectedAccess: 'HTTP 403 Forbidden (Only administrators can reassign user departments)',
    actualAccess: `HTTP ${gov1ReassignDeptRes.status}`,
    status: gov1ReassignDeptRes.status === 403 ? 'PASS' : 'FAIL',
    notes: gov1ReassignDeptRes.data?.message
  });

  // 1.7 Government cannot edit another Government officer's profile (IDOR)
  const gov1EditGov2Res = await apiRequest('PATCH', `/users/${govt2.user.id}`, govt1.token, {
    name: 'Tampered Govt 2'
  });
  recordTest({
    section: 'Government Profile',
    method: 'PATCH',
    endpoint: `/users/${govt2.user.id}`,
    role: 'Government 1',
    resource: "Another Government Officer's Profile (Govt 2)",
    expectedAccess: 'HTTP 403 Forbidden (You can only update your own user profile)',
    actualAccess: `HTTP ${gov1EditGov2Res.status}`,
    status: gov1EditGov2Res.status === 403 ? 'PASS' : 'FAIL',
    notes: gov1EditGov2Res.data?.message
  });

  // 1.8 Government cannot view another Government officer's profile in different department (IDOR)
  const gov1ViewGov2Res = await apiRequest('GET', `/users/${govt2.user.id}`, govt1.token);
  recordTest({
    section: 'Government Profile',
    method: 'GET',
    endpoint: `/users/${govt2.user.id}`,
    role: 'Government 1',
    resource: "Cross-Department Profile Inspection (Govt 2 in Urban Dev)",
    expectedAccess: 'HTTP 403 Forbidden (Not authorized to view profiles in other departments)',
    actualAccess: `HTTP ${gov1ViewGov2Res.status}`,
    status: gov1ViewGov2Res.status === 403 ? 'PASS' : 'FAIL',
    notes: gov1ViewGov2Res.data?.message
  });

  // 1.9 Government listing users is scoped strictly to caller department
  const gov1ListUsersRes = await apiRequest('GET', '/users', govt1.token);
  const returnedUsers = gov1ListUsersRes.data?.data?.users || [];
  const foreignDeptUsers = returnedUsers.filter(u => u.department_id && u.department_id !== govt1.user.department_id);
  recordTest({
    section: 'Government Profile',
    method: 'GET',
    endpoint: '/users',
    role: 'Government 1',
    resource: 'Department User Directory Scoping',
    expectedAccess: 'HTTP 200 OK with zero foreign department users',
    actualAccess: `HTTP ${gov1ListUsersRes.status} (${returnedUsers.length} users returned, ${foreignDeptUsers.length} foreign department)`,
    status: (gov1ListUsersRes.status === 200 && foreignDeptUsers.length === 0) ? 'PASS' : 'FAIL',
    notes: foreignDeptUsers.length === 0 ? 'Properly scoped to Health department' : `LEAK: Found users from foreign department: ${foreignDeptUsers.map(u => u.department_id)}`
  });

  // 1.10 Government cannot toggle account status (Admin only)
  const gov1ToggleStatusRes = await apiRequest('PATCH', `/users/${govt2.user.id}/status`, govt1.token, {
    is_active: false
  });
  recordTest({
    section: 'Government Profile',
    method: 'PATCH',
    endpoint: `/users/${govt2.user.id}/status`,
    role: 'Government 1',
    resource: 'Administrative User Status Activation Endpoint',
    expectedAccess: 'HTTP 403 Forbidden (Admin only)',
    actualAccess: `HTTP ${gov1ToggleStatusRes.status}`,
    status: gov1ToggleStatusRes.status === 403 ? 'PASS' : 'FAIL',
    notes: gov1ToggleStatusRes.data?.message
  });

  // =========================================================================
  // SECTION 2: EVALUATOR PROFILE SECURITY
  // =========================================================================
  console.log('\n=================================================================');
  console.log('SECTION 2: EVALUATOR PROFILE SECURITY');
  console.log('=================================================================');

  // 2.1 Evaluator can view own profile
  const eval1ProfileRes = await apiRequest('GET', `/evaluators/profile/${eval1.user.id}`, eval1.token);
  const eval1ProfileId = eval1ProfileRes.data?.data?.id;
  recordTest({
    section: 'Evaluator Profile',
    method: 'GET',
    endpoint: `/evaluators/profile/${eval1.user.id}`,
    role: 'Evaluator 1',
    resource: 'Own Evaluator Profile',
    expectedAccess: 'HTTP 200 OK',
    actualAccess: `HTTP ${eval1ProfileRes.status}`,
    status: eval1ProfileRes.status === 200 ? 'PASS' : 'FAIL',
    notes: `Organization: ${eval1ProfileRes.data?.data?.organization}, Status: ${eval1ProfileRes.data?.data?.verification_status}`
  });

  // 2.2 Evaluator can edit permitted fields
  const eval1EditPermittedRes = await apiRequest('PATCH', '/evaluators/profile', eval1.token, {
    organization: 'Indian Institute of Science (IISc)',
    designation: 'Principal Research Scientist',
    domain_expertise: ['HealthTech', 'AI Diagnostics', 'Clinical Validation'],
    years_experience: 14,
    bio: 'Senior evaluator specializing in healthcare AI and clinical informatics.'
  });
  recordTest({
    section: 'Evaluator Profile',
    method: 'PATCH',
    endpoint: '/evaluators/profile',
    role: 'Evaluator 1',
    resource: 'Permitted Profile Fields (organization, designation, bio, expertise)',
    expectedAccess: 'HTTP 200 OK',
    actualAccess: `HTTP ${eval1EditPermittedRes.status}`,
    status: eval1EditPermittedRes.status === 200 ? 'PASS' : 'FAIL',
    notes: `Updated designation: ${eval1EditPermittedRes.data?.data?.designation}`
  });

  // 2.3 Evaluator cannot directly modify verification status via profile update
  const eval1TamperStatusRes = await apiRequest('PATCH', '/evaluators/profile', eval1.token, {
    verification_status: 'REJECTED'
  });
  const eval1CheckStatusRes = await apiRequest('GET', `/evaluators/profile/${eval1.user.id}`, eval1.token);
  const statusRemainedVerified = eval1CheckStatusRes.data?.data?.verification_status === 'VERIFIED';
  recordTest({
    section: 'Evaluator Profile',
    method: 'PATCH',
    endpoint: '/evaluators/profile',
    role: 'Evaluator 1',
    resource: 'Verification Status Tampering via Self-Profile Update',
    expectedAccess: 'verification_status is server-controlled and cannot be altered by Evaluator',
    actualAccess: `verification_status=${eval1CheckStatusRes.data?.data?.verification_status}`,
    status: statusRemainedVerified ? 'PASS' : 'FAIL',
    notes: statusRemainedVerified ? 'Field ignored by service update whitelist' : 'SECURITY ISSUE: verification_status was mutated!'
  });

  // 2.4 Evaluator cannot invoke Admin verification endpoint
  const eval1VerifySelfRes = await apiRequest('PATCH', `/evaluators/${eval1ProfileId}/verify`, eval1.token, {
    verification_status: 'VERIFIED'
  });
  recordTest({
    section: 'Evaluator Profile',
    method: 'PATCH',
    endpoint: `/evaluators/${eval1ProfileId}/verify`,
    role: 'Evaluator 1',
    resource: 'Admin Evaluator Verification Endpoint (PATCH /:id/verify)',
    expectedAccess: 'HTTP 403 Forbidden (Admin only)',
    actualAccess: `HTTP ${eval1VerifySelfRes.status}`,
    status: eval1VerifySelfRes.status === 403 ? 'PASS' : 'FAIL',
    notes: eval1VerifySelfRes.data?.message
  });

  // 2.5 Government cannot invoke Admin verification endpoint
  const gov1VerifyEvalRes = await apiRequest('PATCH', `/evaluators/${eval1ProfileId}/verify`, govt1.token, {
    verification_status: 'VERIFIED'
  });
  recordTest({
    section: 'Evaluator Profile',
    method: 'PATCH',
    endpoint: `/evaluators/${eval1ProfileId}/verify`,
    role: 'Government 1',
    resource: 'Admin Evaluator Verification Endpoint (Government caller)',
    expectedAccess: 'HTTP 403 Forbidden (Admin only)',
    actualAccess: `HTTP ${gov1VerifyEvalRes.status}`,
    status: gov1VerifyEvalRes.status === 403 ? 'PASS' : 'FAIL',
    notes: gov1VerifyEvalRes.data?.message
  });

  // 2.6 Government viewing evaluator pool only sees VERIFIED and active evaluators
  const gov1ListEvaluatorsRes = await apiRequest('GET', '/evaluators', govt1.token);
  const evalsList = gov1ListEvaluatorsRes.data?.data?.evaluators || [];
  const unverifiedEvals = evalsList.filter(e => e.verification_status !== 'VERIFIED' || !e.user?.is_active);
  recordTest({
    section: 'Evaluator Profile',
    method: 'GET',
    endpoint: '/evaluators',
    role: 'Government 1',
    resource: 'Evaluator Selection Pool Filtering',
    expectedAccess: 'HTTP 200 OK with ONLY VERIFIED and active evaluators',
    actualAccess: `HTTP ${gov1ListEvaluatorsRes.status} (${evalsList.length} returned, ${unverifiedEvals.length} unverified/inactive)`,
    status: (gov1ListEvaluatorsRes.status === 200 && unverifiedEvals.length === 0) ? 'PASS' : 'FAIL',
    notes: unverifiedEvals.length === 0 ? 'Strictly restricted to VERIFIED active evaluators' : `LEAK: Found unverified evaluators: ${unverifiedEvals.map(e => e.id)}`
  });

  // 2.7 Anonymous cannot list evaluators
  const anonListEvaluatorsRes = await apiRequest('GET', '/evaluators', null);
  recordTest({
    section: 'Evaluator Profile',
    method: 'GET',
    endpoint: '/evaluators',
    role: 'Anonymous',
    resource: 'Evaluator Pool Directory',
    expectedAccess: 'HTTP 401 Unauthorized',
    actualAccess: `HTTP ${anonListEvaluatorsRes.status}`,
    status: anonListEvaluatorsRes.status === 401 ? 'PASS' : 'FAIL',
    notes: anonListEvaluatorsRes.data?.message
  });

  // =========================================================================
  // SECTION 3: STARTUP PROFILE SECURITY
  // =========================================================================
  console.log('\n=================================================================');
  console.log('SECTION 3: STARTUP PROFILE SECURITY');
  console.log('=================================================================');

  // 3.1 Startup can view own profile
  const s1ViewOwnRes = await apiRequest('GET', `/startups/${startup1Id}`, startup1.token);
  recordTest({
    section: 'Startup Profile',
    method: 'GET',
    endpoint: `/startups/${startup1Id}`,
    role: 'Startup 1 (Owner)',
    resource: 'Own Startup Profile',
    expectedAccess: 'HTTP 200 OK',
    actualAccess: `HTTP ${s1ViewOwnRes.status}`,
    status: s1ViewOwnRes.status === 200 ? 'PASS' : 'FAIL',
    notes: `Company: ${s1ViewOwnRes.data?.data?.startup?.company_name}`
  });

  // 3.2 Startup can view own dossier via /startups/my-registration
  recordTest({
    section: 'Startup Profile',
    method: 'GET',
    endpoint: '/startups/my-registration',
    role: 'Startup 1',
    resource: 'Own Registration Dossier',
    expectedAccess: 'HTTP 200 OK with Startup 1 records',
    actualAccess: `HTTP ${s1MeRes.status}`,
    status: (s1MeRes.status === 200 && s1MeRes.data?.data?.startup?.id === startup1Id) ? 'PASS' : 'FAIL',
    notes: `Dossier ID: ${s1MeRes.data?.data?.startup?.id}`
  });

  // 3.3 Startup 2 /startups/my-registration returns strictly Startup 2 dossier
  recordTest({
    section: 'Startup Profile',
    method: 'GET',
    endpoint: '/startups/my-registration',
    role: 'Startup 2',
    resource: 'Own Registration Dossier (Cross-tenant check)',
    expectedAccess: 'HTTP 200 OK with Startup 2 records only',
    actualAccess: `HTTP ${s2MeRes.status}`,
    status: (s2MeRes.status === 200 && s2MeRes.data?.data?.startup?.id === startup2Id && s2MeRes.data?.data?.startup?.id !== startup1Id) ? 'PASS' : 'FAIL',
    notes: `Dossier ID: ${s2MeRes.data?.data?.startup?.id}`
  });

  // 3.4 Startup can edit permitted fields in DRAFT status
  const draftEditPermittedRes = await apiRequest('PATCH', `/startups/${startupDraftId}`, startupDraft.token, {
    company_name: 'Innovative Telemedicine Solutions Pvt Ltd',
    description: 'Developing next-generation zero-trust remote healthcare diagnostic devices.',
    technologies: ['React', 'Node.js', 'PostgreSQL', 'WebRTC', 'HL7-FHIR'],
    readiness_level: 6,
    domain: 'Healthcare'
  });
  recordTest({
    section: 'Startup Profile',
    method: 'PATCH',
    endpoint: `/startups/${startupDraftId}`,
    role: 'Startup (Owner - DRAFT)',
    resource: 'Permitted Startup Profile Fields (name, desc, techs, readiness)',
    expectedAccess: 'HTTP 200 OK',
    actualAccess: `HTTP ${draftEditPermittedRes.status}`,
    status: draftEditPermittedRes.status === 200 ? 'PASS' : 'FAIL',
    notes: `Updated company: ${draftEditPermittedRes.data?.data?.startup?.company_name}`
  });

  // 3.5 Startup 1 editing a VERIFIED profile is blocked (locked dossier guard)
  const s1EditVerifiedRes = await apiRequest('PATCH', `/startups/${startup1Id}`, startup1.token, {
    company_name: 'Tampered Verified Startup'
  });
  recordTest({
    section: 'Startup Profile',
    method: 'PATCH',
    endpoint: `/startups/${startup1Id}`,
    role: 'Startup 1',
    resource: 'Verified Profile Mutation Guard',
    expectedAccess: 'HTTP 400 Bad Request (Profile editing locked once verified)',
    actualAccess: `HTTP ${s1EditVerifiedRes.status}`,
    status: s1EditVerifiedRes.status === 400 ? 'PASS' : 'FAIL',
    notes: s1EditVerifiedRes.data?.message
  });

  // 3.6 Startup cannot modify verification status directly
  const sDraftTamperVerificationRes = await apiRequest('PATCH', `/startups/${startupDraftId}`, startupDraft.token, {
    verification_status: 'VERIFIED'
  });
  const isTamperVerificationBlocked = sDraftTamperVerificationRes.status === 400 || sDraftTamperVerificationRes.status === 422 || sDraftTamperVerificationRes.status === 403;
  recordTest({
    section: 'Startup Profile',
    method: 'PATCH',
    endpoint: `/startups/${startupDraftId}`,
    role: 'Startup (Owner - DRAFT)',
    resource: 'Verification Status Tampering attempt (verification_status: VERIFIED)',
    expectedAccess: 'HTTP 400 Bad Request / HTTP 422 Rejected',
    actualAccess: `HTTP ${sDraftTamperVerificationRes.status}`,
    status: isTamperVerificationBlocked ? 'PASS' : 'FAIL',
    notes: sDraftTamperVerificationRes.data?.message || 'Rejected by strict schema whitelist'
  });

  // 3.7 Startup cannot invoke Admin verification endpoint
  const s1VerifyAdminRes = await apiRequest('PATCH', `/startups/${startup1Id}/verification`, startup1.token, {
    verification_status: 'VERIFIED'
  });
  recordTest({
    section: 'Startup Profile',
    method: 'PATCH',
    endpoint: `/startups/${startup1Id}/verification`,
    role: 'Startup 1',
    resource: 'Admin Startup Verification Endpoint (PATCH /:id/verification)',
    expectedAccess: 'HTTP 403 Forbidden (Admin only)',
    actualAccess: `HTTP ${s1VerifyAdminRes.status}`,
    status: s1VerifyAdminRes.status === 403 ? 'PASS' : 'FAIL',
    notes: s1VerifyAdminRes.data?.message
  });

  // 3.8 Startup 1 cannot edit Startup 2 profile (IDOR)
  const s1EditS2Res = await apiRequest('PATCH', `/startups/${startup2Id}`, startup1.token, {
    company_name: 'Hijacked Startup 2'
  });
  recordTest({
    section: 'Startup Profile',
    method: 'PATCH',
    endpoint: `/startups/${startup2Id}`,
    role: 'Startup 1',
    resource: "Another Startup's Profile (Startup 2)",
    expectedAccess: 'HTTP 403 Forbidden (You can only update your own startup profile)',
    actualAccess: `HTTP ${s1EditS2Res.status}`,
    status: s1EditS2Res.status === 403 ? 'PASS' : 'FAIL',
    notes: s1EditS2Res.data?.message
  });

  // 3.9 Startup 1 viewing Startup 2 profile does not leak sensitive fields
  const s1ViewS2Res = await apiRequest('GET', `/startups/${startup2Id}`, startup1.token);
  const leakedBankInProfile = s1ViewS2Res.data?.data?.startup?.bank_details || s1ViewS2Res.data?.data?.bank_details;
  recordTest({
    section: 'Startup Profile',
    method: 'GET',
    endpoint: `/startups/${startup2Id}`,
    role: 'Startup 1',
    resource: "Another Startup's Profile - Data Sanitization",
    expectedAccess: 'HTTP 200 OK with bank_details completely stripped',
    actualAccess: `HTTP ${s1ViewS2Res.status} (bank_details: ${leakedBankInProfile ? 'EXPOSED' : 'STRIPPED'})`,
    status: (s1ViewS2Res.status === 200 && !leakedBankInProfile) ? 'PASS' : 'FAIL',
    notes: !leakedBankInProfile ? 'Bank details properly sanitized for non-owner' : 'CRITICAL LEAK: Private bank_details exposed to foreign startup!'
  });

  // =========================================================================
  // SECTION 4: STARTUP DOCUMENTS SECURITY
  // =========================================================================
  console.log('\n=================================================================');
  console.log('SECTION 4: STARTUP DOCUMENTS SECURITY');
  console.log('=================================================================');

  // 4.1 Valid Document Upload (PDF) in DRAFT state
  const validPdfBuf = createDummyPdfBuffer('Valid Income Tax PAN Proof');
  const formValid = new FormData();
  formValid.append('file', new Blob([validPdfBuf], { type: 'application/pdf' }), 'pan_card.pdf');
  formValid.append('document_type', 'PAN');

  const validUploadRes = await apiRequest('POST', `/startups/${startupDraftId}/documents`, startupDraft.token, formValid, true);
  const uploadedDocId = validUploadRes.data?.data?.document?.id || validUploadRes.data?.data?.id;
  const uploadedDocUrl = validUploadRes.data?.data?.document?.document_url || validUploadRes.data?.data?.document_url;
  const uploadedFilename = uploadedDocUrl ? path.basename(uploadedDocUrl) : null;

  recordTest({
    section: 'Startup Documents',
    method: 'POST',
    endpoint: `/startups/${startupDraftId}/documents`,
    role: 'Startup (Owner - DRAFT)',
    resource: 'Valid Document Upload (PDF)',
    expectedAccess: 'HTTP 201 Created',
    actualAccess: `HTTP ${validUploadRes.status}`,
    status: validUploadRes.status === 201 ? 'PASS' : 'FAIL',
    notes: `Doc ID: ${uploadedDocId}, Stored URL: ${uploadedDocUrl}`
  });

  // 4.2 Invalid File Type Rejection (.exe)
  const exeBuf = createDummyExeBuffer();
  const formExe = new FormData();
  formExe.append('file', new Blob([exeBuf], { type: 'application/x-msdownload' }), 'malicious_agent.exe');
  formExe.append('document_type', 'INCORPORATION_CERTIFICATE');

  const exeUploadRes = await apiRequest('POST', `/startups/${startupDraftId}/documents`, startupDraft.token, formExe, true);
  recordTest({
    section: 'Startup Documents',
    method: 'POST',
    endpoint: `/startups/${startupDraftId}/documents`,
    role: 'Startup (Owner - DRAFT)',
    resource: 'Executable Upload (.exe) Rejection',
    expectedAccess: 'HTTP 400 Bad Request (Invalid file type)',
    actualAccess: `HTTP ${exeUploadRes.status}`,
    status: exeUploadRes.status === 400 ? 'PASS' : 'FAIL',
    notes: exeUploadRes.data?.message
  });

  // 4.3 Disguised File Signature Spoofing (Executable renamed to .pdf with MZ header)
  const formSpoofed = new FormData();
  formSpoofed.append('file', new Blob([exeBuf], { type: 'application/pdf' }), 'trojan_disguised.pdf');
  formSpoofed.append('document_type', 'BANK_PROOF');

  const spoofedUploadRes = await apiRequest('POST', `/startups/${startupDraftId}/documents`, startupDraft.token, formSpoofed, true);
  recordTest({
    section: 'Startup Documents',
    method: 'POST',
    endpoint: `/startups/${startupDraftId}/documents`,
    role: 'Startup (Owner - DRAFT)',
    resource: 'Binary Magic Bytes Spoofing Defense',
    expectedAccess: 'HTTP 400 Bad Request (Uploaded file content does not match allowable format signatures)',
    actualAccess: `HTTP ${spoofedUploadRes.status}`,
    status: spoofedUploadRes.status === 400 ? 'PASS' : 'FAIL',
    notes: spoofedUploadRes.data?.message
  });

  // 4.4 Oversized File Rejection (> 50MB)
  console.log('Testing oversized file upload (> 50MB)...');
  const oversizedBuf = Buffer.alloc(52 * 1024 * 1024);
  oversizedBuf.write('%PDF-1.4\n', 0);
  const formOversized = new FormData();
  formOversized.append('file', new Blob([oversizedBuf], { type: 'application/pdf' }), 'huge_document.pdf');
  formOversized.append('document_type', 'ANNUAL_REPORT');

  const oversizedUploadRes = await apiRequest('POST', `/startups/${startupDraftId}/documents`, startupDraft.token, formOversized, true);
  recordTest({
    section: 'Startup Documents',
    method: 'POST',
    endpoint: `/startups/${startupDraftId}/documents`,
    role: 'Startup (Owner - DRAFT)',
    resource: 'Oversized File Rejection (> 50MB)',
    expectedAccess: 'HTTP 400 Bad Request (File exceeds maximum allowable size)',
    actualAccess: `HTTP ${oversizedUploadRes.status}`,
    status: oversizedUploadRes.status === 400 ? 'PASS' : 'FAIL',
    notes: oversizedUploadRes.data?.message
  });

  // 4.5 Document Metadata Manipulation: Arbitrary External URL Injection
  const extUrlTamperRes = await apiRequest('POST', `/startups/${startupDraftId}/documents`, startupDraft.token, {
    document_type: 'GST_CERTIFICATE',
    document_url: 'http://malicious-external-server.com/payload.pdf',
    file_name: 'payload.pdf'
  });
  recordTest({
    section: 'Startup Documents',
    method: 'POST',
    endpoint: `/startups/${startupDraftId}/documents`,
    role: 'Startup (Owner - DRAFT)',
    resource: 'External URL Metadata Injection Defense',
    expectedAccess: 'HTTP 400 Bad Request (External URLs are not permitted)',
    actualAccess: `HTTP ${extUrlTamperRes.status}`,
    status: extUrlTamperRes.status === 400 ? 'PASS' : 'FAIL',
    notes: extUrlTamperRes.data?.message
  });

  // 4.6 Document Metadata Manipulation: Data URI / Path Traversal
  const pathTraversalDocRes = await apiRequest('POST', `/startups/${startupDraftId}/documents`, startupDraft.token, {
    document_type: 'PAN',
    document_url: 'data:text/html,<script>alert(1)</script>',
    file_name: 'xss.html'
  });
  recordTest({
    section: 'Startup Documents',
    method: 'POST',
    endpoint: `/startups/${startupDraftId}/documents`,
    role: 'Startup (Owner - DRAFT)',
    resource: 'Data URI Metadata Injection Defense',
    expectedAccess: 'HTTP 400 Bad Request',
    actualAccess: `HTTP ${pathTraversalDocRes.status}`,
    status: pathTraversalDocRes.status === 400 ? 'PASS' : 'FAIL',
    notes: pathTraversalDocRes.data?.message
  });

  // 4.7 Startup 1 cannot upload document to Startup 2 (IDOR)
  const s1UploadToS2Res = await apiRequest('POST', `/startups/${startup2Id}/documents`, startup1.token, {
    document_type: 'PAN',
    document_url: '/api/v1/documents/fake_pan.pdf',
    file_name: 'fake_pan.pdf'
  });
  recordTest({
    section: 'Startup Documents',
    method: 'POST',
    endpoint: `/startups/${startup2Id}/documents`,
    role: 'Startup 1',
    resource: "Document Injection into Foreign Startup Dossier (IDOR)",
    expectedAccess: 'HTTP 403 Forbidden (You can only upload documents for your own startup)',
    actualAccess: `HTTP ${s1UploadToS2Res.status}`,
    status: s1UploadToS2Res.status === 403 ? 'PASS' : 'FAIL',
    notes: s1UploadToS2Res.data?.message
  });

  // 4.8 Startup can view own documents
  const draftViewDocsRes = await apiRequest('GET', `/startups/${startupDraftId}/documents`, startupDraft.token);
  const docsList = draftViewDocsRes.data?.data?.documents || draftViewDocsRes.data?.data || [];
  recordTest({
    section: 'Startup Documents',
    method: 'GET',
    endpoint: `/startups/${startupDraftId}/documents`,
    role: 'Startup (Owner - DRAFT)',
    resource: 'Own Startup Documents Listing',
    expectedAccess: 'HTTP 200 OK',
    actualAccess: `HTTP ${draftViewDocsRes.status}`,
    status: draftViewDocsRes.status === 200 ? 'PASS' : 'FAIL',
    notes: `Documents count: ${docsList.length}`
  });

  // 4.9 Startup A cannot view Startup B documents (IDOR)
  const s1ViewS2DocsRes = await apiRequest('GET', `/startups/${startup2Id}/documents`, startup1.token);
  recordTest({
    section: 'Startup Documents',
    method: 'GET',
    endpoint: `/startups/${startup2Id}/documents`,
    role: 'Startup 1',
    resource: "Foreign Startup's Documents Listing (Startup 2)",
    expectedAccess: 'HTTP 403 Forbidden (You can only view documents for your own startup)',
    actualAccess: `HTTP ${s1ViewS2DocsRes.status}`,
    status: s1ViewS2DocsRes.status === 403 ? 'PASS' : 'FAIL',
    notes: s1ViewS2DocsRes.data?.message
  });

  // 4.10 Startup A cannot delete Startup B documents (IDOR)
  const s1DeleteS2DocRes = await apiRequest('DELETE', `/startups/${startup2Id}/documents/00000000-0000-0000-0000-000000000001`, startup1.token);
  recordTest({
    section: 'Startup Documents',
    method: 'DELETE',
    endpoint: `/startups/${startup2Id}/documents/:doc_id`,
    role: 'Startup 1',
    resource: "Foreign Startup's Document Deletion (Startup 2)",
    expectedAccess: 'HTTP 403 Forbidden (You can only delete documents for your own startup)',
    actualAccess: `HTTP ${s1DeleteS2DocRes.status}`,
    status: s1DeleteS2DocRes.status === 403 ? 'PASS' : 'FAIL',
    notes: s1DeleteS2DocRes.data?.message
  });

  // 4.11 Owner can delete own document in DRAFT status
  const ownerDeleteDocRes = await apiRequest('DELETE', `/startups/${startupDraftId}/documents/${uploadedDocId}`, startupDraft.token);
  recordTest({
    section: 'Startup Documents',
    method: 'DELETE',
    endpoint: `/startups/${startupDraftId}/documents/${uploadedDocId}`,
    role: 'Startup (Owner - DRAFT)',
    resource: 'Own Document Deletion in DRAFT State',
    expectedAccess: 'HTTP 200 OK (Document removed successfully)',
    actualAccess: `HTTP ${ownerDeleteDocRes.status}`,
    status: ownerDeleteDocRes.status === 200 ? 'PASS' : 'FAIL',
    notes: ownerDeleteDocRes.data?.message
  });

  // Re-upload a document for direct URL testing
  const formReupload = new FormData();
  formReupload.append('file', new Blob([validPdfBuf], { type: 'application/pdf' }), 'reuploaded_proof.pdf');
  formReupload.append('document_type', 'INCORPORATION_CERTIFICATE');
  const reuploadRes = await apiRequest('POST', `/startups/${startupDraftId}/documents`, startupDraft.token, formReupload, true);
  const activeDocUrl = reuploadRes.data?.data?.document?.document_url || reuploadRes.data?.data?.document_url;
  const activeFilename = activeDocUrl ? path.basename(activeDocUrl) : null;
  console.log(`Re-uploaded document for direct URL tests: ${activeFilename}`);

  // 4.12 Direct URL Download Tests:
  // (a) Owner downloads own document via direct URL
  const ownerDownloadRes = await apiRequest('GET', `/documents/${activeFilename}`, startupDraft.token);
  recordTest({
    section: 'Startup Documents',
    method: 'GET',
    endpoint: `/documents/${activeFilename}`,
    role: 'Startup (Owner - DRAFT)',
    resource: 'Direct Document URL Download (Owner)',
    expectedAccess: 'HTTP 200 OK',
    actualAccess: `HTTP ${ownerDownloadRes.status}`,
    status: ownerDownloadRes.status === 200 ? 'PASS' : 'FAIL',
    notes: 'Owner authorized to retrieve stored document'
  });

  // (b) Unauthorized Startup attempts download via direct URL
  const unauthorizedStartupDownloadRes = await apiRequest('GET', `/documents/${activeFilename}`, startup2.token);
  recordTest({
    section: 'Startup Documents',
    method: 'GET',
    endpoint: `/documents/${activeFilename}`,
    role: 'Startup 2 (Unauthorized)',
    resource: 'Direct Document URL Download (Foreign Startup)',
    expectedAccess: 'HTTP 403 Forbidden',
    actualAccess: `HTTP ${unauthorizedStartupDownloadRes.status}`,
    status: unauthorizedStartupDownloadRes.status === 403 ? 'PASS' : 'FAIL',
    notes: unauthorizedStartupDownloadRes.status === 403 ? 'Unauthorized startup blocked' : 'SECURITY ISSUE: Foreign startup accessed private document!'
  });

  // (c) Anonymous / Unauthenticated direct document URL request
  const anonDirectDocRes = await apiRequest('GET', `/documents/${activeFilename}`, null);
  const isAnonBlocked = anonDirectDocRes.status === 401 || anonDirectDocRes.status === 403;
  recordTest({
    section: 'Startup Documents',
    method: 'GET',
    endpoint: `/documents/${activeFilename}`,
    role: 'Anonymous',
    resource: 'Direct Document URL Download (Unauthenticated)',
    expectedAccess: 'HTTP 401 Unauthorized / HTTP 403 Forbidden',
    actualAccess: `HTTP ${anonDirectDocRes.status}`,
    status: isAnonBlocked ? 'PASS' : 'FAIL',
    securityIssue: isAnonBlocked ? null : 'CWE-306 / CWE-639: Unauthenticated Document Authorization Bypass',
    notes: isAnonBlocked ? 'Anonymous download blocked' : 'VULNERABILITY: Direct document URL allows unauthenticated bypass of authorization!'
  });

  // (d) Direct private upload endpoint (/uploads/private/:filename)
  const anonPrivateDocRes = await apiRequest('GET', `/uploads/private/${activeFilename}`, null);
  recordTest({
    section: 'Startup Documents',
    method: 'GET',
    endpoint: `/uploads/private/${activeFilename}`,
    role: 'Anonymous',
    resource: 'Private Upload Route (/uploads/private/:filename)',
    expectedAccess: 'HTTP 401 Unauthorized',
    actualAccess: `HTTP ${anonPrivateDocRes.status}`,
    status: anonPrivateDocRes.status === 401 ? 'PASS' : 'FAIL',
    notes: 'Protected by authenticate middleware'
  });

  // 4.13 Government and Evaluator Document Access Authorization:
  // (a) Govt 1 (Health) viewing Startup 1 documents (has active challenge/application/pilot relationship)
  const gov1ViewS1DocsRes = await apiRequest('GET', `/startups/${startup1Id}/documents`, govt1.token);
  recordTest({
    section: 'Startup Documents',
    method: 'GET',
    endpoint: `/startups/${startup1Id}/documents`,
    role: 'Government 1 (Health)',
    resource: "Startup 1 Documents (Active department relationship)",
    expectedAccess: 'HTTP 200 OK',
    actualAccess: `HTTP ${gov1ViewS1DocsRes.status}`,
    status: gov1ViewS1DocsRes.status === 200 ? 'PASS' : 'FAIL',
    notes: `Documents visible: ${gov1ViewS1DocsRes.data?.data?.documents?.length || gov1ViewS1DocsRes.data?.data?.length || 0}`
  });

  // (b) Govt 2 (Urban Dev) viewing Startup 1 documents (no relationship)
  const gov2ViewS1DocsRes = await apiRequest('GET', `/startups/${startup1Id}/documents`, govt2.token);
  recordTest({
    section: 'Startup Documents',
    method: 'GET',
    endpoint: `/startups/${startup1Id}/documents`,
    role: 'Government 2 (Urban Dev)',
    resource: "Startup 1 Documents (No department relationship)",
    expectedAccess: 'HTTP 403 Forbidden (No authorization to view documents)',
    actualAccess: `HTTP ${gov2ViewS1DocsRes.status}`,
    status: gov2ViewS1DocsRes.status === 403 ? 'PASS' : 'FAIL',
    notes: gov2ViewS1DocsRes.data?.message
  });

  // (c) Evaluator 1 (Assigned) viewing Startup 1 documents
  const eval1ViewS1DocsRes = await apiRequest('GET', `/startups/${startup1Id}/documents`, eval1.token);
  recordTest({
    section: 'Startup Documents',
    method: 'GET',
    endpoint: `/startups/${startup1Id}/documents`,
    role: 'Evaluator 1 (Assigned)',
    resource: "Startup 1 Documents (Active evaluation assignment)",
    expectedAccess: 'HTTP 200 OK',
    actualAccess: `HTTP ${eval1ViewS1DocsRes.status}`,
    status: eval1ViewS1DocsRes.status === 200 ? 'PASS' : 'FAIL',
    notes: `Documents visible: ${eval1ViewS1DocsRes.data?.data?.documents?.length || eval1ViewS1DocsRes.data?.data?.length || 0}`
  });

  // (d) Evaluator 3 (Unassigned) viewing Startup Draft documents
  const eval3ViewDraftDocsRes = await apiRequest('GET', `/startups/${startupDraftId}/documents`, eval3.token);
  recordTest({
    section: 'Startup Documents',
    method: 'GET',
    endpoint: `/startups/${startupDraftId}/documents`,
    role: 'Evaluator 3 (Unassigned)',
    resource: "Unassigned Startup Documents (No active assignment)",
    expectedAccess: 'HTTP 403 Forbidden (No active assignment to evaluate this startup)',
    actualAccess: `HTTP ${eval3ViewDraftDocsRes.status}`,
    status: eval3ViewDraftDocsRes.status === 403 ? 'PASS' : 'FAIL',
    notes: eval3ViewDraftDocsRes.data?.message
  });

  // =========================================================================
  // SECTION 5: BANK DETAILS SECURITY
  // =========================================================================
  console.log('\n=================================================================');
  console.log('SECTION 5: BANK DETAILS SECURITY');
  console.log('=================================================================');

  // 5.1 Startup can view own bank details
  const s1BankRes = await apiRequest('GET', `/startups/${startup1Id}/bank-details`, startup1.token);
  recordTest({
    section: 'Bank Details',
    method: 'GET',
    endpoint: `/startups/${startup1Id}/bank-details`,
    role: 'Startup 1 (Owner)',
    resource: 'Own Bank Details',
    expectedAccess: 'HTTP 200 OK',
    actualAccess: `HTTP ${s1BankRes.status}`,
    status: s1BankRes.status === 200 ? 'PASS' : 'FAIL',
    notes: `Bank: ${s1BankRes.data?.data?.bank_details?.bank_name || s1BankRes.data?.data?.bank_name}, IFSC: ${s1BankRes.data?.data?.bank_details?.ifsc_code || s1BankRes.data?.data?.ifsc_code}`
  });

  // 5.2 Startup 1 cannot view Startup 2 bank details (IDOR)
  const s1GetS2BankRes = await apiRequest('GET', `/startups/${startup2Id}/bank-details`, startup1.token);
  recordTest({
    section: 'Bank Details',
    method: 'GET',
    endpoint: `/startups/${startup2Id}/bank-details`,
    role: 'Startup 1',
    resource: "Another Startup's Bank Details (Startup 2)",
    expectedAccess: 'HTTP 403 Forbidden (You are not authorized to view bank details)',
    actualAccess: `HTTP ${s1GetS2BankRes.status}`,
    status: s1GetS2BankRes.status === 403 ? 'PASS' : 'FAIL',
    notes: s1GetS2BankRes.data?.message
  });

  // 5.3 Startup 1 cannot update Startup 2 bank details (IDOR)
  const s1UpdateS2BankRes = await apiRequest('POST', `/startups/${startup2Id}/bank-details`, startup1.token, {
    account_holder_name: 'Malicious Attacker',
    bank_name: 'State Bank of India',
    account_number: '987654321012',
    ifsc_code: 'SBIN0001234'
  });
  recordTest({
    section: 'Bank Details',
    method: 'POST',
    endpoint: `/startups/${startup2Id}/bank-details`,
    role: 'Startup 1',
    resource: "Bank Details Poisoning (Startup 2)",
    expectedAccess: 'HTTP 403 Forbidden (You can only update bank details for your own startup)',
    actualAccess: `HTTP ${s1UpdateS2BankRes.status}`,
    status: s1UpdateS2BankRes.status === 403 ? 'PASS' : 'FAIL',
    notes: s1UpdateS2BankRes.data?.message
  });

  // 5.4 Evaluator cannot view bank details
  const eval1GetBankRes = await apiRequest('GET', `/startups/${startup1Id}/bank-details`, eval1.token);
  recordTest({
    section: 'Bank Details',
    method: 'GET',
    endpoint: `/startups/${startup1Id}/bank-details`,
    role: 'Evaluator 1',
    resource: 'Startup Bank Details Direct Access',
    expectedAccess: 'HTTP 403 Forbidden',
    actualAccess: `HTTP ${eval1GetBankRes.status}`,
    status: eval1GetBankRes.status === 403 ? 'PASS' : 'FAIL',
    notes: eval1GetBankRes.data?.message
  });

  // 5.5 Government cannot access direct bank details endpoint
  const gov1GetBankRes = await apiRequest('GET', `/startups/${startup1Id}/bank-details`, govt1.token);
  recordTest({
    section: 'Bank Details',
    method: 'GET',
    endpoint: `/startups/${startup1Id}/bank-details`,
    role: 'Government 1',
    resource: 'Startup Bank Details Direct Access',
    expectedAccess: 'HTTP 403 Forbidden (Direct bank details restricted to Owner and Admin)',
    actualAccess: `HTTP ${gov1GetBankRes.status}`,
    status: gov1GetBankRes.status === 403 ? 'PASS' : 'FAIL',
    notes: gov1GetBankRes.data?.message
  });

  // 5.6 Sensitive fields exposure check: Public startup listing does not include bank_details
  const publicStartupsRes = await apiRequest('GET', '/startups', govt1.token);
  const allStartups = publicStartupsRes.data?.data?.startups || [];
  const exposedBankStartups = allStartups.filter(s => s.bank_details !== undefined);
  recordTest({
    section: 'Bank Details',
    method: 'GET',
    endpoint: '/startups',
    role: 'Government 1',
    resource: 'Public Startups Directory',
    expectedAccess: 'HTTP 200 OK with bank_details excluded from schema projection',
    actualAccess: `HTTP ${publicStartupsRes.status} (${exposedBankStartups.length} startups with bank_details)`,
    status: (publicStartupsRes.status === 200 && exposedBankStartups.length === 0) ? 'PASS' : 'FAIL',
    notes: exposedBankStartups.length === 0 ? 'bank_details omitted from select query' : 'SECURITY ISSUE: bank_details found in list query!'
  });

  // 5.7 Account number masking in audit logs and API responses
  const bankData = s1BankRes.data?.data?.bank_details || s1BankRes.data?.data;
  const maskedAccNo = bankData?.masked_account_number;
  const isProperlyMasked = maskedAccNo && (maskedAccNo.includes('•') || maskedAccNo.includes('*'));
  recordTest({
    section: 'Bank Details',
    method: 'GET',
    endpoint: `/startups/${startup1Id}/bank-details`,
    role: 'Startup 1 (Owner)',
    resource: 'Account Number Masking (masked_account_number)',
    expectedAccess: 'Masked account number format (e.g. ••••••••1234 or ****1234)',
    actualAccess: `masked_account_number=${maskedAccNo}`,
    status: isProperlyMasked ? 'PASS' : 'FAIL',
    notes: `Masked value: ${maskedAccNo}`
  });

  // =========================================================================
  // SECTION 6: FINAL ID MANIPULATION (IDOR) MATRIX
  // =========================================================================
  console.log('\n=================================================================');
  console.log('SECTION 6: FINAL ID MANIPULATION (IDOR) MATRIX');
  console.log('=================================================================');

  // IDOR 1: Evaluator 1 attempts to update Evaluator 3's profile
  const eval1UpdateEval3Res = await apiRequest('PATCH', '/evaluators/profile', eval1.token, {
    user_id: eval3.user.id,
    organization: 'Hacked Organization'
  });
  const eval3CheckRes = await apiRequest('GET', `/evaluators/profile/${eval3.user.id}`, eval3.token);
  const eval3Unchanged = eval3CheckRes.data?.data?.organization !== 'Hacked Organization';
  recordTest({
    section: 'IDOR Manipulation',
    method: 'PATCH',
    endpoint: '/evaluators/profile',
    role: 'Evaluator 1',
    resource: "Evaluator 3's Profile (Attempting user_id manipulation in body)",
    expectedAccess: 'Evaluator 3 profile untouched (scoped strictly to req.user.id)',
    actualAccess: `Evaluator 3 org: ${eval3CheckRes.data?.data?.organization}`,
    status: eval3Unchanged ? 'PASS' : 'FAIL',
    notes: 'Server ignores user_id in payload and binds strictly to JWT subject'
  });

  // IDOR 2: Startup 2 attempts to delete Startup 1's registration dossier
  const s2DeleteS1Res = await apiRequest('DELETE', `/startups/${startup1Id}`, startup2.token);
  recordTest({
    section: 'IDOR Manipulation',
    method: 'DELETE',
    endpoint: `/startups/${startup1Id}`,
    role: 'Startup 2',
    resource: "Startup 1's Root Profile (DELETE)",
    expectedAccess: 'HTTP 404 / 403 Forbidden (Endpoint does not allow arbitrary deletion)',
    actualAccess: `HTTP ${s2DeleteS1Res.status}`,
    status: (s2DeleteS1Res.status === 403 || s2DeleteS1Res.status === 404 || s2DeleteS1Res.status === 405) ? 'PASS' : 'FAIL',
    notes: s2DeleteS1Res.data?.message || 'Endpoint not found / forbidden'
  });

  // IDOR 3: Evaluator attempts to read Startup Registration dossier
  const evalGetDossierRes = await apiRequest('GET', '/startups/my-registration', eval1.token);
  recordTest({
    section: 'IDOR Manipulation',
    method: 'GET',
    endpoint: '/startups/my-registration',
    role: 'Evaluator 1',
    resource: 'Startup Registration Dossier Endpoint',
    expectedAccess: 'HTTP 403 Forbidden (STARTUP or ADMIN only)',
    actualAccess: `HTTP ${evalGetDossierRes.status}`,
    status: evalGetDossierRes.status === 403 ? 'PASS' : 'FAIL',
    notes: evalGetDossierRes.data?.message
  });

  // IDOR 4: Government attempts to access Startup Registration dossier
  const govGetDossierRes = await apiRequest('GET', '/startups/my-registration', govt1.token);
  recordTest({
    section: 'IDOR Manipulation',
    method: 'GET',
    endpoint: '/startups/my-registration',
    role: 'Government 1',
    resource: 'Startup Registration Dossier Endpoint',
    expectedAccess: 'HTTP 403 Forbidden (STARTUP or ADMIN only)',
    actualAccess: `HTTP ${govGetDossierRes.status}`,
    status: govGetDossierRes.status === 403 ? 'PASS' : 'FAIL',
    notes: govGetDossierRes.data?.message
  });

  // IDOR 5: Startup 1 attempts to submit Startup 2 registration
  const s1SubmitS2Res = await apiRequest('POST', `/startups/${startup2Id}/submit`, startup1.token, {
    declaration_accepted: true
  });
  recordTest({
    section: 'IDOR Manipulation',
    method: 'POST',
    endpoint: `/startups/${startup2Id}/submit`,
    role: 'Startup 1',
    resource: "Startup 2's Registration Submission",
    expectedAccess: 'HTTP 403 Forbidden (You can only submit registration for your own startup)',
    actualAccess: `HTTP ${s1SubmitS2Res.status}`,
    status: s1SubmitS2Res.status === 403 ? 'PASS' : 'FAIL',
    notes: s1SubmitS2Res.data?.message
  });

  // IDOR 6: Random UUID manipulation on user endpoint
  const randomUserUuid = '00000000-0000-0000-0000-999999999999';
  const gov1RandomUserRes = await apiRequest('GET', `/users/${randomUserUuid}`, govt1.token);
  recordTest({
    section: 'IDOR Manipulation',
    method: 'GET',
    endpoint: `/users/${randomUserUuid}`,
    role: 'Government 1',
    resource: 'Non-existent / Foreign User UUID',
    expectedAccess: 'HTTP 403 Forbidden / HTTP 404 Not Found',
    actualAccess: `HTTP ${gov1RandomUserRes.status}`,
    status: (gov1RandomUserRes.status === 403 || gov1RandomUserRes.status === 404) ? 'PASS' : 'FAIL',
    notes: gov1RandomUserRes.data?.message
  });

  // Print Summary
  console.log('\n=================================================================');
  console.log('TEST SUITE EXECUTION SUMMARY');
  console.log('=================================================================');
  const total = testResults.length;
  const passed = testResults.filter(t => t.status === 'PASS').length;
  const failed = testResults.filter(t => t.status === 'FAIL').length;
  const securityIssues = testResults.filter(t => t.securityIssue !== 'None');

  console.log(`Total Tests Run: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed / Security Issues: ${failed}`);
  console.log(`Security Vulnerabilities Identified: ${securityIssues.length}`);

  for (const issue of securityIssues) {
    console.log(`  - [#${issue.id}] ${issue.section} | ${issue.method} ${issue.endpoint} (${issue.role})`);
    console.log(`    Resource: ${issue.resource}`);
    console.log(`    Expected: ${issue.expectedAccess}`);
    console.log(`    Actual: ${issue.actualAccess}`);
    console.log(`    Issue: ${issue.securityIssue}`);
    console.log(`    Notes: ${issue.notes}\n`);
  }

  // Write JSON report
  const reportPath = path.join(__dirname, 'profile_document_security_report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    summary: { total, passed, failed, securityIssuesCount: securityIssues.length, timestamp: new Date().toISOString() },
    testResults
  }, null, 2));
  console.log(`Detailed test report saved to: ${reportPath}`);
}

runTestSuite().catch(err => {
  console.error('Fatal error running security suite:', err);
  process.exit(1);
});
