import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Building2,
  Award,
  Briefcase,
  Mail,
  Phone,
  User,
  CalendarDays,
  BadgeCheck,
  Clock,
  UserCheck,
} from "lucide-react";
import { getEvaluatorProfile } from "../../services/evaluatorService";
import { formatEmploymentType } from "../../utils/filterUtils";
import StatCard from "../../components/common/StatCard";

/* ─── helpers ─────────────────────────────────────────────────────────── */

/**
 * Safely render a field value, returning a fallback if missing/undefined/null.
 * Prevents "undefined" appearing in the UI.
 */
const safeValue = (val, fallback = "—") =>
  val !== undefined && val !== null && val !== "" ? val : fallback;

/** Format ISO date string to a readable format. */
const formatDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return null;
  }
};

/* ─── sub-components ───────────────────────────────────────────────────── */

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-slate-500 dark:text-slate-400">
      <RefreshCw className="h-8 w-8 animate-spin text-purple-500 mb-3" />
      <p className="text-sm font-medium">Loading evaluator profile…</p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <AlertCircle className="h-10 w-10 text-red-400" />
      <p className="text-sm font-semibold text-red-600 dark:text-red-400">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}

function NotFoundState({ onBack }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <User className="h-12 w-12 text-slate-300 dark:text-slate-700" />
      <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
        Evaluator Not Found
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-xs">
        This evaluator profile does not exist or may have been removed from the
        registry.
      </p>
      <button
        onClick={onBack}
        className="back-nav mt-2"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Registry
      </button>
    </div>
  );
}

/* ─── InfoRow: renders a labelled field row ────────────────────────────── */
function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="mt-0.5 flex-shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 p-1.5">
        <Icon className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {label}
        </p>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5 break-words">
          {value}
        </p>
      </div>
    </div>
  );
}

