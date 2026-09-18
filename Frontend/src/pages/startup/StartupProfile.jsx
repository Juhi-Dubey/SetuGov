import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Globe,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  ExternalLink,
  FileCheck2,
  Layers,
  Calendar,
  Award,
  Edit3,
  Save,
  X,
  RefreshCw,
  User,
  ArrowRight,
  Check,
  FileStack,
  ChevronRight
} from "lucide-react";
import { getMyRegistration, updateStartup } from "../../services/startupService";
import { useAuth } from "../../context/AuthContext";

const TRL_DESCRIPTIONS = {
  1: "Basic principles observed and reported",
  2: "Technology concept and/or application formulated",
  3: "Analytical and experimental critical function / proof of concept",
  4: "Component and/or breadboard validation in laboratory environment",
  5: "Component and/or breadboard validation in relevant environment",
  6: "System/subsystem model or prototype demonstration in a relevant environment",
  7: "System prototype demonstration in an operational environment",
  8: "Actual system completed and qualified through test and demonstration",
  9: "Actual system proven through successful mission operations"
};

export default function StartupProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [startup, setStartup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Editable fields for profile
  const [editData, setEditData] = useState({
    description: "",
    official_website: "",
    products_services: "",
    technologies: []
  });
  const [newTechTag, setNewTechTag] = useState("");

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await getMyRegistration();
      const s = res?.data?.startup || res?.startup || res?.data;
      if (s) {
        setStartup(s);
        setEditData({
          description: s.description || "",
          official_website: s.official_website || "",
          products_services: s.products_services || "",
          technologies: Array.isArray(s.technologies)
            ? s.technologies
            : typeof s.technologies === "string" && s.technologies.trim()
            ? s.technologies.split(",").map((t) => t.trim()).filter(Boolean)
            : []
        });
      }
    } catch (err) {
      console.warn("Startup profile fetch notice:", err);
      setFeedback({
        type: "error",
        message: err?.message || "Failed to load startup profile."
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveProfile = async () => {
    if (!startup?.id) return;
    try {
      setSaving(true);
      setFeedback({ type: "", message: "" });
      const payload = {
        description: editData.description.trim(),
        official_website: editData.official_website.trim(),
        products_services: editData.products_services.trim(),
        technologies: editData.technologies
      };
      const res = await updateStartup(startup.id, payload);
      const updated = res?.data?.startup || res?.startup || res?.data;
      if (updated) {
        setStartup((prev) => ({ ...prev, ...updated }));
      } else {
        setStartup((prev) => ({ ...prev, ...payload }));
      }
      setIsEditing(false);
      setFeedback({
        type: "success",
        message: "Profile details updated successfully."
      });
    } catch (err) {
      console.error("Save profile error:", err);
      setFeedback({
        type: "error",
        message: err?.message || "Failed to update profile details."
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddTechTag = (e) => {
    e.preventDefault();
    const tag = newTechTag.trim();
    if (tag && !editData.technologies.includes(tag)) {
      setEditData((prev) => ({
        ...prev,
        technologies: [...prev.technologies, tag]
      }));
      setNewTechTag("");
    }
  };

  const handleRemoveTechTag = (tagToRemove) => {
    setEditData((prev) => ({
      ...prev,
      technologies: prev.technologies.filter((t) => t !== tagToRemove)
    }));
  };

  const formatOrgType = (type) => {
    if (!type) return "Not provided";
    return type
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Not provided";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  // Calculate Profile Completion %
  const calculateCompletion = () => {
    if (!startup) return 0;
    const checks = [
      Boolean(startup.company_name),
      Boolean(startup.org_type),
      Boolean(startup.registered_address),
      Boolean(startup.pan_number),
      Boolean(startup.description),
      Boolean(startup.domain),
      Boolean(startup.bank_details?.account_number),
      Boolean(startup.documents && startup.documents.length > 0),
      Boolean(startup.submitted_at || startup.verification_status === "SUBMITTED" || startup.verification_status === "VERIFIED"),
      Boolean(startup.authorized_person_name)
    ];
    const completedCount = checks.filter(Boolean).length;
    return Math.round((completedCount / checks.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-xs font-semibold">Loading Startup Profile...</p>
        </div>
      </div>
    );
  }

  const vStatus = (startup?.verification_status || "DRAFT").toUpperCase();
  const completionPercentage = calculateCompletion();
  const technologies = Array.isArray(startup?.technologies)
    ? startup.technologies
    : typeof startup?.technologies === "string" && startup?.technologies.trim()
    ? startup.technologies.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const locationText = [startup?.city, startup?.state, startup?.pincode]
    .filter(Boolean)
    .join(", ") || startup?.registered_address || "Not provided";

  const foundedYear = startup?.incorporation_date
    ? new Date(startup.incorporation_date).getFullYear()
    : startup?.years_experience
    ? `${new Date().getFullYear() - Number(startup.years_experience)} (Approx.)`
    : "Not provided";

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      
      {/* Feedback Alert */}
      {feedback.message && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
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

      {/* ========================================================================= */}
      {/* CARD 1: STARTUP PROFILE HERO HEADER                                       */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Startup Avatar / Logo */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-2xl font-black text-white shadow-md ring-4 ring-emerald-500/20">
              {(startup?.company_name || user?.name || "S").charAt(0).toUpperCase()}
            </div>

            {/* Entity Names and Subtext */}
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/80">
                  Startup Profile
                </span>
                <span className="text-xs text-slate-400">
                  Entity ID: {startup?.id ? startup.id.slice(0, 8) : "N/A"}
                </span>
              </div>

              <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl truncate">
                {startup?.company_name || user?.name || "Startup Name"}
              </h1>

              <div className="mt-1 flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {startup?.authorized_person_name || user?.name || "Not provided"}
                </span>
                <span>•</span>
                <span>
                  {startup?.authorized_person_designation || user?.role || "Authorized Representative"}
                </span>
                <span>•</span>
                <span>
                  {startup?.official_email || user?.email || "Not provided"}
                </span>
                <span>•</span>
                <span>
                  {formatOrgType(startup?.org_type)}
                </span>
              </div>
            </div>
          </div>

          {/* Right Action & Status Section */}
          <div className="flex flex-wrap items-center gap-3 sm:self-center">
            {/* Status Badge */}
            <div className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-bold ${
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
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              ) : vStatus === "SUBMITTED" || vStatus === "UNDER_REVIEW" ? (
                <Clock className="h-4 w-4 text-amber-600" />
              ) : (
                <FileText className="h-4 w-4 text-slate-500" />
              )}
              <span>{vStatus.replace("_", " ")}</span>
            </div>

            {/* Edit / Cancel Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsEditing(!isEditing);
                setFeedback({ type: "", message: "" });
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
            >
              {isEditing ? (
                <>
                  <X className="h-3.5 w-3.5 text-slate-500" />
                  Cancel
                </>
              ) : (
                <>
                  <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                  Edit Profile
                </>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Quick Edit Profile Panel */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-3xl border border-emerald-200 bg-emerald-50/40 p-6 dark:border-emerald-900/60 dark:bg-emerald-950/20"
          >
            <div className="flex items-center justify-between pb-4 border-b border-emerald-200/60 dark:border-emerald-900/40">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Quick Edit Profile Details</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Update presentation details visible on your startup profile card.</p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveProfile}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Changes
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Official Website</label>
                <input
                  type="url"
                  value={editData.official_website}
                  onChange={(e) => setEditData({ ...editData, official_website: e.target.value })}
                  placeholder="https://example.com"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Core Technologies</label>
                <form onSubmit={handleAddTechTag} className="mt-1 flex gap-2">
                  <input
                    type="text"
                    value={newTechTag}
                    onChange={(e) => setNewTechTag(e.target.value)}
                    placeholder="Add technology (press Enter)"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700 dark:bg-slate-700"
                  >
                    Add
                  </button>
                </form>
                {editData.technologies.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {editData.technologies.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-100/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => handleRemoveTechTag(t)}
                          className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Organization Summary / Description</label>
                <textarea
                  rows={3}
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  placeholder="Describe your startup's core mission and public sector focus..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Products & Services</label>
                <input
                  type="text"
                  value={editData.products_services}
                  onChange={(e) => setEditData({ ...editData, products_services: e.target.value })}
                  placeholder="Flagship software, SaaS platform, AI models, hardware devices..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 2-COLUMN ROW: ACCOUNT INFORMATION & VERIFICATION                          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CARD 2: ACCOUNT INFORMATION */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <User className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">ACCOUNT INFORMATION</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Primary user identity and platform credentials</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-xs text-slate-500 dark:text-slate-400">User Full Name</span>
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-0.5 sm:mt-0">
                  {user?.name || startup?.authorized_person_name || "Not provided"}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-xs text-slate-500 dark:text-slate-400">Email Address</span>
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-0.5 sm:mt-0">
                  {user?.email || startup?.official_email || "Not provided"}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-xs text-slate-500 dark:text-slate-400">System Role</span>
                <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 mt-0.5 sm:mt-0">
                  {user?.role || "STARTUP"}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-xs text-slate-500 dark:text-slate-400">Phone Number</span>
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-0.5 sm:mt-0">
                  {user?.phone || startup?.authorized_person_phone || "Not provided"}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-1.5">
                <span className="text-xs text-slate-500 dark:text-slate-400">Account Auth Status</span>
                <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold mt-0.5 sm:mt-0 ${
                  user?.is_verified
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                }`}>
                  {user?.is_verified ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" /> Email Verified
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3" /> Verification Pending
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: VERIFICATION */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">VERIFICATION & COMPLIANCE</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Institutional validation & compliance status</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-xs text-slate-500 dark:text-slate-400">Verification Status</span>
                <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-[11px] font-bold mt-0.5 sm:mt-0 ${
                  vStatus === "VERIFIED"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : vStatus === "SUBMITTED" || vStatus === "UNDER_REVIEW"
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                    : vStatus === "CORRECTION_REQUESTED"
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                    : vStatus === "REJECTED"
                    ? "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}>
                  {vStatus.replace("_", " ")}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-xs text-slate-500 dark:text-slate-400">Registration Status</span>
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-0.5 sm:mt-0">
                  {startup?.submitted_at
                    ? "Submitted for Verification"
                    : vStatus === "VERIFIED"
                    ? "Fully Verified & Active"
                    : "Draft / In Progress"}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-xs text-slate-500 dark:text-slate-400">DPIIT Recognition</span>
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-0.5 sm:mt-0">
                  {startup?.dpiit_number || "Not provided"}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-xs text-slate-500 dark:text-slate-400">Statutory Certificate No</span>
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-0.5 sm:mt-0">
                  {startup?.certificate_number || "Not provided"}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-1.5">
                <span className="text-xs text-slate-500 dark:text-slate-400">Last Profile Update</span>
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-0.5 sm:mt-0">
                  {formatDate(startup?.updated_at || startup?.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* CARD 4: ORGANIZATION INFORMATION                                          */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">ORGANIZATION INFORMATION</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Statutory entity credentials, corporate registration, and official address</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-950/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Organization Name</span>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {startup?.company_name || "Not provided"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-950/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Legal Entity</span>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatOrgType(startup?.org_type)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-950/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Organization Type</span>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {startup?.org_type || "Not provided"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-950/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Industry / Sector</span>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {startup?.domain || "Not provided"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-950/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Official Website</span>
            <div className="mt-1">
              {startup?.official_website ? (
                <a
                  href={startup.official_website.startsWith("http") ? startup.official_website : `https://${startup.official_website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[200px]">{startup.official_website}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <p className="text-sm font-semibold text-slate-500">Not provided</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-950/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Registered Location</span>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>{locationText}</span>
            </p>
          </div>

        </div>

        {/* Statutory Identifiers Strip */}
        <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/50">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Registration Details & Identifiers</span>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-[10px] text-slate-400 uppercase">Business PAN</span>
              <p className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {startup?.pan_number || "Not provided"}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase">Corporate CIN</span>
              <p className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {startup?.cin_number || "Not provided"}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase">GSTIN</span>
              <p className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {startup?.gstin || "Not provided"}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase">Incorporation Date</span>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {formatDate(startup?.incorporation_date)}
              </p>
            </div>
          </div>
          {startup?.registered_address && (
            <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Registered Office: </span>
              {startup.registered_address}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CARD 5: STARTUP INFORMATION                                               */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">STARTUP INFORMATION</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Technology profile, readiness level, and product catalog</p>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          
          {/* Executive Description */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Description</span>
            <p className="mt-1.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-950/40">
              {startup?.description || "Not provided"}
            </p>
          </div>

          {/* Technology & Domain */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-950/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Domain / Focus Area</span>
              <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-slate-100">
                {startup?.domain || "Not provided"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-950/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Founded Year / Experience</span>
              <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-slate-100">
                {foundedYear} {startup?.years_experience ? `(${startup.years_experience} yrs in business)` : ""}
              </p>
            </div>
          </div>

          {/* Products & Services */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-950/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Products & Services</span>
            <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-slate-100">
              {startup?.products_services || "Not provided"}
            </p>
          </div>

          {/* Core Technologies Badges */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Core Technologies</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {technologies.length > 0 ? (
                technologies.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300"
                  >
                    <Layers className="h-3 w-3 text-emerald-600" />
                    {t}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">Not provided</span>
              )}
            </div>
          </div>

          {/* Other Existing Startup Information: TRL and Deployments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-950/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Technology Readiness Level (TRL)</span>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-xs font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {startup?.readiness_level ?? "—"}
                </span>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {startup?.readiness_level
                    ? TRL_DESCRIPTIONS[startup.readiness_level] || `TRL ${startup.readiness_level}`
                    : "Not evaluated"}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-950/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Previous Government / Commercial Pilots</span>
              <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-slate-100">
                {startup?.previous_deployments !== undefined && startup?.previous_deployments !== null
                  ? `${startup.previous_deployments} Deployments`
                  : "0 Deployments"}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* CARD 6: PROFILE / ONBOARDING STATUS                                       */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
              <FileCheck2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">PROFILE / ONBOARDING STATUS</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Onboarding completion metrics and compliance dossier</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/startup/documents")}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
            >
              <FileStack className="h-3.5 w-3.5 text-slate-500" />
              View Documents
            </button>

            <button
              type="button"
              onClick={() => navigate("/startup/registration")}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 transition"
            >
              Continue Registration
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Progress Bar and Summary Cards */}
        <div className="mt-6 space-y-6">
          <div>
            <div className="flex items-center justify-between text-xs font-bold mb-2">
              <span className="text-slate-700 dark:text-slate-300">Profile Completion</span>
              <span className="text-emerald-600 dark:text-emerald-400">{completionPercentage}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-950/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Registration Status</span>
              <p className="mt-1 text-xs font-bold text-slate-900 dark:text-slate-100">
                {startup?.submitted_at ? "Submitted to Nodal Officer" : "Draft Lifecycle"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-950/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Documents Status</span>
              <p className="mt-1 text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-emerald-600" />
                <span>{startup?.documents?.length || 0} Documents Uploaded</span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-950/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Verification Status</span>
              <p className="mt-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                {vStatus.replace("_", " ")}
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}