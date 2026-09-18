// Unit test simulating the exact sequential state machine and UI rendering logic
// for the Startup Registration 9-step wizard

const getRequiredDocumentTypes = (orgType) => {
  const normalized = (orgType || "PRIVATE_LIMITED").toUpperCase();
  switch (normalized) {
    case "PRIVATE_LIMITED":
    case "PUBLIC_LIMITED":
    case "LLP":
    case "PARTNERSHIP":
    case "TRUST":
    case "SOCIETY":
    case "OTHER":
      return ["PAN", "INCORPORATION_CERTIFICATE", "BANK_PROOF", "AUTHORIZED_PERSON_PROOF"];
    case "PROPRIETORSHIP":
      return ["PAN", "BANK_PROOF", "AUTHORIZED_PERSON_PROOF"];
    default:
      return ["PAN", "INCORPORATION_CERTIFICATE", "BANK_PROOF", "AUTHORIZED_PERSON_PROOF"];
  }
};

const validateStep1 = (userAccountData) => {
  const errs = {};
  if (!userAccountData.name?.trim()) {
    errs.name = "Account holder name is required.";
  }
  const email = (userAccountData.email || "").trim();
  if (!email) {
    errs.email = "Account email address is required.";
  } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
    errs.email = "Please enter a valid email address.";
  }
  const phone = (userAccountData.phone || "").trim().replace(/[\s\-\(\)]/g, "");
  if (!phone) {
    errs.phone = "Account contact phone number is required.";
  } else if (!/^(?:\+91|0)?[6-9]\d{9}$/.test(phone)) {
    errs.phone = "Please enter a valid 10-digit Indian mobile number.";
  }
  return errs;
};

const isStepDataComplete = (stepNum, startup, userAccountData, step1Saved, user) => {
  if (!startup) return false;
  const vStatus = startup.verification_status || "DRAFT";

  switch (stepNum) {
    case 1: {
      const name = (userAccountData?.name || startup.user?.name || "").trim();
      const email = (userAccountData?.email || startup.user?.email || "").trim();
      const phone = (userAccountData?.phone || startup.user?.phone || "").trim().replace(/[\s\-\(\)]/g, "");
      const hasName = name.length >= 2;
      const hasEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
      const hasPhone = /^(?:\+91|0)?[6-9]\d{9}$/.test(phone);
      return Boolean(hasName && hasEmail && hasPhone && (step1Saved || startup.user?.is_verified || user?.is_verified));
    }
    case 2: {
      const hasName = Boolean(startup.company_name && startup.company_name.trim().length >= 2);
      const hasType = Boolean(startup.org_type);
      const hasAddress = Boolean(startup.registered_address && startup.registered_address.trim().length > 0);
      const hasState = Boolean(startup.state && startup.state.trim().length > 0);
      const hasCity = Boolean(startup.city && startup.city.trim().length > 0);
      const hasPincode = Boolean(startup.pincode && /^[1-9][0-9]{5}$/.test(String(startup.pincode).trim()));
      return Boolean(hasName && hasType && hasAddress && hasState && hasCity && hasPincode);
    }
    case 3: {
      const hasAuthName = Boolean(startup.authorized_person_name && startup.authorized_person_name.trim().length > 0);
      const hasAuthDesig = Boolean(startup.authorized_person_designation && startup.authorized_person_designation.trim().length > 0);
      const hasAuthEmail = Boolean(startup.authorized_person_email && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(startup.authorized_person_email.trim()));
      const cleanPhone = (startup.authorized_person_phone || "").replace(/[\s\-\(\)]/g, "");
      const hasAuthPhone = Boolean(cleanPhone && /^(?:\+91|0)?[6-9]\d{9}$/.test(cleanPhone));
      const hasAuthType = Boolean(startup.authorization_type);
      return Boolean(hasAuthName && hasAuthDesig && hasAuthEmail && hasAuthPhone && hasAuthType);
    }
    case 4: {
      const pan = (startup.pan_number || "").trim().toUpperCase();
      return Boolean(pan && /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan));
    }
    case 5: {
      const hasDesc = Boolean(startup.description && startup.description.trim().length >= 10);
      const hasDomain = Boolean(startup.domain && startup.domain.trim().length > 0);
      const trl = parseInt(startup.readiness_level, 10);
      const hasTrl = !isNaN(trl) && trl >= 1 && trl <= 9;
      return Boolean(hasDesc && hasDomain && hasTrl);
    }
    case 6: {
      const bank = startup.bank_details;
      if (!bank) return false;
      const hasHolder = Boolean(bank.account_holder_name && bank.account_holder_name.trim().length > 0);
      const hasBankName = Boolean(bank.bank_name && bank.bank_name.trim().length > 0);
      const acc = (bank.account_number || "").trim();
      const hasAcc = Boolean(acc && (acc.includes("•") || /^\d{9,18}$/.test(acc)));
      const ifsc = (bank.ifsc_code || "").trim().toUpperCase();
      const hasIfsc = Boolean(ifsc && /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc));
      return Boolean(hasHolder && hasBankName && hasAcc && hasIfsc);
    }
    case 7: {
      const docs = startup.documents || [];
      if (docs.length === 0) return false;
      const reqDocs = getRequiredDocumentTypes(startup.org_type || "PRIVATE_LIMITED");
      const uploadedTypes = new Set(docs.map((d) => d.document_type));
      return Boolean(reqDocs.length > 0 && reqDocs.every((t) => uploadedTypes.has(t)));
    }
    case 8: {
      return Boolean(startup.submitted_at || (vStatus && vStatus !== "DRAFT"));
    }
    case 9: {
      return vStatus === "VERIFIED";
    }
    default:
      return false;
  }
};