/* ─── main page ────────────────────────────────────────────────────────── */
function GovernmentEvaluatorDetail() {
  const { evaluatorId } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loadState, setLoadState] = useState("loading"); // loading | success | notfound | error
  const [errorMsg, setErrorMsg] = useState("");

  const fetchProfile = async () => {
    if (!evaluatorId) {
      setLoadState("notfound");
      return;
    }
    try {
      setLoadState("loading");
      setErrorMsg("");
      const res = await getEvaluatorProfile(evaluatorId);
      // The API may return the profile directly or nested under data/profile
      const data =
        res?.data?.profile ||
        res?.data ||
        res?.profile ||
        res;
      if (!data || !data.id) {
        setLoadState("notfound");
      } else {
        setProfile(data);
        setLoadState("success");
      }
    } catch (err) {
      if (err?.status === 404) {
        setLoadState("notfound");
      } else {
        setErrorMsg(err?.message || "Unable to load evaluator details.");
        setLoadState("error");
      }
    }
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluatorId]);

  const handleBack = () => navigate("/government/evaluators");

  /* ── render ── */
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          aria-label="Back to Evaluator Registry"
          className="back-nav"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified Expert Directory
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
            Evaluator Profile
          </h1>
        </div>
      </div>

      {/* States */}
      {loadState === "loading" && <LoadingState />}
      {loadState === "notfound" && <NotFoundState onBack={handleBack} />}
      {loadState === "error" && (
        <ErrorState message={errorMsg} onRetry={fetchProfile} />
      )}

      {/* Profile Content */}
      {loadState === "success" && profile && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-5"
        >
          {/* ── Left: Identity Card ── */}
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {/* Avatar + name */}
              <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center text-white text-xl font-bold mb-3 shadow-md select-none">
                  {(profile.user?.name || "?")
                    .split(" ")
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()}
                </div>

                <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {safeValue(profile.user?.name)}
                </h2>

                {profile.designation && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {profile.designation}
                  </p>
                )}

                {/* Verification badge */}
                {profile.verification_status === "VERIFIED" ? (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </span>
                ) : profile.verification_status === "PENDING" ? (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    <Clock className="h-3 w-3" />
                    Pending Verification
                  </span>
                ) : profile.verification_status === "REJECTED" ? (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800">
                    <AlertCircle className="h-3 w-3" />
                    Not Verified
                  </span>
                ) : null}
              </div>

              {/* Contact & meta fields */}
              <div className="mt-3 space-y-0">
                <InfoRow
                  icon={Building2}
                  label="Organization / Institution"
                  value={safeValue(profile.organization, null)}
                />
                <InfoRow
                  icon={Mail}
                  label="Email Address"
                  value={safeValue(profile.user?.email, null)}
                />
                {profile.user?.phone && (
                  <InfoRow
                    icon={Phone}
                    label="Phone"
                    value={safeValue(profile.user.phone, null)}
                  />
                )}
                <InfoRow
                  icon={Briefcase}
                  label="Employment Type"
                  value={profile.employment_type ? formatEmploymentType(profile.employment_type) : null}
                />
                <InfoRow
                  icon={Award}
                  label="Years of Experience"
                  value={
                    profile.years_experience != null
                      ? `${profile.years_experience} year${profile.years_experience !== 1 ? "s" : ""}`
                      : null
                  }
                />
                {formatDate(profile.verified_at) && (
                  <InfoRow
                    icon={CalendarDays}
                    label="Verified On"
                    value={formatDate(profile.verified_at)}
                  />
                )}
                {profile.verifier?.name && (
                  <InfoRow
                    icon={BadgeCheck}
                    label="Verified By"
                    value={profile.verifier.name}
                  />
                )}
              </div>

              {/* Profile ID (small, for reference) */}
              <p className="mt-4 text-[10px] text-slate-300 dark:text-slate-700 font-mono break-all select-all">
                ID: {profile.id}
              </p>
            </div>
          </div>

          {/* ── Right: Bio + Expertise ── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Bio */}
            {profile.bio && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 mb-3">
                  <UserCheck className="h-4 w-4 text-purple-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Professional Profile
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {profile.bio}
                </p>
              </div>
            )}

            {/* Domain Expertise */}
            {Array.isArray(profile.domain_expertise) &&
              profile.domain_expertise.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="h-4 w-4 text-purple-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Technical Domain Expertise
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.domain_expertise.map((domain, idx) => (
                      <span
                        key={idx}
                        className="rounded-lg bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-100 dark:border-purple-900/40"
                      >
                        {domain}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {/* Summary stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {profile.years_experience != null && (
                <StatCard
                  title="Experience"
                  value={`${profile.years_experience} Yrs`}
                  description="Years of domain practice"
                  icon={Briefcase}
                  color="violet"
                  valueColor="text-violet-700 dark:text-violet-400"
                />
              )}

              {Array.isArray(profile.domain_expertise) && (
                <StatCard
                  title="Domains"
                  value={profile.domain_expertise.length}
                  description={`Empaneled domain${profile.domain_expertise.length !== 1 ? "s" : ""}`}
                  icon={Award}
                  color="blue"
                />
              )}

              {profile.verification_status && (
                <StatCard
                  title="Panel Status"
                  value={
                    profile.verification_status === "VERIFIED"
                      ? "Verified"
                      : profile.verification_status === "PENDING"
                      ? "Pending"
                      : "Rejected"
                  }
                  description="Credential verification"
                  icon={ShieldCheck}
                  color={
                    profile.verification_status === "VERIFIED"
                      ? "emerald"
                      : profile.verification_status === "PENDING"
                      ? "amber"
                      : "rose"
                  }
                  valueColor={
                    profile.verification_status === "VERIFIED"
                      ? "text-emerald-700 dark:text-emerald-400"
                      : profile.verification_status === "PENDING"
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-rose-700 dark:text-rose-400"
                  }
                />
              )}
            </div>

            {/* No bio fallback */}
            {!profile.bio && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/50 text-center">
                <p className="text-xs text-slate-400 dark:text-slate-600 italic">
                  No professional description provided by this evaluator.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default GovernmentEvaluatorDetail;
