import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserCheck,
  ClipboardCheck,
  FileText,
  Clock,
  CheckCircle2,
  Building,
  GraduationCap,
  ShieldCheck,
  AlertCircle,
  X,
  Edit3,
  Save,
  Briefcase,
  Mail,
  Phone,
  Calendar,
  Layers,
  Award,
  RefreshCw,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import {
  getMyAssignments,
  getEvaluatorProfile,
  updateEvaluatorProfile,
} from "../../services/evaluatorService";

export default function EvaluatorMyPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Edit form state
  const [formData, setFormData] = useState({
    organization: "",
    designation: "",
    employment_type: "EMPLOYED",
    domain_expertise: "",
    years_experience: 0,
    bio: "",
  });

  useEffect(() => {
    loadProfileAndAssignments();
  }, [user?.id]);

  const loadProfileAndAssignments = async () => {
    try {
      setLoading(true);
      setError("");

      const [profRes, assignRes] = await Promise.all([
        user?.id ? getEvaluatorProfile(user.id).catch(() => null) : null,
        getMyAssignments().catch(() => ({ data: [] })),
      ]);

      const profData = profRes?.data || profRes || user?.evaluator_profile || null;
      setProfile(profData);

      if (profData) {
        setFormData({
          organization: profData.organization || "",
          designation: profData.designation || "",
          employment_type: profData.employment_type || "EMPLOYED",
          domain_expertise: Array.isArray(profData.domain_expertise)
            ? profData.domain_expertise.join(", ")
            : profData.domain_expertise || "",
          years_experience: profData.years_experience || 0,
          bio: profData.bio || "",
        });
      }

      const list = assignRes?.data?.assignments || assignRes?.data || assignRes || [];
      setAssignments(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn("Failed to load profile details:", err);
      setError("Failed to load profile details.");
    } finally {
      setLoading(false);
    }
  };

  // Profile Completeness Score
  const completeness = useMemo(() => {
    let filled = 0;
    let total = 7;

    if (user?.name) filled++;
    if (user?.email) filled++;
    if (profile?.organization) filled++;
    if (profile?.designation) filled++;
    if (profile?.domain_expertise && profile.domain_expertise.length > 0) filled++;
    if (profile?.years_experience != null && profile.years_experience > 0) filled++;
    if (profile?.bio) filled++;

    return Math.round((filled / total) * 100);
  }, [user, profile]);

  const domainList = useMemo(() => {
    if (!profile?.domain_expertise) return [];
    if (Array.isArray(profile.domain_expertise)) return profile.domain_expertise;
    if (typeof profile.domain_expertise === "string") {
      return profile.domain_expertise.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [];
  }, [profile]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const payload = {
        organization: formData.organization.trim(),
        designation: formData.designation.trim(),
        employment_type: formData.employment_type,
        domain_expertise: formData.domain_expertise
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        years_experience: parseInt(formData.years_experience, 10) || 0,
        bio: formData.bio.trim(),
      };

      const res = await updateEvaluatorProfile(payload);
      const updated = res?.data || res;
      setProfile(updated);
      setSuccessMessage("Evaluator profile updated successfully.");
      setIsEditing(false);
      if (refreshUser) refreshUser();
    } catch (err) {
      setError(err.message || "Failed to update evaluator profile.");
    } finally {
      setSaving(false);
    }
  };

  const verificationStatus = profile?.verification_status || (user?.is_verified ? "VERIFIED" : "PENDING");

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <UserCheck className="h-4.5 w-4.5" />
            </span>
            <p className="text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              Evaluator Profile & Credentials
            </p>
          </div>

          <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Account Settings
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Official evaluator credentials, domain expertise, institutional affiliation, and panel verification status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit Profile
          </button>
          <button
            type="button"
            onClick={loadProfileAndAssignments}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </section>

      {/* NOTIFICATIONS */}
      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-600 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* TOP PROFILE CARD WITH COMPLETENESS */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white shadow-md">
              {user?.name ? user.name.charAt(0).toUpperCase() : "E"}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {user?.name || "Evaluator"}
                </h2>

                {verificationStatus === "VERIFIED" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <ShieldCheck className="h-3.5 w-3.5" /> Empaneled & Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    <Clock className="h-3.5 w-3.5" /> Verification Pending
                  </span>
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {user?.email || "No email"}
                </span>
                {user?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {user.phone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                  Role: EVALUATOR
                </span>
              </div>
            </div>
          </div>

          {/* Profile Completeness Gauge */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40 lg:w-72">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Profile Completeness
              </span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {completeness}%
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                style={{ width: `${completeness}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-slate-400">
              {completeness === 100
                ? "Full evaluation credentials recorded."
                : "Complete all profile fields to speed up verification."}
            </p>
          </div>
        </div>
      </section>

      {/* DETAILS GRID */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* INSTITUTIONAL & PROFESSIONAL INFO */}
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Professional Information
          </h3>

          <div className="space-y-3">
            <div className="rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-900">
              <span className="text-[10px] uppercase font-bold text-slate-400">Organization</span>
              <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-white">
                {profile?.organization || "Not specified"}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-900">
              <span className="text-[10px] uppercase font-bold text-slate-400">Designation / Role</span>
              <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-white">
                {profile?.designation || user?.designation || "Not specified"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-900">
                <span className="text-[10px] uppercase font-bold text-slate-400">Employment Type</span>
                <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-white">
                  {profile?.employment_type || "Not specified"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-900">
                <span className="text-[10px] uppercase font-bold text-slate-400">Experience</span>
                <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-white">
                  {profile?.years_experience != null ? `${profile.years_experience} Years` : "Not specified"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-900">
              <span className="text-[10px] uppercase font-bold text-slate-400">Professional Bio</span>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {profile?.bio || "No professional biography recorded yet."}
              </p>
            </div>
          </div>
        </section>

        {/* DOMAIN EXPERTISE & GOVERNANCE */}
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Domain Expertise & Governance
          </h3>

          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Empaneled Domains & Technologies
            </span>
            {domainList.length > 0 ? (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {domainList.map((dom, idx) => (
                  <span
                    key={idx}
                    className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                  >
                    {dom}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-400">
                No specific domain expertise listed yet. Click "Edit Profile" to add domains.
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Evaluation Track Record
            </span>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200/60 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {assignments.length}
                </p>
                <p className="text-[10px] text-slate-400">Total Assigned Proposals</p>
              </div>
              <div className="rounded-xl border border-slate-200/60 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {assignments.filter((a) => a.status === "COMPLETED" || a.is_evaluated).length}
                </p>
                <p className="text-[10px] text-slate-400">Completed Evaluations</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/30">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
              <ShieldCheck className="h-4 w-4 text-indigo-500" />
              <span>Independent Evaluator Charter</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              Evaluator assessments are advisory inputs submitted independently to Government department nodal selection committees. All scorecards and conflict certifications are logged in the audit ledger.
            </p>
          </div>
        </section>
      </div>

      {/* EDIT PROFILE MODAL */}
      <AnimatePresence>
        {isEditing && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            onClick={() => setIsEditing(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:p-8"
            >
              <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Edit Evaluator Profile
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Update your professional information and domain expertise.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Organization / Academic Institution
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.organization}
                    onChange={(e) =>
                      setFormData({ ...formData, organization: e.target.value })
                    }
                    placeholder="e.g. National Institute of Technology, AIIMS, Independent"
                    className="mt-1.5 h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Designation
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.designation}
                      onChange={(e) =>
                        setFormData({ ...formData, designation: e.target.value })
                      }
                      placeholder="e.g. Senior Professor, Domain Expert"
                      className="mt-1.5 h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={formData.years_experience}
                      onChange={(e) =>
                        setFormData({ ...formData, years_experience: e.target.value })
                      }
                      className="mt-1.5 h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Domain Expertise (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.domain_expertise}
                    onChange={(e) =>
                      setFormData({ ...formData, domain_expertise: e.target.value })
                    }
                    placeholder="e.g. AI & ML, Healthcare, Cyber Security, Agritech"
                    className="mt-1.5 h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Professional Biography
                  </label>
                  <textarea
                    rows={3}
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData({ ...formData, bio: e.target.value })
                    }
                    placeholder="Brief overview of research, projects, or technical consulting background..."
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {saving ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