// Function simulating what the UI badge renders:
// When isCurrent: renders number (s.num)
// When isDone && !isCurrent: renders '✓'
// When upcoming/incomplete: renders number (s.num)
const getBadgeContent = (stepNum, activeStep, startup, userAccountData, step1Saved, user) => {
  const isCurrent = activeStep === stepNum;
  const isDone = isStepDataComplete(stepNum, startup, userAccountData, step1Saved, user);
  if (isDone && !isCurrent) {
    return "✓";
  }
  return String(stepNum);
};

console.log("==================================================");
console.log("RUNNING SEQUENTIAL STARTUP REGISTRATION STEP TESTS");
console.log("==================================================");

// SCENARIO 1: Fresh Registration Entry
let startup = {
  id: "startup-123",
  company_name: "",
  org_type: "PRIVATE_LIMITED",
  verification_status: "DRAFT",
  documents: [],
  bank_details: null,
  user: { name: "", email: "", phone: "", is_verified: false }
};
let user = { name: "", email: "", phone: "", is_verified: false };
let userAccountData = { name: "", email: "", phone: "" };
let step1Saved = false;
let activeStep = 1;

console.log("\n[TEST 1] Initial Clean State at Step 1");
for (let i = 1; i <= 9; i++) {
  const badge = getBadgeContent(i, activeStep, startup, userAccountData, step1Saved, user);
  console.log(`Step ${i} UI badge: [${badge}] (expected: '${i}')`);
  if (badge !== String(i)) {
    throw new Error(`Step ${i} showed checkmark on initial load! Expected: '${i}'`);
  }
}
console.log("-> PASS: No green ticks on initial start. All steps show their numbers.");

