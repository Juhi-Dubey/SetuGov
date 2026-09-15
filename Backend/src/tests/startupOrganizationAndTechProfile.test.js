import assert from 'assert';
import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma.js';
import * as startupService from '../services/startupService.js';
import {
  INDIAN_STATES,
  INDIAN_UTS,
  STATES_AND_UTS,
  INDIA_LOCATIONS,
  isValidState,
  isValidCityForState,
  getCitiesForState
} from '../data/indiaLocations.js';
import { BadRequestError, ForbiddenError } from '../utils/errors.js';

async function runStartupOrganizationAndTechProfileTests() {
  console.log('===============================================================');
  console.log('🏛️ RUNNING STARTUP ORGANIZATION & TECH PROFILE HARDENING TEST SUITE');
  console.log('===============================================================');

  const suffix = Date.now();
  const testEmail = `org_tech_founder_${suffix}@testdomain.org`;
  const plainPassword = 'SecurePassword123!';

  let testUser;
  let testStartup;

  try {
    // -------------------------------------------------------------------------
    // SETUP: Fixtures (Startup User & Initial Startup Record)
    // -------------------------------------------------------------------------
    console.log('\n--- SETUP: Creating Startup Test Fixtures ---');
    const password_hash = await bcrypt.hash(plainPassword, 10);

    testUser = await prisma.user.create({
      data: {
        name: 'Tech Founder',
        email: testEmail,
        password_hash,
        role: 'STARTUP',
        is_active: true,
        is_verified: true
      }
    });

    testStartup = await prisma.startup.create({
      data: {
        user_id: testUser.id,
        company_name: `AeroTech Labs ${suffix}`,
        org_type: 'PRIVATE_LIMITED',
        description: 'Cutting-edge aerospace and AI systems development',
        domain: 'Technology & AI/ML',
        location: 'Bengaluru, Karnataka',
        technologies: [],
        verification_status: 'DRAFT',
        verification_source: 'SELF_DECLARED'
      }
    });

    console.log('✅ Fixtures created successfully.');

    // -------------------------------------------------------------------------
    // TEST 1: Location Data Source Completeness (28 States + 8 UTs)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: Location Data Source Completeness ---');
    assert.strictEqual(INDIAN_STATES.length, 28, 'Must contain exactly 28 Indian States');
    assert.strictEqual(INDIAN_UTS.length, 8, 'Must contain exactly 8 Union Territories');
    assert.strictEqual(STATES_AND_UTS.length, 36, 'Total States and UTs must be 36');

    // Verify key states & UTs
    assert.strictEqual(isValidState('Karnataka'), true, 'Karnataka must be valid');
    assert.strictEqual(isValidState('Bihar'), true, 'Bihar must be valid');
    assert.strictEqual(isValidState('Maharashtra'), true, 'Maharashtra must be valid');
    assert.strictEqual(isValidState('Delhi'), true, 'Delhi must be valid');
    assert.strictEqual(isValidState('Ladakh'), true, 'Ladakh must be valid');
    assert.strictEqual(isValidState('Puducherry'), true, 'Puducherry must be valid');

    // Invalid state verification
    assert.strictEqual(isValidState('Atlantis'), false, 'Fictional state must be invalid');
    assert.strictEqual(isValidState('California'), false, 'Foreign state must be invalid');

    const karnatakaCities = getCitiesForState('Karnataka');
    assert.ok(karnatakaCities.includes('Bengaluru'), 'Karnataka must contain Bengaluru');
    assert.ok(karnatakaCities.includes('Mysuru'), 'Karnataka must contain Mysuru');
    assert.ok(karnatakaCities.includes('Mangaluru'), 'Karnataka must contain Mangaluru');

    const biharCities = getCitiesForState('Bihar');
    assert.ok(biharCities.includes('Patna'), 'Bihar must contain Patna');
    assert.ok(biharCities.includes('Gaya'), 'Bihar must contain Gaya');
    assert.ok(!biharCities.includes('Bengaluru'), 'Bihar must NOT contain Bengaluru');

    console.log('✅ Location dataset verified: Exactly 28 States and 8 Union Territories with comprehensive cities.');

    // -------------------------------------------------------------------------
    // TEST 2: Valid State and City Update
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Valid State and City Update ---');
    const updatedLoc = await startupService.updateStartup(
      testStartup.id,
      {
        state: 'Karnataka',
        city: 'Bengaluru',
        registered_address: '100 Feet Road, Indiranagar',
        pincode: '560038'
      },
      testUser
    );

    assert.strictEqual(updatedLoc.state, 'Karnataka', 'State must be Karnataka');
    assert.strictEqual(updatedLoc.city, 'Bengaluru', 'City must be Bengaluru');
    assert.strictEqual(updatedLoc.pincode, '560038', 'PIN must be 560038');

    // Verify in database that city and state are stored separately and not concatenated
    const dbStartup = await prisma.startup.findUnique({ where: { id: testStartup.id } });
    assert.strictEqual(dbStartup.state, 'Karnataka', 'Database state must be separate');
    assert.strictEqual(dbStartup.city, 'Bengaluru', 'Database city must be separate');
    assert.ok(!dbStartup.city.includes(','), 'City must not contain concatenated state');

    console.log('✅ Valid city and state accepted and persisted separately in DB.');

    // -------------------------------------------------------------------------
    // TEST 3: Invalid State / UT Rejection
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Invalid State / UT Rejection ---');
    let invalidStateError = null;
    try {
      await startupService.updateStartup(
        testStartup.id,
        {
          state: 'UnknownProvince',
          city: 'Patna'
        },
        testUser
      );
    } catch (err) {
      invalidStateError = err;
    }
    assert.ok(invalidStateError instanceof BadRequestError, 'Invalid state must throw BadRequestError');
    console.log(`✅ Invalid State rejected: ${invalidStateError.message}`);

    // -------------------------------------------------------------------------
    // TEST 4: Mismatched City and State Rejection (e.g. Bengaluru in Bihar)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Mismatched City and State Rejection ---');
    let mismatchError = null;
    try {
      await startupService.updateStartup(
        testStartup.id,
        {
          state: 'Bihar',
          city: 'Bengaluru'
        },
        testUser
      );
    } catch (err) {
      mismatchError = err;
    }
    assert.ok(mismatchError instanceof BadRequestError, 'Mismatched city and state must throw BadRequestError');
    assert.ok(
      mismatchError.message.includes('Bengaluru') && mismatchError.message.includes('Bihar'),
      'Error message must specify city/state mismatch'
    );
    console.log(`✅ Mismatched city and state rejected: ${mismatchError.message}`);

    // -------------------------------------------------------------------------
    // TEST 5: Canonical City Name Normalization
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Canonical City Name Normalization ---');
    const normalizedRes = await startupService.updateStartup(
      testStartup.id,
      {
        state: 'Maharashtra',
        city: 'mumbai' // lower case
      },
      testUser
    );
    assert.strictEqual(normalizedRes.city, 'Mumbai', 'City must be resolved to canonical casing');
    console.log('✅ Canonical city name resolved to proper title-casing.');

    // -------------------------------------------------------------------------
    // TEST 6: Postal PIN Code Validation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Postal PIN Code Validation ---');
    // Valid 6-digit PIN
    const validPinRes = await startupService.updateStartup(
      testStartup.id,
      {
        pincode: '400001'
      },
      testUser
    );
    assert.strictEqual(validPinRes.pincode, '400001', 'Valid 6-digit PIN must be saved');

    // Invalid PIN with letters
    let letterPinError = null;
    try {
      await startupService.updateStartup(testStartup.id, { pincode: '56000A' }, testUser);
    } catch (err) {
      letterPinError = err;
    }
    assert.ok(letterPinError instanceof BadRequestError, 'PIN with letters must be rejected');

    // Invalid PIN with spaces
    let spacePinError = null;
    try {
      await startupService.updateStartup(testStartup.id, { pincode: '560 01' }, testUser);
    } catch (err) {
      spacePinError = err;
    }
    assert.ok(spacePinError instanceof BadRequestError, 'PIN with spaces must be rejected');

    // Invalid PIN length (5 digits or 7 digits)
    let lengthPinError = null;
    try {
      await startupService.updateStartup(testStartup.id, { pincode: '12345' }, testUser);
    } catch (err) {
      lengthPinError = err;
    }
    assert.ok(lengthPinError instanceof BadRequestError, '5-digit PIN must be rejected');

    console.log('✅ PIN validation strictly enforced: exactly 6 digits, numeric only.');

    // -------------------------------------------------------------------------
    // TEST 7: Technologies Array Persistence and Initial Empty State
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Technologies Array Initial & Empty State ---');
    const initialProfile = await startupService.getStartupById(testStartup.id, testUser);
    assert.ok(Array.isArray(initialProfile.technologies), 'Technologies must be an array');
    assert.strictEqual(initialProfile.technologies.length, 0, 'Initial technologies must be empty array (no fake defaults)');

    // -------------------------------------------------------------------------
    // TEST 8: Technologies Normalization, Trimming, and Case-Insensitive Deduplication
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Technologies Normalization & Deduplication ---');
    const updatedTechRes = await startupService.updateStartup(
      testStartup.id,
      {
        technologies: [
          '  Computer Vision  ',
          'Edge AI',
          'computer vision', // duplicate with different casing
          'EDGE AI',        // duplicate with different casing
          'LoRaWAN',
          'HL7/FHIR',       // niche domain tech
          '   '             // empty item
        ]
      },
      testUser
    );

    assert.strictEqual(updatedTechRes.technologies.length, 4, 'Must deduplicate and remove empty items');
    assert.deepStrictEqual(
      updatedTechRes.technologies,
      ['Computer Vision', 'Edge AI', 'LoRaWAN', 'HL7/FHIR'],
      'Preserved first-seen casing and trimmed whitespace'
    );

    // Verify in database that Prisma stores String[]
    const dbTechCheck = await prisma.startup.findUnique({ where: { id: testStartup.id } });
    assert.ok(Array.isArray(dbTechCheck.technologies), 'Stored as String[] array');
    assert.strictEqual(dbTechCheck.technologies.length, 4);

    console.log('✅ Technologies normalized, deduplicated case-insensitively, and saved as String[].');

    // -------------------------------------------------------------------------
    // TEST 9: Technologies Validation (Non-string / Overflow)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: Technologies Validation Safeguards ---');
    let malformedTechError = null;
    try {
      await startupService.updateStartup(
        testStartup.id,
        {
          technologies: [{ name: 'AI' }] // object instead of string
        },
        testUser
      );
    } catch (err) {
      malformedTechError = err;
    }
    assert.ok(malformedTechError instanceof BadRequestError, 'Non-string technology must throw BadRequestError');

    // Overly long item
    let longTechError = null;
    try {
      await startupService.updateStartup(
        testStartup.id,
        {
          technologies: ['A'.repeat(120)]
        },
        testUser
      );
    } catch (err) {
      longTechError = err;
    }
    assert.ok(longTechError instanceof BadRequestError, 'Tech item >80 chars must throw BadRequestError');

    console.log('✅ Malformed and excessive technology payloads rejected safely.');

    // -------------------------------------------------------------------------
    // TEST 10: Security & Mass Assignment Protection
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: Security & Mass Assignment Protection ---');
    let forbiddenFieldError = null;
    try {
      await startupService.updateStartup(
        testStartup.id,
        {
          verification_status: 'VERIFIED',
          verification_source: 'ADMIN_OVERRIDE'
        },
        testUser
      );
    } catch (err) {
      forbiddenFieldError = err;
    }
    assert.ok(forbiddenFieldError instanceof ForbiddenError, 'Client modification of verification_status must throw ForbiddenError');
    console.log('✅ Mass assignment strictly blocked: client cannot tamper with verification fields.');

    console.log('\n===============================================================');
    console.log('🎉 ALL STARTUP ORGANIZATION & TECH PROFILE TESTS PASSED!');
    console.log('===============================================================');
  } finally {
    console.log('\n--- CLEANUP: Removing Test Fixtures ---');
    if (testStartup?.id) {
      await prisma.startup.deleteMany({ where: { id: testStartup.id } });
    }
    if (testUser?.id) {
      await prisma.user.deleteMany({ where: { id: testUser.id } });
    }
    console.log('✅ Cleanup completed.');
    await prisma.$disconnect();
  }
}

runStartupOrganizationAndTechProfileTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
