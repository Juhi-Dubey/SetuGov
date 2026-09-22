import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Upload,
  Trash2,
  CreditCard,
  User,
  ShieldCheck,
  Globe,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Save,
  Check,
  Eye,
  AlertTriangle,
  RefreshCw,
  Lock,
  Layers,
  FileCheck
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getMyRegistration,
  updateRegistration,
  saveBankDetails,
  uploadStartupDocument,
  deleteStartupDocument,
  submitStartupRegistration
} from "../../services/startupService";
import { apiRequest } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import AppLayout from "../../components/layout/AppLayout";
import SearchableSelect from "../../components/common/SearchableSelect";
import TechTagInput from "../../components/common/TechTagInput";
import {
  getStatesAndUTs,
  getCitiesForState,
  isValidState,
  isValidCityForState
} from "../../data/indiaLocations";

const ORG_TYPES = [
  { value: "PRIVATE_LIMITED", label: "Private Limited Company (Pvt Ltd)" },
  { value: "LLP", label: "Limited Liability Partnership (LLP)" },
  { value: "PROPRIETORSHIP", label: "Sole Proprietorship" },
  { value: "PARTNERSHIP", label: "Partnership Firm" },
  { value: "PUBLIC_LIMITED", label: "Public Limited Company" },
  { value: "TRUST", label: "Registered Trust" },
  { value: "SOCIETY", label: "Registered Society" },
  { value: "OTHER", label: "Other Legal Entity" }
];

const DOMAINS = [
  "Healthcare & MedTech",
  "Transportation & Smart Mobility",
  "Urban Governance & Smart Cities",
  "Agriculture & AgriTech",
  "Clean Energy & Environment",
  "Education & EdTech",
  "Cybersecurity & Data Defense",
  "Public Safety & Disaster Management",
  "Technology & AI/ML"
];