// SCENARIO 2: Step 1 leave required field empty and click Continue
console.log("\n[TEST 2] Step 1 validation failure when field is empty");
userAccountData = { name: "Dr. Rajesh Kumar", email: "rajesh@meditech.in", phone: "" }; // phone is empty!
const step1Errors = validateStep1(userAccountData);
console.log("Validation errors with empty phone:", step1Errors);
if (!step1Errors.phone) {
  throw new Error("Validation should fail when phone is empty");
}
// handleSaveStep prevents advancing:
const step1Advanced = Object.keys(step1Errors).length === 0;
console.log("Did Step 1 advance?", step1Advanced ? "FAIL (advanced on error)" : "PASS (stayed on Step 1, did not tick)");
if (step1Advanced) throw new Error("Step 1 must not advance when validation fails");

// SCENARIO 3: Fill Step 1 and proceed
console.log("\n[TEST 3] Fill Step 1 and click Continue");
userAccountData.phone = "9876543210";
const step1Valid = Object.keys(validateStep1(userAccountData)).length === 0;
if (!step1Valid) throw new Error("Step 1 should be valid now");

// Save Step 1 & proceed
step1Saved = true;
startup.user = { name: userAccountData.name, email: userAccountData.email, phone: userAccountData.phone, is_verified: true };
activeStep = 2; // Advanced to Step 2!

console.log("Step 1 badge after advancing to Step 2:", getBadgeContent(1, activeStep, startup, userAccountData, step1Saved, user));
console.log("Step 2 badge (current):", getBadgeContent(2, activeStep, startup, userAccountData, step1Saved, user));
console.log("Step 3 badge (upcoming):", getBadgeContent(3, activeStep, startup, userAccountData, step1Saved, user));

if (getBadgeContent(1, activeStep, startup, userAccountData, step1Saved, user) !== "✓") {
  throw new Error("Step 1 should show tick after advancing to Step 2");
}
if (getBadgeContent(2, activeStep, startup, userAccountData, step1Saved, user) !== "2") {
  throw new Error("Step 2 should show '2' (current step must not show tick)");
}
if (getBadgeContent(3, activeStep, startup, userAccountData, step1Saved, user) !== "3") {
  throw new Error("Step 3 should show '3'");
}
console.log("-> PASS: Step 1 shows '✓', Step 2 is active showing '2', Step 3 shows '3'");

// SCENARIO 4: Step 2 Complete and proceed to Step 3
console.log("\n[TEST 4] Complete Step 2 and proceed to Step 3");
startup.company_name = "MediQueue AI Technologies Pvt Ltd";
startup.org_type = "PRIVATE_LIMITED";
startup.registered_address = "42 Silicon Avenue";
startup.state = "Karnataka";
startup.city = "Bengaluru";
startup.pincode = "560001";
activeStep = 3;

console.log("Step 1 badge:", getBadgeContent(1, activeStep, startup, userAccountData, step1Saved, user));
console.log("Step 2 badge:", getBadgeContent(2, activeStep, startup, userAccountData, step1Saved, user));
console.log("Step 3 badge (current):", getBadgeContent(3, activeStep, startup, userAccountData, step1Saved, user));

if (getBadgeContent(1, activeStep, startup, userAccountData, step1Saved, user) !== "✓" ||
    getBadgeContent(2, activeStep, startup, userAccountData, step1Saved, user) !== "✓" ||
    getBadgeContent(3, activeStep, startup, userAccountData, step1Saved, user) !== "3") {
  throw new Error("Step 1 and Step 2 must show '✓', Step 3 must show '3'");
}
console.log("-> PASS: Step 1 and 2 show '✓', Step 3 is active showing '3'");

// SCENARIO 5: Back Navigation - User on Step 3 clicks Step 2
console.log("\n[TEST 5] User on Step 3 clicks Step 2 to go backward");
activeStep = 2; // User navigated back to Step 2
console.log("Step 1 badge:", getBadgeContent(1, activeStep, startup, userAccountData, step1Saved, user));
console.log("Step 2 badge (now current):", getBadgeContent(2, activeStep, startup, userAccountData, step1Saved, user));
console.log("Step 3 badge (upcoming/not complete):", getBadgeContent(3, activeStep, startup, userAccountData, step1Saved, user));

