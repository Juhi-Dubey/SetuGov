import { useState, useEffect } from "react";
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
import { useAuth } from "../../context/AuthContext";

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

export default function StartupProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeStep, setActiveStep] = useState(1);
  const [startup, setStartup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

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

  const [techInput, setTechInput] = useState("");

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
      const s = res?.data?.startup || res?.startup;
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

        // If startup is already SUBMITTED or VERIFIED, jump to status review step by default
        if (s.verification_status === "VERIFIED" || s.verification_status === "SUBMITTED" || s.verification_status === "UNDER_REVIEW") {
          setActiveStep(9);
        }
      }
    } catch (err) {
      console.error("Failed to load startup registration:", err);
      setFeedback({ type: "error", message: err?.message || "Failed to load registration data." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDossier();
  }, []);

  const vStatus = startup?.verification_status || "DRAFT";
  const isLocked = vStatus === "UNDER_REVIEW" || vStatus === "VERIFIED";

  const handleSaveStep = async (stepNumber) => {
    if (!startup?.id) return;
    setSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      if (stepNumber === 2) {
        await updateRegistration(startup.id, orgData);
      } else if (stepNumber === 3) {
        await updateRegistration(startup.id, authPersonData);
      } else if (stepNumber === 4) {
        await updateRegistration(startup.id, bizIdentityData);
      } else if (stepNumber === 5) {
        await updateRegistration(startup.id, techProfileData);
      } else if (stepNumber === 6) {
        await saveBankDetails(startup.id, bankData);
      }

      setFeedback({ type: "success", message: "Section saved successfully!" });
      setTimeout(() => setFeedback({ type: "", message: "" }), 3000);
      setActiveStep(Math.min(9, stepNumber + 1));
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Failed to save data." });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !startup?.id) return;

    setUploadingDoc(true);
    setFeedback({ type: "", message: "" });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_type", selectedDocType);

      await uploadStartupDocument(startup.id, formData);
      await fetchDossier();
      setFeedback({ type: "success", message: `${selectedDocType} document uploaded securely.` });
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Document upload failed." });
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!startup?.id) return;
    try {
      await deleteStartupDocument(startup.id, docId);
      await fetchDossier();
      setFeedback({ type: "success", message: "Document removed." });
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Failed to remove document." });
    }
  };

  const handleAddTech = () => {
    if (techInput.trim() && !techProfileData.technologies.includes(techInput.trim())) {
      setTechProfileData(prev => ({
        ...prev,
        technologies: [...prev.technologies, techInput.trim()]
      }));
      setTechInput("");
    }
  };

  const handleRemoveTech = (tech) => {
    setTechProfileData(prev => ({
      ...prev,
      technologies: prev.technologies.filter(t => t !== tech)
    }));
  };

  const handleSubmitRegistration = async () => {
    if (!startup?.id) return;
    if (!declarationAccepted) {
      setFeedback({ type: "error", message: "Please accept the legal accuracy declaration before submission." });
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
    { num: 2, title: "Organization" },
    { num: 3, title: "Authorized Person" },
    { num: 4, title: "Business Identity" },
    { num: 5, title: "Tech & Profile" },
    { num: 6, title: "Banking Details" },
    { num: 7, title: "Documents" },
    { num: 8, title: "Review & Sign" },
    { num: 9, title: "Verification Status" }
  ];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-xs font-semibold">Loading GeM-Style Organization Dossier...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 dark:bg-slate-950 text-slate-900 dark:text-white">
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

        {/* Step Navigation Pill Bar */}
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-[760px] items-center justify-between rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            {steps.map((s) => {
              const isCurrent = activeStep === s.num;
              const isPast = activeStep > s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setActiveStep(s.num)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                    isCurrent
                      ? "bg-slate-900 text-white shadow-sm dark:bg-emerald-600 dark:text-white"
                      : isPast
                      ? "text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-slate-800"
                      : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                    isCurrent
                      ? "bg-white text-slate-900 dark:bg-slate-950 dark:text-emerald-400"
                      : isPast
                      ? "bg-emerald-200 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                  }`}>
                    {isPast ? <Check className="h-3 w-3" /> : s.num}
                  </span>
                  <span className="whitespace-nowrap">{s.title}</span>
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

                <div className="grid gap-4 sm:grid-cols-2 rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/50">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500">Account Name:</span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{startup?.user?.name}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500">Founder Email:</span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{startup?.user?.email}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500">Email Verification Status:</span>
                    <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{startup?.user?.is_verified ? "Verified & Authenticated" : "Pending Verification"}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500">Platform Role:</span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">STARTUP / INNOVATOR</p>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-6 text-xs font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                  >
                    Continue to Organization Details
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
                  <h2 className="text-xl font-bold">Step 2: Legal Organization Details</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Enter the registered legal entity details exactly as recorded with Ministry of Corporate Affairs or Registrar of Firms.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Legal Entity Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={orgData.company_name}
                      onChange={(e) => setOrgData({ ...orgData, company_name: e.target.value })}
                      placeholder="e.g. Setu Diagnostic Systems Private Limited"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Organization Constitution / Type *
                    </label>
                    <select
                      value={orgData.org_type}
                      onChange={(e) => setOrgData({ ...orgData, org_type: e.target.value })}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                    >
                      {ORG_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Date of Incorporation / Registration
                    </label>
                    <input
                      type="date"
                      value={orgData.incorporation_date}
                      onChange={(e) => setOrgData({ ...orgData, incorporation_date: e.target.value })}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Registered Head Office Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={orgData.registered_address}
                      onChange={(e) => setOrgData({ ...orgData, registered_address: e.target.value })}
                      placeholder="Street address, building, industrial area"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">City *</label>
                    <input
                      type="text"
                      required
                      value={orgData.city}
                      onChange={(e) => setOrgData({ ...orgData, city: e.target.value })}
                      placeholder="e.g. Bengaluru"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">State / UT *</label>
                    <input
                      type="text"
                      required
                      value={orgData.state}
                      onChange={(e) => setOrgData({ ...orgData, state: e.target.value })}
                      placeholder="e.g. Karnataka"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Postal PIN Code *</label>
                    <input
                      type="text"
                      required
                      value={orgData.pincode}
                      onChange={(e) => setOrgData({ ...orgData, pincode: e.target.value })}
                      placeholder="6-digit PIN"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Official Website</label>
                    <input
                      type="url"
                      value={orgData.official_website}
                      onChange={(e) => setOrgData({ ...orgData, official_website: e.target.value })}
                      placeholder="https://company.ai"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
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
                    className="flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-6 text-xs font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Save & Next <ArrowRight className="h-4 w-4" />
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
                    Details of the officer authorized to sign government contracts, tenders, and submit deliverables.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Authorized Signatory Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={authPersonData.authorized_person_name}
                      onChange={(e) => setAuthPersonData({ ...authPersonData, authorized_person_name: e.target.value })}
                      placeholder="e.g. Ramesh Chandra"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Official Designation *
                    </label>
                    <input
                      type="text"
                      required
                      value={authPersonData.authorized_person_designation}
                      onChange={(e) => setAuthPersonData({ ...authPersonData, authorized_person_designation: e.target.value })}
                      placeholder="e.g. Founder & Chief Executive Officer"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Official Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={authPersonData.authorized_person_email}
                      onChange={(e) => setAuthPersonData({ ...authPersonData, authorized_person_email: e.target.value })}
                      placeholder="ceo@company.ai"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Authorized Contact Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={authPersonData.authorized_person_phone}
                      onChange={(e) => setAuthPersonData({ ...authPersonData, authorized_person_phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Authorization Type / Basis *
                    </label>
                    <select
                      value={authPersonData.authorization_type}
                      onChange={(e) => setAuthPersonData({ ...authPersonData, authorization_type: e.target.value })}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                    >
                      <option value="BOARD_RESOLUTION">Board Resolution (Companies / LLPs)</option>
                      <option value="POWER_OF_ATTORNEY">Power of Attorney (POA)</option>
                      <option value="PROPRIETOR_FOUNDER">Sole Proprietor / Direct Founder</option>
                      <option value="PARTNER_AUTHORIZATION">Partner Authorization Deed</option>
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
                    className="flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-6 text-xs font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Save & Next <ArrowRight className="h-4 w-4" />
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
                  <h2 className="text-xl font-bold">Step 4: Statutory Business Identity & Registrations</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Provide your Indian statutory business identifiers (PAN, GSTIN, CIN, DPIIT recognition).
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Business PAN (10 chars alphanumeric) *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={bizIdentityData.pan_number}
                      onChange={(e) => setBizIdentityData({ ...bizIdentityData, pan_number: e.target.value.toUpperCase() })}
                      placeholder="e.g. ABCDE1234F"
                      className="h-10 w-full font-mono rounded-xl border border-slate-200 bg-white px-3.5 text-xs uppercase outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      GSTIN (15 chars)
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      value={bizIdentityData.gstin}
                      onChange={(e) => setBizIdentityData({ ...bizIdentityData, gstin: e.target.value.toUpperCase() })}
                      placeholder="e.g. 29ABCDE1234F1Z5"
                      className="h-10 w-full font-mono rounded-xl border border-slate-200 bg-white px-3.5 text-xs uppercase outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Corporate Identification Number (CIN)
                    </label>
                    <input
                      type="text"
                      maxLength={21}
                      value={bizIdentityData.cin_number}
                      onChange={(e) => setBizIdentityData({ ...bizIdentityData, cin_number: e.target.value.toUpperCase() })}
                      placeholder="e.g. U72900KA2024PTC123456"
                      className="h-10 w-full font-mono rounded-xl border border-slate-200 bg-white px-3.5 text-xs uppercase outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      DPIIT Recognition Number
                    </label>
                    <input
                      type="text"
                      value={bizIdentityData.dpiit_number}
                      onChange={(e) => setBizIdentityData({ ...bizIdentityData, dpiit_number: e.target.value })}
                      placeholder="e.g. DIPP12345"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
                  <p className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    Verification Source Policy:
                  </p>
                  <p className="mt-1 leading-relaxed">
                    SetuGov performs cryptographic format validation and administrative document cross-referencing. Upload supporting PAN and Certificate copies in Step 7.
                  </p>
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
                    className="flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-6 text-xs font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Save & Next <ArrowRight className="h-4 w-4" />
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
                  <h2 className="text-xl font-bold">Step 5: Technology Capabilities & Deployment History</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Describe your core technological solutions for challenge matching and eligibility scoring.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Organization Executive Summary *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={techProfileData.description}
                      onChange={(e) => setTechProfileData({ ...techProfileData, description: e.target.value })}
                      placeholder="Brief overview of innovations, mission delivery capabilities, and key product offerings..."
                      className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Primary Sector / Domain *
                    </label>
                    <select
                      value={techProfileData.domain}
                      onChange={(e) => setTechProfileData({ ...techProfileData, domain: e.target.value })}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                    >
                      {DOMAINS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Technology Readiness Level (TRL 1-9) *
                    </label>
                    <select
                      value={techProfileData.readiness_level}
                      onChange={(e) => setTechProfileData({ ...techProfileData, readiness_level: parseInt(e.target.value, 10) })}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 font-bold"
                    >
                      <option value={1}>TRL 1 - Basic Principles Observed</option>
                      <option value={2}>TRL 2 - Technology Concept Formulated</option>
                      <option value={3}>TRL 3 - Proof of Concept Demonstrated</option>
                      <option value={4}>TRL 4 - Component Validated in Lab</option>
                      <option value={5}>TRL 5 - System Validated in Relevant Environment</option>
                      <option value={6}>TRL 6 - Prototype Demonstrated in Relevant Environment</option>
                      <option value={7}>TRL 7 - System Prototype Demonstrated in Operational Environment</option>
                      <option value={8}>TRL 8 - Actual System Completed and Qualified</option>
                      <option value={9}>TRL 9 - Actual System Proven in Operational Sandbox</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Core Technologies (Press Enter or Add)
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={techInput}
                        onChange={(e) => setTechInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTech(); } }}
                        placeholder="e.g. Edge AI, Computer Vision, HL7/FHIR, LoRaWAN"
                        className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                      />
                      <button
                        type="button"
                        onClick={handleAddTech}
                        className="rounded-xl bg-slate-800 px-4 text-xs font-bold text-white hover:bg-slate-700 dark:bg-slate-700"
                      >
                        Add
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                      {techProfileData.technologies.map(t => (
                        <span key={t} className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                          {t}
                          <button type="button" onClick={() => handleRemoveTech(t)} className="hover:text-red-500">&times;</button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Years of Domain Experience
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={techProfileData.years_experience}
                      onChange={(e) => setTechProfileData({ ...techProfileData, years_experience: parseInt(e.target.value, 10) || 0 })}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Previous Commercial / Public Deployments
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={techProfileData.previous_deployments}
                      onChange={(e) => setTechProfileData({ ...techProfileData, previous_deployments: parseInt(e.target.value, 10) || 0 })}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950"
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
                    className="flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-6 text-xs font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Save & Next <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 6: Sensitive Bank Account */}
            {activeStep === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300 mb-2">
                    <Lock className="h-3 w-3" />
                    Protected Financial Record (Masked in Public Views)
                  </div>
                  <h2 className="text-xl font-bold">Step 6: Verified Bank Account (For Procurement & Grants)</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Enter the legal company bank account for milestone funding disbursements. Raw account numbers are protected with strict access controls and masked in public views.
                  </p>
                </div>

                {isLocked && (
                  <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                    <Lock className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>Bank information is locked while registration is <strong>{vStatus.replace("_", " ")}</strong>.</span>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Account Holder Legal Name *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isLocked}
                      value={bankData.account_holder_name}
                      onChange={(e) => setBankData({ ...bankData, account_holder_name: e.target.value })}
                      placeholder="Must match Legal Entity Name"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isLocked}
                      value={bankData.bank_name}
                      onChange={(e) => setBankData({ ...bankData, bank_name: e.target.value })}
                      placeholder="e.g. State Bank of India"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Bank Account Number *
                      </label>
                      {bankData.account_number && (
                        <button
                          type="button"
                          onClick={() => setShowAccountNumber(!showAccountNumber)}
                          className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                        >
                          <Eye className="h-3 w-3" />
                          {showAccountNumber ? "Hide" : "Reveal"}
                        </button>
                      )}
                    </div>
                    <input
                      type={showAccountNumber ? "text" : "password"}
                      required
                      disabled={isLocked}
                      value={bankData.account_number}
                      onChange={(e) => setBankData({ ...bankData, account_number: e.target.value })}
                      placeholder="9 to 18 digits"
                      className="h-10 w-full font-mono rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Bank IFSC Code (11 chars) *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isLocked}
                      maxLength={11}
                      value={bankData.ifsc_code}
                      onChange={(e) => setBankData({ ...bankData, ifsc_code: e.target.value.toUpperCase() })}
                      placeholder="e.g. SBIN0001234"
                      className="h-10 w-full font-mono uppercase rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Branch Name
                    </label>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={bankData.branch_name}
                      onChange={(e) => setBankData({ ...bankData, branch_name: e.target.value })}
                      placeholder="e.g. Koramangala Industrial Branch"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Account Type
                    </label>
                    <select
                      disabled={isLocked}
                      value={bankData.account_type}
                      onChange={(e) => setBankData({ ...bankData, account_type: e.target.value })}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 disabled:opacity-60"
                    >
                      <option value="CURRENT">Current Account</option>
                      <option value="SAVINGS">Savings Account (Proprietorship only)</option>
                      <option value="ESCROW">Escrow Account</option>
                    </select>
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
                  {isLocked ? (
                    <button
                      type="button"
                      onClick={() => setActiveStep(7)}
                      className="flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-6 text-xs font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                    >
                      Next <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleSaveStep(6)}
                      className="flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-6 text-xs font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Save & Next <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 7: Document Checklist */}
            {activeStep === 7 && (
              <motion.div
                key="step7"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold">Step 7: Verification Documents Checklist</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Upload private PDF/PNG verification proofs. Uploaded files are served securely and inspected only by nodal officers.
                  </p>
                </div>

                {isLocked && (
                  <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                    <Lock className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>Document uploads and removals are locked while registration is <strong>{vStatus.replace("_", " ")}</strong>.</span>
                  </div>
                )}

                {/* Entity-Specific Mandatory Document Requirements Checklist */}
                {(() => {
                  const reqDocTypes = getRequiredDocumentTypes(orgData.org_type);
                  const uploadedTypes = new Set(documents.map(d => d.document_type));
                  const allRequiredUploaded = reqDocTypes.every(t => uploadedTypes.has(t));

                  return (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/60">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <FileCheck className="h-4 w-4 text-emerald-600" />
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Required Statutory Documents for {orgData.org_type.replace(/_/g, " ")}
                          </h3>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          allRequiredUploaded
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}>
                          {allRequiredUploaded ? "All Mandatory Documents Attached" : "Pending Mandatory Documents"}
                        </span>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        {reqDocTypes.map(typeId => {
                          const isUploaded = uploadedTypes.has(typeId);
                          const def = ALL_DOCUMENT_DEFINITIONS.find(d => d.id === typeId) || { label: typeId.replace(/_/g, " "), description: "" };

                          return (
                            <div
                              key={typeId}
                              className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs ${
                                isUploaded
                                  ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                                  : "border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20"
                              }`}
                            >
                              {isUploaded ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                              )}
                              <div className="min-w-0">
                                <p className={`font-bold ${isUploaded ? "text-emerald-900 dark:text-emerald-200" : "text-amber-900 dark:text-amber-200"}`}>
                                  {def.label}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                                  {def.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Upload Action Card */}
                {!isLocked && (
                  <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/50 p-5 dark:border-emerald-800 dark:bg-emerald-950/20">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-full sm:w-1/2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Select Document Type to Upload:
                        </label>
                        <select
                          value={selectedDocType}
                          onChange={(e) => setSelectedDocType(e.target.value)}
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-900 font-medium"
                        >
                          {ALL_DOCUMENT_DEFINITIONS.map(d => {
                            const isReq = getRequiredDocumentTypes(orgData.org_type).includes(d.id);
                            return (
                              <option key={d.id} value={d.id}>
                                {d.label} {isReq ? "(Required)" : "(Optional)"}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="w-full sm:w-1/2 pt-5 sm:pt-0">
                        <label className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition">
                          <Upload className="h-4 w-4" />
                          {uploadingDoc ? "Uploading & Checking Signatures..." : "Upload Private Document"}
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={handleFileUpload}
                            disabled={uploadingDoc || isLocked}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Uploaded Documents List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Uploaded Verification Dossier ({documents.length})
                  </h3>

                  {documents.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400 dark:border-slate-800">
                      No documents uploaded yet. Please upload required statutory documents according to your entity type checklist above.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-4 text-xs">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">
                                {doc.document_type.replace(/_/g, " ")}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {doc.file_name || "Document Attachment"} &bull; Uploaded {new Date(doc.created_at).toLocaleDateString("en-IN")}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              doc.verification_status === "VERIFIED"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : doc.verification_status === "REJECTED"
                                ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            }`}>
                              {doc.verification_status}
                            </span>

                            {!isLocked && (
                              <button
                                type="button"
                                onClick={() => handleDeleteDoc(doc.id)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
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
                    onClick={() => setActiveStep(8)}
                    className="flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-6 text-xs font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                  >
                    Continue to Final Review <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 8: Review & Sign Declaration */}
            {activeStep === 8 && (
              <motion.div
                key="step8"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold">Step 8: Comprehensive Dossier Review & Sign-off</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Carefully review all submitted organization records before formal submission for nodal officer review.
                  </p>
                </div>

                {/* Step 8 Readiness Breakdown */}
                {(() => {
                  const reqDocTypes = getRequiredDocumentTypes(orgData.org_type);
                  const uploadedDocTypes = new Set(documents.map(d => d.document_type));
                  const missingDocList = reqDocTypes.filter(t => !uploadedDocTypes.has(t));
                  const verifiedDocCount = documents.filter(d => d.verification_status === "VERIFIED").length;

                  const missingFields = [];
                  if (!orgData.company_name) missingFields.push("Legal Company Name");
                  if (!orgData.registered_address || !orgData.city || !orgData.state || !orgData.pincode) missingFields.push("Registered Address");
                  if (!authPersonData.authorized_person_name || !authPersonData.authorized_person_email) missingFields.push("Authorized Signatory");
                  if (!bizIdentityData.pan_number) missingFields.push("Business PAN");
                  if (!bankData.bank_name || !bankData.account_number || !bankData.ifsc_code) missingFields.push("Bank Details");
                  if (missingDocList.length > 0) missingFields.push(`Mandatory Documents (${missingDocList.join(", ")})`);

                  const isReady = missingFields.length === 0;

                  return (
                    <div className="space-y-4">
                      {/* Readiness Status Box */}
                      <div className={`rounded-2xl border p-4 text-xs ${
                        isReady
                          ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                          : "border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20"
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold uppercase tracking-wider text-[11px]">
                            {isReady ? "Registration Dossier Complete" : "Dossier Incomplete - Action Required"}
                          </span>
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isReady
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}>
                            {isReady ? "Ready for Submission" : `${missingFields.length} Missing Item(s)`}
                          </span>
                        </div>
                        {!isReady && (
                          <div className="mt-1 text-amber-900 dark:text-amber-300">
                            <p className="font-semibold mb-1">Please complete the following before submitting:</p>
                            <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                              {missingFields.map((f, idx) => (
                                <li key={idx}>{f}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Summary Grid */}
                      <div className="grid gap-4 sm:grid-cols-2 rounded-2xl border border-slate-200 p-5 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs">
                        <div>
                          <span className="font-bold text-slate-500">Legal Company Name:</span>
                          <p className="text-sm font-black text-slate-900 dark:text-white">{orgData.company_name || "Missing"}</p>
                        </div>
                        <div>
                          <span className="font-bold text-slate-500">Constitution Type:</span>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{orgData.org_type}</p>
                        </div>
                        <div>
                          <span className="font-bold text-slate-500">Registered Office:</span>
                          <p className="font-medium text-slate-700 dark:text-slate-300">
                            {orgData.registered_address ? `${orgData.registered_address}, ${orgData.city}, ${orgData.state} - ${orgData.pincode}` : "Missing"}
                          </p>
                        </div>
                        <div>
                          <span className="font-bold text-slate-500">Authorized Signatory:</span>
                          <p className="font-medium text-slate-700 dark:text-slate-300">
                            {authPersonData.authorized_person_name ? `${authPersonData.authorized_person_name} (${authPersonData.authorized_person_designation || "Signatory"})` : "Missing"}
                          </p>
                        </div>
                        <div>
                          <span className="font-bold text-slate-500">Business PAN:</span>
                          <p className="font-mono font-bold text-slate-900 dark:text-white">{bizIdentityData.pan_number || "Missing"}</p>
                        </div>
                        <div>
                          <span className="font-bold text-slate-500">GSTIN / CIN:</span>
                          <p className="font-mono text-slate-700 dark:text-slate-300">{bizIdentityData.gstin || bizIdentityData.cin_number || "Optional / N/A"}</p>
                        </div>
                        <div>
                          <span className="font-bold text-slate-500">Bank Account Details:</span>
                          <p className="font-mono text-slate-700 dark:text-slate-300">
                            {bankData.bank_name && bankData.account_number ? `${bankData.bank_name} • ****${bankData.account_number.slice(-4)}` : "Missing"}
                          </p>
                        </div>
                        <div>
                          <span className="font-bold text-slate-500">Statutory Documents Attached:</span>
                          <p className="font-bold text-emerald-600 dark:text-emerald-400">
                            {documents.length} attached ({verifiedDocCount} verified by Admin, {documents.length - verifiedDocCount} pending review)
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Legal Declaration Checkbox */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={declarationAccepted}
                      onChange={(e) => setDeclarationAccepted(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      <strong className="text-slate-900 dark:text-white">Legal Declaration & Authority:</strong> I hereby declare that all statutory business identity numbers, organization constitution data, banking credentials, and uploaded documents are genuine, authentic, and authorized under applicable Indian laws. I acknowledge that submitting fraudulent representations will lead to immediate disqualification and blacklisting from government sandbox tenders.
                    </div>
                  </label>
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

            {/* STEP 9: Verification Status & Feedback Dashboard */}
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
                        className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                      >
                        {vStatus === "CORRECTION_REQUESTED" ? "Update Requested Records & Resubmit" : "Edit Registration Dossier"}
                      </button>
                    </div>
                  )}

                  {vStatus === "VERIFIED" && (
                    <div className="mt-6 flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => navigate("/challenges")}
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
    </div>
  );
}