export const getRequiredDocumentTypes = (orgType) => {
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

const ALL_DOCUMENT_DEFINITIONS = [
  { id: "PAN", label: "Permanent Account Number (PAN) Card", description: "Official business or proprietor PAN card copy." },
  { id: "INCORPORATION_CERTIFICATE", label: "Certificate of Incorporation / Registration", description: "ROC incorporation certificate, LLP agreement, or partnership deed." },
  { id: "BANK_PROOF", label: "Bank Account Proof", description: "Canceled cheque copy or latest bank passbook/statement showing account details." },
  { id: "AUTHORIZED_PERSON_PROOF", label: "Authorized Signatory Proof", description: "Board resolution, power of attorney, or partnership authorization letter." },
  { id: "GST_CERTIFICATE", label: "GST Registration Certificate", description: "Optional GSTIN certificate for tax-registered suppliers." },
  { id: "DPIIT_CERTIFICATE", label: "DPIIT Startup Recognition Certificate", description: "Optional DPIIT recognition certificate for startup benefits." },
  { id: "PITCH_DECK", label: "Product Overview / Technical Dossier", description: "Optional product documentation or pilot architecture summary." }
];

export default function StartupRegistration() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeStep, setActiveStep] = useState(1);
  const [startup, setStartup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [errors, setErrors] = useState({});
  const [step1Saved, setStep1Saved] = useState(false);
  const hasInitializedStep = useRef(false);

  // Step 1 Account State
  const [userAccountData, setUserAccountData] = useState({
    name: "",
    email: "",
    phone: ""
  });

  const clearError = (field) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Form State
  const [orgData, setOrgData] = useState({
    company_name: "",
    org_type: "PRIVATE_LIMITED",
    registered_address: "",
    city: "",
    state: "",
    pincode: "",
    official_email: "",
    official_website: "",
    incorporation_date: ""
  });

  const [authPersonData, setAuthPersonData] = useState({
    authorized_person_name: "",
    authorized_person_designation: "",
    authorized_person_email: "",
    authorized_person_phone: "",
    authorization_type: "BOARD_RESOLUTION"
  });

  const [bizIdentityData, setBizIdentityData] = useState({
    pan_number: "",
    cin_number: "",
    gstin: "",
    dpiit_number: "",
    certificate_number: ""
  });

  const [techProfileData, setTechProfileData] = useState({
    description: "",
    domain: "",
    technologies: [],
    products_services: "",
    readiness_level: 1,
    years_experience: 0,
    previous_deployments: 0,
    location: ""
  });

  const [bankData, setBankData] = useState({
    account_holder_name: "",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    branch_name: "",
    account_type: "CURRENT"
  });

  const [documents, setDocuments] = useState([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("PAN");
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  const fetchDossier = async () => {
    try {
      setLoading(true);
      const res = await getMyRegistration();
      const s = res?.data?.startup || res?.startup || res?.data;
      if (s) {
        setStartup(s);

        setOrgData({
          company_name: s.company_name || "",
          org_type: s.org_type || "PRIVATE_LIMITED",
          registered_address: s.registered_address || "",
          city: s.city || "",
          state: s.state || "",
          pincode: s.pincode || "",
          official_email: s.official_email || s.user?.email || "",
          official_website: s.official_website || "",
          incorporation_date: s.incorporation_date ? s.incorporation_date.split("T")[0] : ""
        });

        setAuthPersonData({
          authorized_person_name: s.authorized_person_name || s.user?.name || "",
          authorized_person_designation: s.authorized_person_designation || "",
          authorized_person_email: s.authorized_person_email || s.user?.email || "",
          authorized_person_phone: s.authorized_person_phone || s.user?.phone || "",
          authorization_type: s.authorization_type || "BOARD_RESOLUTION"
        });

        setBizIdentityData({
          pan_number: s.pan_number || "",
          cin_number: s.cin_number || "",
          gstin: s.gstin || "",
          dpiit_number: s.dpiit_number || "",
          certificate_number: s.certificate_number || ""
        });

        setTechProfileData({
          description: s.description || "",
          domain: s.domain || "",
          technologies: s.technologies || [],
          products_services: s.products_services || "",
          readiness_level: s.readiness_level ?? 1,
          years_experience: s.years_experience ?? 0,
          previous_deployments: s.previous_deployments ?? 0,
          location: s.location || ""
        });

        if (s.bank_details) {
          setBankData({
            account_holder_name: s.bank_details.account_holder_name || "",
            bank_name: s.bank_details.bank_name || "",
            account_number: s.bank_details.account_number || "",
            ifsc_code: s.bank_details.ifsc_code || "",
            branch_name: s.bank_details.branch_name || "",
            account_type: s.bank_details.account_type || "CURRENT"
          });
        }

        setDocuments(s.documents || []);

        setUserAccountData({
          name: s.user?.name || user?.name || "",
          email: s.user?.email || user?.email || "",
          phone: s.user?.phone || user?.phone || ""
        });

        // Initialize active step on initial load based on saved dossier status
        if (!hasInitializedStep.current) {
          hasInitializedStep.current = true;
          const initialAccount = {
            name: s.user?.name || user?.name || "",
            email: s.user?.email || user?.email || "",
            phone: s.user?.phone || user?.phone || ""
          };
          const nextStep = getFirstIncompleteStep(s, s.user || user, initialAccount, false);
          setActiveStep(nextStep);
        }
      }
    } catch (err) {
      console.warn("Startup registration fetch notice:", err);
      if (user?.role === "STARTUP") {
        setFeedback({ type: "error", message: err?.message || "Failed to load registration data." });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDossier();
  }, []);

  const vStatus = startup?.verification_status || "DRAFT";
  const isLocked = ["SUBMITTED", "UNDER_REVIEW", "VERIFIED"].includes(vStatus);

  // STRICT PER-STEP SELF-COMPLETION LOGIC:
  // Evaluates whether stepNum has all required data filled and saved.
  const isStepSelfComplete = (stepNum, s = startup, u = user, uData = userAccountData, s1Saved = step1Saved) => {
    if (!s) return false;
    switch (stepNum) {
      case 1: {
        const name = (uData?.name || s.user?.name || u?.name || "").trim();
        const email = (uData?.email || s.user?.email || u?.email || "").trim();
        const phone = (uData?.phone || s.user?.phone || u?.phone || "").trim().replace(/[\s()-]/g, "");
        const hasName = name.length >= 2;
        const hasEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
        const hasPhone = /^(?:\+91|0)?[6-9]\d{9}$/.test(phone);
        const isSaved = s1Saved || Boolean(s.user?.phone && /^(?:\+91|0)?[6-9]\d{9}$/.test(s.user.phone.replace(/[\s()-]/g, "")));
        return Boolean(hasName && hasEmail && hasPhone && isSaved);
      }
      case 2: {
        const hasName = Boolean(s.company_name && s.company_name.trim().length >= 2);
        const hasType = Boolean(s.org_type);
        const hasAddress = Boolean(s.registered_address && s.registered_address.trim().length > 0);
        const hasState = Boolean(s.state && isValidState(s.state));
        const hasCity = Boolean(s.city && isValidCityForState(s.state, s.city));
        const hasPincode = Boolean(s.pincode && /^[1-9][0-9]{5}$/.test(String(s.pincode).trim()));
        return Boolean(hasName && hasType && hasAddress && hasState && hasCity && hasPincode);
      }
      case 3: {
        const hasAuthName = Boolean(s.authorized_person_name && s.authorized_person_name.trim().length > 0);
        const hasAuthDesig = Boolean(s.authorized_person_designation && s.authorized_person_designation.trim().length > 0);
        const hasAuthEmail = Boolean(s.authorized_person_email && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(s.authorized_person_email.trim()));
        const cleanPhone = (s.authorized_person_phone || "").replace(/[\s()-]/g, "");
        const hasAuthPhone = Boolean(cleanPhone && /^(?:\+91|0)?[6-9]\d{9}$/.test(cleanPhone));
        const hasAuthType = Boolean(s.authorization_type);
        return Boolean(hasAuthName && hasAuthDesig && hasAuthEmail && hasAuthPhone && hasAuthType);
      }
      case 4: {
        const pan = (s.pan_number || "").trim().toUpperCase();
        return Boolean(pan && /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan));
      }
      case 5: {
        const hasDesc = Boolean(s.description && s.description.trim().length >= 10);
        const hasDomain = Boolean(s.domain && s.domain.trim().length > 0);
        const trl = parseInt(s.readiness_level, 10);
        const hasTrl = !isNaN(trl) && trl >= 1 && trl <= 9;
        return Boolean(hasDesc && hasDomain && hasTrl);
      }
      case 6: {
        const bank = s.bank_details;
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
        const docs = s.documents || [];
        if (docs.length === 0) return false;
        const reqDocs = getRequiredDocumentTypes(s.org_type || "PRIVATE_LIMITED");
        const uploadedTypes = new Set(docs.map((d) => d.document_type));
        return Boolean(reqDocs.length > 0 && reqDocs.every((t) => uploadedTypes.has(t)));
      }
      case 8: {
        return Boolean(s.submitted_at || (s.verification_status && s.verification_status !== "DRAFT"));
      }
      case 9: {
        return s.verification_status === "VERIFIED";
      }
      default:
        return false;
    }
  };

  // SEQUENTIAL COMPLETION:
  // Step k is ONLY complete if all steps 1..k satisfy their required saved data.
  const isStepSequentiallyComplete = (k, s = startup, u = user, uData = userAccountData, s1Saved = step1Saved) => {
    for (let i = 1; i <= k; i++) {
      if (!isStepSelfComplete(i, s, u, uData, s1Saved)) return false;
    }
    return true;
  };

  // FIRST INCOMPLETE STEP:
  // Sequential evaluation to find next reachable step (opens at first incomplete step).
  const getFirstIncompleteStep = (s = startup, u = user, uData = userAccountData, s1Saved = step1Saved) => {
    if (!s) return 1;
    for (let step = 1; step <= 8; step++) {
      if (!isStepSelfComplete(step, s, u, uData, s1Saved)) {
        return step;
      }
    }
    return 9;
  };

  const validateStep1 = () => {
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
    const phone = (userAccountData.phone || "").trim().replace(/[\s()-]/g, "");
    if (!phone) {
      errs.phone = "Account contact phone number is required.";
    } else if (!/^(?:\+91|0)?[6-9]\d{9}$/.test(phone)) {
      errs.phone = "Please enter a valid 10-digit Indian mobile number.";
    }
    return errs;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!orgData.company_name?.trim()) {
      errs.company_name = "Organization legal name is required.";
    } else if (orgData.company_name.trim().length < 2) {
      errs.company_name = "Organization legal name must be at least 2 characters.";
    }

    if (!orgData.org_type) {
      errs.org_type = "Please select constitution / entity type.";
    }

    if (!orgData.registered_address?.trim()) {
      errs.registered_address = "Registered head office address is required.";
    }

    if (!orgData.state) {
      errs.state = "Please select a State / UT.";
    } else if (!isValidState(orgData.state)) {
      errs.state = `Invalid State / UT '${orgData.state}'. Please select a canonical Indian State or UT.`;
    }

    if (!orgData.city) {
      errs.city = "Please select a City.";
    } else if (orgData.state && !isValidCityForState(orgData.state, orgData.city)) {
      errs.city = `City '${orgData.city}' does not belong to '${orgData.state}'.`;
    }

    const pinStr = String(orgData.pincode || "").trim();
    if (!pinStr) {
      errs.pincode = "Postal PIN Code is required.";
    } else if (!/^[1-9][0-9]{5}$/.test(pinStr)) {
      errs.pincode = "Postal PIN Code must be exactly 6 numeric digits (e.g. 560001).";
    }

    return errs;
  };

  const validateStep3 = () => {
    const errs = {};
    if (!authPersonData.authorized_person_name?.trim()) {
      errs.authorized_person_name = "Authorized signatory full name is required.";
    }

    if (!authPersonData.authorized_person_designation?.trim()) {
      errs.authorized_person_designation = "Official designation is required.";
    }

    const email = (authPersonData.authorized_person_email || "").trim();
    if (!email) {
      errs.authorized_person_email = "Official email address is required.";
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      errs.authorized_person_email = "Please enter a valid official email address.";
    }

    const phone = (authPersonData.authorized_person_phone || "").trim();
    const cleanPhone = phone.replace(/[\s()-]/g, "");
    if (!phone) {
      errs.authorized_person_phone = "Authorized contact phone is required.";
    } else if (!/^(?:\+91|0)?[6-9]\d{9}$/.test(cleanPhone)) {
      errs.authorized_person_phone = "Please enter a valid 10-digit Indian phone number.";
    }

    if (!authPersonData.authorization_type) {
      errs.authorization_type = "Please select authorization type / basis.";
    }

    return errs;
  };

  const validateStep4 = () => {
    const errs = {};
    const pan = (bizIdentityData.pan_number || "").trim().toUpperCase();
    if (!pan) {
      errs.pan_number = "Business PAN is required.";
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
      errs.pan_number = "Invalid PAN format. Must be 10 characters alphanumeric (e.g. ABCDE1234F).";
    }

    const gstin = (bizIdentityData.gstin || "").trim().toUpperCase();
    if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)) {
      errs.gstin = "Invalid GSTIN format (e.g. 29ABCDE1234F1Z5).";
    }

    const cin = (bizIdentityData.cin_number || "").trim().toUpperCase();
    if (cin && !/^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/.test(cin)) {
      errs.cin_number = "Invalid CIN format (e.g. U72900KA2024PTC123456).";
    }

    return errs;
  };

  const validateStep5 = () => {
    const errs = {};
    const desc = (techProfileData.description || "").trim();
    if (!desc) {
      errs.description = "Organization executive summary is required.";
    } else if (desc.length < 10) {
      errs.description = "Summary must be at least 10 characters long.";
    }

    if (!techProfileData.domain?.trim()) {
      errs.domain = "Please select primary sector / domain.";
    }

    const trl = parseInt(techProfileData.readiness_level, 10);
    if (!trl || trl < 1 || trl > 9) {
      errs.readiness_level = "Technology Readiness Level must be between 1 and 9.";
    }

    return errs;
  };

  const validateStep6 = () => {
    const errs = {};
    if (!bankData.account_holder_name?.trim()) {
      errs.account_holder_name = "Account holder name is required.";
    }
    if (!bankData.bank_name?.trim()) {
      errs.bank_name = "Bank name is required.";
    }
    const acc = (bankData.account_number || "").trim();
    if (!acc) {
      errs.account_number = "Bank account number is required.";
    } else if (!acc.includes("•") && !/^\d{9,18}$/.test(acc)) {
      errs.account_number = "Bank account number must be between 9 and 18 digits.";
    }
    const ifsc = (bankData.ifsc_code || "").trim().toUpperCase();
    if (!ifsc) {
      errs.ifsc_code = "Bank IFSC code is required.";
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      errs.ifsc_code = "Invalid IFSC format (e.g. SBIN0001234).";
    }
    return errs;
  };

  const validateStep7 = () => {
    const errs = {};
    const reqDocs = getRequiredDocumentTypes(orgData.org_type);
    const uploaded = new Set((documents || []).map((d) => d.document_type));
    const missing = reqDocs.filter((t) => !uploaded.has(t));
    if (missing.length > 0) {
      errs.documents = `Please upload all required statutory documents: ${missing.map(m => m.replace(/_/g, ' ')).join(', ')}`;
    }
    return errs;
  };

  const validateStep8 = () => {
    const errs = {};
    if (!declarationAccepted) {
      errs.declaration = "Please accept the legal accuracy declaration before submission.";
    }
    return errs;
  };

  const handleSaveStep = async (stepNumber) => {
    if (stepNumber === 1) {
      const step1Errors = validateStep1();
      if (Object.keys(step1Errors).length > 0) {
        setErrors(step1Errors);
        setFeedback({
          type: "error",
          message: step1Errors.phone || step1Errors.name || step1Errors.email || "Please complete all required fields marked with * before proceeding."
        });
        return;
      }

      setSaving(true);
      setFeedback({ type: "", message: "" });
      try {
        const cleanPhone = userAccountData.phone.trim().replace(/[\s()-]/g, "");
        const cleanName = userAccountData.name.trim();
        const cleanEmail = userAccountData.email.trim();

        if (startup?.id) {
          await updateRegistration(startup.id, {
            phone: cleanPhone,
            official_email: cleanEmail,
            authorized_person_phone: startup.authorized_person_phone || cleanPhone
          });
        }

        if (user?.id) {
          try {
            await apiRequest(`/users/${user.id}`, {
              method: "PATCH",
              body: JSON.stringify({ name: cleanName, phone: cleanPhone })
            });
          } catch (uErr) {
            console.warn("User profile sync notice:", uErr);
          }
        }

        setStep1Saved(true);
        setErrors({});
        await fetchDossier();
        setFeedback({ type: "success", message: "Step 1 account credentials verified and saved successfully." });
        setActiveStep(2);
      } catch (err) {
        console.error("Step 1 save error:", err);
        setFeedback({
          type: "error",
          message: err?.message || "Failed to save Step 1 details. Please check values."
        });
        // Stay on Step 1, do NOT tick, do NOT advance!
      } finally {
        setSaving(false);
      }
      return;
    }

    let stepErrors = {};
    if (stepNumber === 2) stepErrors = validateStep2();
    else if (stepNumber === 3) stepErrors = validateStep3();
    else if (stepNumber === 4) stepErrors = validateStep4();
    else if (stepNumber === 5) stepErrors = validateStep5();
    else if (stepNumber === 6) stepErrors = validateStep6();
    else if (stepNumber === 7) stepErrors = validateStep7();

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      setFeedback({
        type: "error",
        message: "Please complete all required fields marked with * before proceeding."
      });
      return;
    }

    if (!startup?.id) {
      setFeedback({ type: "error", message: "Startup profile not initialized. Please refresh." });
      return;
    }

    setSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      if (stepNumber === 2) {
        await updateRegistration(startup.id, {
          company_name: orgData.company_name.trim(),
          org_type: orgData.org_type,
          registered_address: orgData.registered_address.trim(),
          city: orgData.city.trim(),
          state: orgData.state.trim(),
          pincode: orgData.pincode.trim(),
          official_email: orgData.official_email.trim() || undefined,
          official_website: orgData.official_website.trim() || undefined,
          incorporation_date: orgData.incorporation_date ? new Date(orgData.incorporation_date).toISOString() : undefined
        });
      } else if (stepNumber === 3) {
        await updateRegistration(startup.id, {
          authorized_person_name: authPersonData.authorized_person_name.trim(),
          authorized_person_designation: authPersonData.authorized_person_designation.trim(),
          authorized_person_email: authPersonData.authorized_person_email.trim(),
          authorized_person_phone: authPersonData.authorized_person_phone.trim(),
          authorization_type: authPersonData.authorization_type
        });
      } else if (stepNumber === 4) {
        await updateRegistration(startup.id, {
          pan_number: bizIdentityData.pan_number.trim().toUpperCase(),
          cin_number: bizIdentityData.cin_number?.trim()?.toUpperCase() || null,
          gstin: bizIdentityData.gstin?.trim()?.toUpperCase() || null,
          dpiit_number: bizIdentityData.dpiit_number?.trim()?.toUpperCase() || null,
          certificate_number: bizIdentityData.certificate_number?.trim() || null
        });
      } else if (stepNumber === 5) {
        await updateRegistration(startup.id, {
          description: techProfileData.description.trim(),
          domain: techProfileData.domain.trim(),
          technologies: techProfileData.technologies,
          products_services: techProfileData.products_services?.trim() || undefined,
          readiness_level: parseInt(techProfileData.readiness_level, 10),
          years_experience: parseInt(techProfileData.years_experience || 0, 10),
          previous_deployments: parseInt(techProfileData.previous_deployments || 0, 10)
        });
      } else if (stepNumber === 6) {
        await saveBankDetails(startup.id, {
          account_holder_name: bankData.account_holder_name.trim(),
          bank_name: bankData.bank_name.trim(),
          account_number: bankData.account_number.trim(),
          ifsc_code: bankData.ifsc_code.trim().toUpperCase(),
          branch_name: bankData.branch_name?.trim() || undefined,
          account_type: bankData.account_type
        });
      }

      await fetchDossier();
      setErrors({});
      setFeedback({ type: "success", message: `Step ${stepNumber} information saved successfully.` });
      setActiveStep(stepNumber + 1);
    } catch (err) {
      console.warn("Step save failed:", err);
      setFeedback({
        type: "error",
        message: err?.message || "Failed to save details. Please check values."
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !startup?.id) return;

    if (file.size > 10 * 1024 * 1024) {
      setFeedback({ type: "error", message: "File size exceeds maximum 10MB limit." });
      return;
    }

    setUploadingDoc(true);
    setFeedback({ type: "", message: "" });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_type", selectedDocType);

      await uploadStartupDocument(startup.id, formData);
      await fetchDossier();
      setFeedback({ type: "success", message: "Document uploaded successfully." });
      e.target.value = "";
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Document upload failed." });
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!startup?.id || isLocked) return;
    try {
      await deleteStartupDocument(startup.id, docId);
      await fetchDossier();
      setFeedback({ type: "success", message: "Document removed." });
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Failed to remove document." });
    }
  };

  const handleSubmitRegistration = async () => {
    if (!startup?.id) return;
    const step8Errors = validateStep8();
    if (Object.keys(step8Errors).length > 0) {
      setErrors(step8Errors);
      setFeedback({ type: "error", message: step8Errors.declaration });
      return;
    }

    setSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      await submitStartupRegistration(startup.id, true);
      await fetchDossier();
      setActiveStep(9);
      setFeedback({ type: "success", message: "Registration dossier successfully submitted for administrative verification!" });
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Submission failed. Please verify required fields." });
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { num: 1, title: "Account & Email" },
    { num: 2, title: "Organization Details" },
    { num: 3, title: "Authorized Person" },
    { num: 4, title: "Business Identity" },
    { num: 5, title: "Tech & Profile" },
    { num: 6, title: "Banking Details" },
    { num: 7, title: "Documents" },
    { num: 8, title: "Review & Sign" },
    { num: 9, title: "Verification Status" }
  ];

  // Maximum step unlocked for forward navigation
  const maxAllowedStep = getFirstIncompleteStep(startup, user, userAccountData, step1Saved);

  if (loading) {
    return (
      <AppLayout role="startup">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-xs font-semibold">Loading GeM-Style Organization Dossier...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="startup">
      <div className="mx-auto max-w-6xl space-y-6">
        
        {/* Top Header & Status Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                GeM-Style Seller Onboarding
              </span>
              <span className="text-xs text-slate-500">
                ID: {startup?.id ? startup.id.slice(0, 8) : "N/A"}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              {startup?.company_name || "Startup Organization Registration"}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Verified organization lifecycle for government sandbox pilots and institutional procurement.
            </p>
          </div>

          {/* Verification Status Badge */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold shadow-sm ${
              vStatus === "VERIFIED"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                : vStatus === "SUBMITTED" || vStatus === "UNDER_REVIEW"
                ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                : vStatus === "CORRECTION_REQUESTED"
                ? "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                : vStatus === "REJECTED"
                ? "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300"
                : "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
            }`}>
              {vStatus === "VERIFIED" ? (
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              ) : vStatus === "SUBMITTED" || vStatus === "UNDER_REVIEW" ? (
                <Clock className="h-5 w-5 text-amber-600" />
              ) : vStatus === "CORRECTION_REQUESTED" ? (
                <AlertCircle className="h-5 w-5 text-blue-600" />
              ) : (
                <FileText className="h-5 w-5 text-slate-500" />
              )}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Verification Status</div>
                <div className="text-sm font-black">{vStatus.replace("_", " ")}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Feedback Alert */}
        {feedback.message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-3 rounded-2xl border p-4 text-xs font-semibold ${
              feedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <span>{feedback.message}</span>
          </motion.div>
        )}

        {/* Step Navigation Bar (Horizontal scroll containing all 9 steps in complete, consistent boxes) */}
        <div className="w-full overflow-x-auto pb-3 pt-1 scrollbar-thin">
          <div className="flex min-w-max items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 pr-8">
            {steps.map((s) => {
              const isCurrent = activeStep === s.num;
              // A step can ONLY show completed ✓ if:
              // 1. It is NOT the active step (current active step never shows ✓)
              // 2. It is strictly BEFORE the active step (no future step may show ✓)
              // 3. All steps up to s.num are sequentially complete
              const isDone = !isCurrent && s.num < activeStep && isStepSequentiallyComplete(s.num);
              const isUnlocked = isLocked || s.num <= maxAllowedStep;

              return (
                <button
                  key={s.num}
                  type="button"
                  disabled={!isUnlocked}
                  onClick={() => {
                    if (isUnlocked) {
                      setActiveStep(s.num);
                    }
                  }}
                  className={`group flex h-11 shrink-0 items-center gap-2.5 rounded-xl border px-3.5 text-xs font-bold transition-all ${
                    isCurrent
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm ring-2 ring-emerald-500/50 dark:border-emerald-500 dark:bg-emerald-600 dark:text-white"
                      : isDone
                      ? "border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100/80 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70"
                      : isUnlocked
                      ? "border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300 dark:hover:bg-slate-800/80"
                      : "cursor-not-allowed border-slate-200/60 bg-slate-50/30 text-slate-400 opacity-60 dark:border-slate-800/50 dark:bg-slate-950/20 dark:text-slate-600"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black transition-colors ${
                      isCurrent
                        ? "bg-white text-slate-900 dark:bg-slate-950 dark:text-emerald-400"
                        : isDone
                        ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950"
                        : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {isDone ? (
                      <Check className="h-3 w-3 stroke-[3]" />
                    ) : (
                      s.num
                    )}
                  </span>
                  <span className="whitespace-nowrap font-semibold tracking-tight">{s.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Wizard Main Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: Account Status */}
            {activeStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold">Step 1: User Account & Email Authentication</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Your personal user credentials and email verification state.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-6 dark:border-slate-800 dark:bg-slate-950/50">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Account Holder Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={userAccountData.name}
                      onChange={(e) => {
                        setUserAccountData((prev) => ({ ...prev, name: e.target.value }));
                        clearError("name");
                      }}
                      placeholder="e.g. Dr. Rajesh Kumar"
                      className={`mt-1.5 w-full rounded-xl border p-3 text-xs font-semibold dark:bg-slate-800 ${
                        errors.name ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 dark:border-slate-700"
                      }`}
                    />
                    {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Official Account Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      disabled={isLocked}
                      value={userAccountData.email}
                      onChange={(e) => {
                        setUserAccountData((prev) => ({ ...prev, email: e.target.value }));
                        clearError("email");
                      }}
                      placeholder="e.g. founder@startup.in"
                      className={`mt-1.5 w-full rounded-xl border p-3 text-xs font-semibold dark:bg-slate-800 ${
                        errors.email ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 dark:border-slate-700"
                      }`}
                    />
                    {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Primary Contact Mobile Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={userAccountData.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setUserAccountData((prev) => ({ ...prev, phone: val }));
                        clearError("phone");
                      }}
                      placeholder="10-digit mobile number (e.g. 9876543210)"
                      className={`mt-1.5 w-full rounded-xl border p-3 text-xs font-semibold dark:bg-slate-800 ${
                        errors.phone ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 dark:border-slate-700"
                      }`}
                    />
                    {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Email Authentication Status
                    </label>
                    <div className="mt-1.5 flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-900">
                      {user?.is_verified || startup?.user?.is_verified ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Verified & Authenticated
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          <Clock className="h-3.5 w-3.5" /> Account Initialized
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveStep(1)}
                    className="flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-6 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? "Validating..." : "Continue to Organization Details"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Organization Details */}
            {activeStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold">Step 2: Organization Constitution & Address</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Enter the legal entity profile as recognized by Ministry of Corporate Affairs or Registrar of Firms.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Legal Enterprise Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={orgData.company_name}
                      onChange={(e) => {
                        setOrgData({ ...orgData, company_name: e.target.value });
                        clearError("company_name");
                      }}
                      placeholder="e.g. MediQueue AI Technologies Private Limited"
                      className={`mt-1 w-full rounded-xl border p-3 text-sm font-medium dark:bg-slate-800 ${
                        errors.company_name ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 dark:border-slate-700"
                      }`}
                    />
                    {errors.company_name && <p className="mt-1 text-xs text-red-500">{errors.company_name}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Entity Constitution Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      disabled={isLocked}
                      value={orgData.org_type}
                      onChange={(e) => {
                        setOrgData({ ...orgData, org_type: e.target.value });
                        clearError("org_type");
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-medium dark:border-slate-700 dark:bg-slate-800"
                    >
                      {ORG_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Date of Incorporation</label>
                    <input
                      type="date"
                      disabled={isLocked}
                      value={orgData.incorporation_date}
                      onChange={(e) => setOrgData({ ...orgData, incorporation_date: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-medium dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Registered Head Office Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      disabled={isLocked}
                      value={orgData.registered_address}
                      onChange={(e) => {
                        setOrgData({ ...orgData, registered_address: e.target.value });
                        clearError("registered_address");
                      }}
                      placeholder="Floor, Building, Tech Park / Street Address"
                      className={`mt-1 w-full rounded-xl border p-3 text-sm font-medium dark:bg-slate-800 ${
                        errors.registered_address ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 dark:border-slate-700"
                      }`}
                    />
                    {errors.registered_address && <p className="mt-1 text-xs text-red-500">{errors.registered_address}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      State / Union Territory <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      options={getStatesAndUTs()}
                      value={orgData.state}
                      disabled={isLocked}
                      placeholder="Select State / UT"
                      onChange={(val) => {
                        setOrgData({ ...orgData, state: val, city: "" });
                        clearError("state");
                      }}
                    />
                    {errors.state && <p className="mt-1 text-xs text-red-500">{errors.state}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      City / District <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      options={getCitiesForState(orgData.state)}
                      value={orgData.city}
                      disabled={isLocked || !orgData.state}
                      placeholder={orgData.state ? "Select City" : "Select State first"}
                      onChange={(val) => {
                        setOrgData({ ...orgData, city: val });
                        clearError("city");
                      }}
                    />
                    {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Postal PIN Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      disabled={isLocked}
                      value={orgData.pincode}
                      onChange={(e) => {
                        setOrgData({ ...orgData, pincode: e.target.value.replace(/\D/g, "") });
                        clearError("pincode");
                      }}
                      placeholder="e.g. 560001"
                      className={`mt-1 w-full rounded-xl border p-3 text-sm font-medium dark:bg-slate-800 ${
                        errors.pincode ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 dark:border-slate-700"
                      }`}
                    />
                    {errors.pincode && <p className="mt-1 text-xs text-red-500">{errors.pincode}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Official Website</label>
                    <input
                      type="url"
                      disabled={isLocked}
                      value={orgData.official_website}
                      onChange={(e) => setOrgData({ ...orgData, official_website: e.target.value })}
                      placeholder="https://yourstartup.in"
                      className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-medium dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-5 text-xs font-bold hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveStep(2)}
                    className="flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-6 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save & Proceed"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Authorized Person */}
            {activeStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold">Step 3: Authorized Signatory Details</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Details of the designated officer legally empowered to execute procurement agreements.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Signatory Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={authPersonData.authorized_person_name}
                      onChange={(e) => {
                        setAuthPersonData({ ...authPersonData, authorized_person_name: e.target.value });
                        clearError("authorized_person_name");
                      }}
                      placeholder="e.g. Vikas Sharma"
                      className={`mt-1 w-full rounded-xl border p-3 text-sm font-medium dark:bg-slate-800 ${
                        errors.authorized_person_name ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 dark:border-slate-700"
                      }`}
                    />
                    {errors.authorized_person_name && <p className="mt-1 text-xs text-red-500">{errors.authorized_person_name}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Official Designation <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={authPersonData.authorized_person_designation}
                      onChange={(e) => {
                        setAuthPersonData({ ...authPersonData, authorized_person_designation: e.target.value });
                        clearError("authorized_person_designation");
                      }}
                      placeholder="e.g. Founder & Managing Director"
                      className={`mt-1 w-full rounded-xl border p-3 text-sm font-medium dark:bg-slate-800 ${
                        errors.authorized_person_designation ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 dark:border-slate-700"
                      }`}
                    />
                    {errors.authorized_person_designation && <p className="mt-1 text-xs text-red-500">{errors.authorized_person_designation}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Official Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      disabled={isLocked}
                      value={authPersonData.authorized_person_email}
                      onChange={(e) => {
                        setAuthPersonData({ ...authPersonData, authorized_person_email: e.target.value });
                        clearError("authorized_person_email");
                      }}
                      placeholder="authorized@yourstartup.in"
                      className={`mt-1 w-full rounded-xl border p-3 text-sm font-medium dark:bg-slate-800 ${
                        errors.authorized_person_email ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 dark:border-slate-700"
                      }`}
                    />
                    {errors.authorized_person_email && <p className="mt-1 text-xs text-red-500">{errors.authorized_person_email}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Mobile Contact Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      disabled={isLocked}
                      value={authPersonData.authorized_person_phone}
                      onChange={(e) => {
                        setAuthPersonData({ ...authPersonData, authorized_person_phone: e.target.value });
                        clearError("authorized_person_phone");
                      }}
                      placeholder="10-digit mobile number"
                      className={`mt-1 w-full rounded-xl border p-3 text-sm font-medium dark:bg-slate-800 ${
                        errors.authorized_person_phone ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 dark:border-slate-700"
                      }`}
                    />
                    {errors.authorized_person_phone && <p className="mt-1 text-xs text-red-500">{errors.authorized_person_phone}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Authorization Basis / Document Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      disabled={isLocked}
                      value={authPersonData.authorization_type}
                      onChange={(e) => setAuthPersonData({ ...authPersonData, authorization_type: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-medium dark:border-slate-700 dark:bg-slate-800"
                    >
                      <option value="BOARD_RESOLUTION">Board Resolution</option>
                      <option value="POWER_OF_ATTORNEY">Power of Attorney</option>
                      <option value="PROPRIETOR_DECLARATION">Proprietor Self-Declaration</option>
                      <option value="PARTNERSHIP_DEED">Partnership Deed Authorization</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-5 text-xs font-bold hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveStep(3)}
                    className="flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-6 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save & Proceed"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Business Identity */}
            {activeStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold">Step 4: Statutory Business Identity</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Provide your Income Tax PAN, GSTIN, and DPIIT recognition certificate if available.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Business PAN (10 chars) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      disabled={isLocked}
                      value={bizIdentityData.pan_number}
                      onChange={(e) => {
                        setBizIdentityData({ ...bizIdentityData, pan_number: e.target.value.toUpperCase() });
                        clearError("pan_number");
                      }}
                      placeholder="e.g. AABCM1234E"
                      className={`mt-1 w-full rounded-xl border p-3 font-mono text-sm font-bold uppercase dark:bg-slate-800 ${
                        errors.pan_number ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 dark:border-slate-700"
                      }`}
                    />
                    {errors.pan_number && <p className="mt-1 text-xs text-red-500">{errors.pan_number}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">GSTIN (Optional)</label>
                    <input
                      type="text"
                      maxLength={15}
                      disabled={isLocked}
                      value={bizIdentityData.gstin}
                      onChange={(e) => {
                        setBizIdentityData({ ...bizIdentityData, gstin: e.target.value.toUpperCase() });
                        clearError("gstin");
                      }}
                      placeholder="15-character GSTIN"
                      className="mt-1 w-full rounded-xl border border-slate-200 p-3 font-mono text-sm font-medium uppercase dark:border-slate-700 dark:bg-slate-800"
                    />
                    {errors.gstin && <p className="mt-1 text-xs text-red-500">{errors.gstin}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">CIN (For Companies)</label>
                    <input
                      type="text"
                      maxLength={21}
                      disabled={isLocked}
                      value={bizIdentityData.cin_number}
                      onChange={(e) => {
                        setBizIdentityData({ ...bizIdentityData, cin_number: e.target.value.toUpperCase() });
                        clearError("cin_number");
                      }}
                      placeholder="21-character Corporate Identity Number"
                      className="mt-1 w-full rounded-xl border border-slate-200 p-3 font-mono text-sm font-medium uppercase dark:border-slate-700 dark:bg-slate-800"
                    />
                    {errors.cin_number && <p className="mt-1 text-xs text-red-500">{errors.cin_number}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">DPIIT Recognition Number</label>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={bizIdentityData.dpiit_number}
                      onChange={(e) => setBizIdentityData({ ...bizIdentityData, dpiit_number: e.target.value.toUpperCase() })}
                      placeholder="e.g. DIPP12345"
                      className="mt-1 w-full rounded-xl border border-slate-200 p-3 font-mono text-sm font-medium uppercase dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-5 text-xs font-bold hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveStep(4)}
                    className="flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-6 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save & Proceed"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 5: Tech & Profile */}
            {activeStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold">Step 5: Technology & Innovation Profile</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Describe your core technological competencies, primary domain, and product readiness.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Primary Sector / Domain <span className="text-red-500">*</span>
                    </label>
                    <select
                      disabled={isLocked}
                      value={techProfileData.domain}
                      onChange={(e) => {
                        setTechProfileData({ ...techProfileData, domain: e.target.value });
                        clearError("domain");
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-medium dark:border-slate-700 dark:bg-slate-800"
                    >
                      <option value="">Select Domain / Focus Area</option>
                      {DOMAINS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    {errors.domain && <p className="mt-1 text-xs text-red-500">{errors.domain}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Executive Summary & Capability Statement <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      disabled={isLocked}
                      value={techProfileData.description}
                      onChange={(e) => {
                        setTechProfileData({ ...techProfileData, description: e.target.value });
                        clearError("description");
                      }}
                      placeholder="Concise overview of your technological capabilities, mission, and problem-solving focus."
                      className={`mt-1 w-full rounded-xl border p-3 text-sm font-medium dark:bg-slate-800 ${
                        errors.description ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 dark:border-slate-700"
                      }`}
                    />
                    {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Key Technologies / Stack</label>
                    <TechTagInput
                      tags={techProfileData.technologies}
                      disabled={isLocked}
                      onChange={(newTags) => setTechProfileData({ ...techProfileData, technologies: newTags })}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Technology Readiness Level (TRL: 1 to 9) <span className="text-red-500">*</span>
                    </label>
                    <select
                      disabled={isLocked}
                      value={techProfileData.readiness_level}
                      onChange={(e) => setTechProfileData({ ...techProfileData, readiness_level: parseInt(e.target.value, 10) })}
                      className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-medium dark:border-slate-700 dark:bg-slate-800"
                    >
                      <option value={1}>TRL 1 - Basic Principles Observed</option>
                      <option value={2}>TRL 2 - Technology Concept Formulated</option>
                      <option value={3}>TRL 3 - Experimental Proof of Concept</option>
                      <option value={4}>TRL 4 - Technology Validated in Lab</option>
                      <option value={5}>TRL 5 - Validated in Relevant Environment</option>
                      <option value={6}>TRL 6 - Demonstrated in Relevant Environment</option>
                      <option value={7}>TRL 7 - System Prototype Demonstrated in Operational Sandbox</option>
                      <option value={8}>TRL 8 - System Complete and Qualified</option>
                      <option value={9}>TRL 9 - Actual System Proven in Operational Environment</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Years in Operation</label>
                    <input
                      type="number"
                      min={0}
                      disabled={isLocked}
                      value={techProfileData.years_experience}
                      onChange={(e) => setTechProfileData({ ...techProfileData, years_experience: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-medium dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveStep(4)}
                    className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-5 text-xs font-bold hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveStep(5)}
                    className="flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-6 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save & Proceed"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 6: Banking Details */}
            {activeStep === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold">Step 6: Escrow & Milestone Banking Details</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Verified commercial bank account for government sandbox grants, challenge milestones, and direct DBT payouts.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Account Beneficiary Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={bankData.account_holder_name}
                      onChange={(e) => {
                        setBankData({ ...bankData, account_holder_name: e.target.value });
                        clearError("account_holder_name");
                      }}
                      placeholder="Must match incorporation / proprietor name"
                      className={`mt-1 w-full rounded-xl border p-3 text-sm font-medium dark:bg-slate-800 ${
                        errors.account_holder_name ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 dark:border-slate-700"
                      }`}
                    />
                    {errors.account_holder_name && <p className="mt-1 text-xs text-red-500">{errors.account_holder_name}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Bank Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={bankData.bank_name}
                      onChange={(e) => {
                        setBankData({ ...bankData, bank_name: e.target.value });
                        clearError("bank_name");
                      }}
                      placeholder="e.g. State Bank of India, HDFC Bank"
                      className={`mt-1 w-full rounded-xl border p-3 text-sm font-medium dark:bg-slate-800 ${
                        errors.bank_name ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 dark:border-slate-700"
                      }`}
                    />
                    {errors.bank_name && <p className="mt-1 text-xs text-red-500">{errors.bank_name}</p>}
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Bank Account Number <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAccountNumber(!showAccountNumber)}
                        className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
                      >
                        {showAccountNumber ? "Mask Number" : "Reveal Number"}
                      </button>
                    </div>
                    <input
                      type={showAccountNumber ? "text" : "password"}
                      disabled={isLocked}
                      value={bankData.account_number}
                      onChange={(e) => {
                        setBankData({ ...bankData, account_number: e.target.value });
                        clearError("account_number");
                      }}
                      placeholder="9 to 18 digits account number"
                      className={`mt-1 w-full rounded-xl border p-3 font-mono text-sm font-bold dark:bg-slate-800 ${
                        errors.account_number ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 dark:border-slate-700"
                      }`}
                    />
                    {errors.account_number && <p className="mt-1 text-xs text-red-500">{errors.account_number}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Bank IFSC Code (11 chars) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={11}
                      disabled={isLocked}
                      value={bankData.ifsc_code}
                      onChange={(e) => {
                        setBankData({ ...bankData, ifsc_code: e.target.value.toUpperCase() });
                        clearError("ifsc_code");
                      }}
                      placeholder="e.g. SBIN0001234"
                      className={`mt-1 w-full rounded-xl border p-3 font-mono text-sm font-bold uppercase dark:bg-slate-800 ${
                        errors.ifsc_code ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 dark:border-slate-700"
                      }`}
                    />
                    {errors.ifsc_code && <p className="mt-1 text-xs text-red-500">{errors.ifsc_code}</p>}
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveStep(5)}
                    className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-5 text-xs font-bold hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveStep(6)}
                    className="flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-6 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save & Proceed"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 7: Statutory Documents */}
            {activeStep === 7 && (
              <motion.div
                key="step7"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold">Step 7: Statutory Verification Documents</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Upload official PDF or scan copies of mandatory statutory identity instruments.
                  </p>
                </div>

                {/* Upload Box */}
                {!isLocked && (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 dark:border-slate-800 text-center">
                    <div className="mx-auto flex max-w-md flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                        <Upload className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold">Upload Statutory Document</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          PDF, PNG, JPEG up to 10MB per document
                        </p>
                      </div>

                      <div className="flex w-full flex-col sm:flex-row gap-2">
                        <select
                          value={selectedDocType}
                          onChange={(e) => setSelectedDocType(e.target.value)}
                          className="rounded-xl border border-slate-200 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
                        >
                          {ALL_DOCUMENT_DEFINITIONS.map((d) => (
                            <option key={d.id} value={d.id}>{d.label}</option>
                          ))}
                        </select>

                        <label className="btn-primary inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-emerald-700">
                          <span>{uploadingDoc ? "Uploading..." : "Select File"}</span>
                          <input
                            type="file"
                            disabled={uploadingDoc}
                            onChange={handleDocumentUpload}
                            className="hidden"
                            accept=".pdf,.png,.jpg,.jpeg"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {errors.documents && <p className="text-xs font-semibold text-red-500">{errors.documents}</p>}

                {/* Document List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Uploaded Dossier Documents ({documents.length})</h4>
                  {documents.length === 0 ? (
                    <div className="rounded-xl border border-slate-100 p-4 text-center text-xs text-slate-400 dark:border-slate-800">
                      No documents uploaded yet. Please upload all required files.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-2xl border border-slate-100 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-950/40">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-emerald-600" />
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white">
                                {doc.document_type.replace(/_/g, " ")}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {doc.file_name || "Statutory Document"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              {doc.verification_status || "PENDING"}
                            </span>
                            {!isLocked && (
                              <button
                                type="button"
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveStep(6)}
                    className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-5 text-xs font-bold hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const errs = validateStep7();
                      if (Object.keys(errs).length > 0) {
                        setErrors(errs);
                        setFeedback({ type: "error", message: errs.documents });
                        return;
                      }
                      setErrors({});
                      setActiveStep(8);
                    }}
                    className="flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-6 text-xs font-bold text-white shadow-md hover:bg-emerald-700"
                  >
                    Proceed to Review & Sign
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 8: Review & Legal Sign */}
            {activeStep === 8 && (
              <motion.div
                key="step8"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold">Step 8: Review Dossier & Execute Legal Declaration</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Carefully review all submitted statutory credentials prior to administrative submission.
                  </p>
                </div>

                {/* Summary Box */}
                <div className="grid gap-4 sm:grid-cols-2 rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/50 text-xs">
                  <div>
                    <span className="font-bold text-slate-400 uppercase">Enterprise:</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">{orgData.company_name || startup?.company_name}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 uppercase">PAN:</span>
                    <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">{bizIdentityData.pan_number || startup?.pan_number}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 uppercase">Signatory:</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">{authPersonData.authorized_person_name || startup?.authorized_person_name}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 uppercase">Bank Account:</span>
                    <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">{bankData.bank_name} - {bankData.account_number}</p>
                  </div>
                </div>

                {/* Declaration Checkbox */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={isLocked}
                      checked={declarationAccepted}
                      onChange={(e) => {
                        setDeclarationAccepted(e.target.checked);
                        clearError("declaration");
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      <span className="font-bold">Solemn Declaration of Authenticity: </span>
                      I hereby declare and warrant under penalties of applicable statutory provisions that all the information, identity instruments, and documents submitted herein are genuine, complete, and legally valid.
                    </div>
                  </label>
                  {errors.declaration && <p className="mt-2 text-xs font-semibold text-red-500">{errors.declaration}</p>}
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveStep(7)}
                    className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-5 text-xs font-bold hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button
                    type="button"
                    disabled={saving || !declarationAccepted}
                    onClick={handleSubmitRegistration}
                    className="flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-8 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? "Submitting Dossier..." : "Submit Dossier for Verification"}
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 9: Verification Status Dashboard */}
            {activeStep === 9 && (
              <motion.div
                key="step9"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold">Step 9: Administrative Verification Status</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Live lifecycle state of your GeM-style seller onboarding verification.
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-950/40 text-center">
                  <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
                    vStatus === "VERIFIED"
                      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                      : vStatus === "SUBMITTED" || vStatus === "UNDER_REVIEW"
                      ? "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                      : vStatus === "CORRECTION_REQUESTED"
                      ? "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                      : vStatus === "REJECTED"
                      ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                      : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}>
                    {vStatus === "VERIFIED" ? (
                      <ShieldCheck className="h-8 w-8" />
                    ) : vStatus === "SUBMITTED" || vStatus === "UNDER_REVIEW" ? (
                      <Clock className="h-8 w-8" />
                    ) : vStatus === "CORRECTION_REQUESTED" ? (
                      <RefreshCw className="h-8 w-8" />
                    ) : (
                      <AlertCircle className="h-8 w-8" />
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {vStatus === "VERIFIED"
                      ? "Officially Verified Organization"
                      : vStatus === "UNDER_REVIEW"
                      ? "Under Nodal Officer Review"
                      : vStatus === "SUBMITTED"
                      ? "Submitted - Awaiting Review"
                      : vStatus === "CORRECTION_REQUESTED"
                      ? "Action Required: Correction Requested"
                      : vStatus === "REJECTED"
                      ? "Registration Verification Rejected"
                      : "Draft Registration"}
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {vStatus === "VERIFIED"
                      ? "Your organization credentials and documents have been verified. You are eligible to submit proposals for all public government challenges and enter sandbox procurement contracts."
                      : vStatus === "UNDER_REVIEW" || vStatus === "SUBMITTED"
                      ? "Your dossier has been submitted to the platform nodal officers for PAN, entity constitution, and private document validation. Verification decisions are completed within 24 to 48 hours."
                      : vStatus === "CORRECTION_REQUESTED"
                      ? (startup?.correction_notes || "Administrative review identified items needing correction. Please update the requested records and re-submit your dossier.")
                      : vStatus === "REJECTED"
                      ? (startup?.rejection_reason || "Your registration dossier was reviewed and rejected. Please contact support or submit updated credentials.")
                      : "Please complete all registration steps and submit your dossier for verification."}
                  </p>

                  {/* For CORRECTION_REQUESTED: Show admin correction notes box */}
                  {vStatus === "CORRECTION_REQUESTED" && startup?.correction_notes && (
                    <div className="mx-auto mt-4 max-w-md rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 text-left text-xs text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
                      <p className="font-bold mb-1">Admin Correction Notes:</p>
                      <p>{startup.correction_notes}</p>
                    </div>
                  )}

                  {/* For REJECTED: Show rejection reason box */}
                  {vStatus === "REJECTED" && startup?.rejection_reason && (
                    <div className="mx-auto mt-4 max-w-md rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-left text-xs text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                      <p className="font-bold mb-1">Rejection Reason:</p>
                      <p>{startup.rejection_reason}</p>
                    </div>
                  )}

                  {/* If Correction requested, Draft, or Rejected, offer edit button */}
                  {(vStatus === "DRAFT" || vStatus === "CORRECTION_REQUESTED" || vStatus === "REJECTED") && (
                    <div className="mt-6 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setActiveStep(2)}
                        className="btn-primary rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500"
                      >
                        {vStatus === "CORRECTION_REQUESTED" ? "Update Requested Records & Resubmit" : "Edit Registration Dossier"}
                      </button>
                    </div>
                  )}

                  {vStatus === "VERIFIED" && (
                    <div className="mt-6 flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => navigate("/startup/challenges")}
                        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-md"
                      >
                        Discover Government Challenges
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </AppLayout>
  );
}