if (getBadgeContent(1, activeStep, startup, userAccountData, step1Saved, user) !== "✓") {
  throw new Error("Step 1 must remain '✓'");
}
if (getBadgeContent(2, activeStep, startup, userAccountData, step1Saved, user) !== "2") {
  throw new Error("Step 2 must show '2' while active (Current step must NOT show tick)");
}
if (getBadgeContent(3, activeStep, startup, userAccountData, step1Saved, user) !== "3") {
  throw new Error("Step 3 must show '3' (not tick)");
}
console.log("-> PASS: Back navigation maintains Step 1 as '✓', Step 2 as '2' (active), Step 3 as '3'");

// SCENARIO 6: Step 8 behavior before and after Review & Sign
console.log("\n[TEST 6] Step 8 (Review & Sign) - Merely viewing must NOT tick");
// Complete Steps 3 to 7
startup.authorized_person_name = "Dr. Rajesh Kumar";
startup.authorized_person_designation = "Founder & CEO";
startup.authorized_person_email = "rajesh@meditech.in";
startup.authorized_person_phone = "9876543210";
startup.authorization_type = "BOARD_RESOLUTION";

startup.pan_number = "ABCDE1234F";

startup.description = "AI medical triage and queue optimization system for public health centers.";
startup.domain = "Healthcare & MedTech";
startup.readiness_level = 7;

startup.bank_details = {
  account_holder_name: "MediQueue AI Technologies Pvt Ltd",
  bank_name: "State Bank of India",
  account_number: "123456789012",
  ifsc_code: "SBIN0001234"
};

startup.documents = [
  { document_type: "PAN" },
  { document_type: "INCORPORATION_CERTIFICATE" },
  { document_type: "BANK_PROOF" },
  { document_type: "AUTHORIZED_PERSON_PROOF" }
];

activeStep = 8; // Viewing Step 8
console.log("Viewing Step 8 (before signing and submitting):");
console.log("Step 8 badge:", getBadgeContent(8, activeStep, startup, userAccountData, step1Saved, user));
if (getBadgeContent(8, activeStep, startup, userAccountData, step1Saved, user) !== "8") {
  throw new Error("Step 8 must show '8', NOT tick merely by opening it!");
}
console.log("-> PASS: Merely opening Step 8 shows '8', no tick.");

// Submit Step 8
console.log("\n[TEST 7] Submit Step 8 for Verification");
startup.submitted_at = new Date().toISOString();
startup.verification_status = "SUBMITTED";
activeStep = 9;

console.log("Step 8 badge after submit:", getBadgeContent(8, activeStep, startup, userAccountData, step1Saved, user));
console.log("Step 9 badge (now active, pending review):", getBadgeContent(9, activeStep, startup, userAccountData, step1Saved, user));

if (getBadgeContent(8, activeStep, startup, userAccountData, step1Saved, user) !== "✓") {
  throw new Error("Step 8 should show '✓' after submission");
}
if (getBadgeContent(9, activeStep, startup, userAccountData, step1Saved, user) !== "9") {
  throw new Error("Step 9 should show '9' while under review (no false verified tick)");
}
console.log("-> PASS: Step 8 shows '✓', Step 9 shows '9' with status SUBMITTED");

// SCENARIO 7: When backend marks VERIFIED
console.log("\n[TEST 8] Step 9 when state officially marks VERIFIED");
startup.verification_status = "VERIFIED";
const isVerifiedComplete = isStepDataComplete(9, startup, userAccountData, step1Saved, user);
console.log("Step 9 is verified complete?", isVerifiedComplete ? "PASS (True)" : "FAIL");
if (!isVerifiedComplete) throw new Error("Step 9 should evaluate complete when status is VERIFIED");

console.log("\n==================================================");
console.log("ALL SEQUENTIAL STEP COMPLETION TESTS PASSED 100%!");
console.log("==================================================");
