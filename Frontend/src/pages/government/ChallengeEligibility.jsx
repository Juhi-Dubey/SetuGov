import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock3,
  Building2,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Save,
  Loader2,
  RefreshCw,
  UserCheck,
  Info
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";
import {
  getChallengeEligibility,
  saveChallengeEligibility,
} from "../../services/challengeService.js";

function ChallengeEligibility() {
  const navigate = useNavigate();
  const { id: paramId, challengeId } = useParams();
  const id = paramId || challengeId;

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [challengeData, setChallengeData] = useState(null);
  const [checks, setChecks] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [decision, setDecision] = useState("");
  const [reviewerInfo, setReviewerInfo] = useState(null);
  const [reviewedAt, setReviewedAt] = useState(null);
  const [hasExistingReview, setHasExistingReview] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [submitError, setSubmitError] = useState("");

  const loadEligibilityData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setFetchError(null);
      setSaveSuccessMsg("");
      setSubmitError("");

      const res = await getChallengeEligibility(id);
      const data = res?.data || res || {};

      setChallengeData(data);
      const rawChecks = Array.isArray(data.checks) ? data.checks : [];
      setChecks(
        rawChecks.map((c, idx) => ({
          id: c.id || `check-${idx + 1}`,
          title: c.title || c.name || `Criterion ${idx + 1}`,
          description: c.description || "",
          status: String(c.status || "PENDING").toLowerCase(),
          required: c.required !== false,
        }))
      );

      const rawDecision = String(data.decision || "").toLowerCase();
      if (
        rawDecision === "eligible" ||
        rawDecision === "clarification" ||
        rawDecision === "not_eligible"
      ) {
        setDecision(rawDecision);
      } else {
        setDecision("");
      }

      setRemarks(data.remarks || "");
      setReviewerInfo(data.reviewer || null);
      setReviewedAt(data.reviewed_at || null);
      setHasExistingReview(Boolean(data.has_review));
    } catch (err) {
      console.error("Failed to fetch challenge eligibility:", err);
      setFetchError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load eligibility data for this challenge."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadEligibilityData();
  }, [loadEligibilityData]);

  const updateCheck = (checkId, newStatus) => {
    setSaveSuccessMsg("");
    setSubmitError("");
    setChecks((prev) =>
      prev.map((c) => (c.id === checkId ? { ...c, status: newStatus } : c))
    );
  };

  const handleSave = async (redirectAfter = false) => {
    try {
      setIsSaving(true);
      setSaveSuccessMsg("");
      setSubmitError("");

      const payload = {
        checks: checks.map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          status: c.status.toUpperCase(),
          required: c.required,
        })),
        decision: decision ? decision.toUpperCase() : "PENDING",
        remarks: remarks || "",
      };

      const res = await saveChallengeEligibility(id, payload);
      const savedData = res?.data || res || {};

      setSaveSuccessMsg("Eligibility review successfully saved to PostgreSQL.");
      setHasExistingReview(true);
      if (savedData.reviewed_at) setReviewedAt(savedData.reviewed_at);
      if (savedData.reviewer) setReviewerInfo(savedData.reviewer);

      if (redirectAfter) {
        navigate(`/government/challenges/${id}/evaluation`);
      }
    } catch (err) {
      console.error("Failed to save challenge eligibility review:", err);
      setSubmitError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to save eligibility review. Your changes have been preserved in the form."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const completedChecks = checks.filter(
    (c) => c.status === "passed" || c.status === "failed"
  ).length;

  const passedChecks = checks.filter((c) => c.status === "passed").length;
  const failedChecks = checks.filter((c) => c.status === "failed").length;
  const pendingChecks = checks.length - completedChecks;
  const allCompleted = checks.length > 0 && completedChecks === checks.length;

  return (
    <AppLayout role="government">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8"
        >
          <button
            type="button"
            onClick={() => navigate(`/government/challenges/${id}/applications`)}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Applications
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Eligibility Review
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-slate-900 dark:text-white">
                Challenge Statutory & Eligibility Review
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                {challengeData?.challenge_title
                  ? `Verifying requirements for: ${challengeData.challenge_title}`
                  : "Verify whether startups satisfy statutory and technical eligibility criteria before final award."}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Challenge ID
              </p>
              <p className="mt-0.5 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                {id}
              </p>
            </div>
          </div>
        </motion.div>

        {/* FEEDBACK BANNERS */}
        {saveSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{saveSuccessMsg}</span>
            </div>
            <button
              onClick={() => setSaveSuccessMsg("")}
              className="text-xs font-medium underline text-emerald-700 hover:text-emerald-900 dark:text-emerald-400"
            >
              Dismiss
            </button>
          </motion.div>
        )}

        {submitError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <span>{submitError}</span>
            </div>
            <button
              onClick={() => setSubmitError("")}
              className="text-xs font-medium underline text-red-700 hover:text-red-900 dark:text-red-400"
            >
              Dismiss
            </button>
          </motion.div>
        )}

        {/* LOADING STATE */}
        {loading && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">
              Loading challenge eligibility records from database...
            </p>
          </div>
        )}

        {/* FETCH ERROR STATE */}
        {!loading && fetchError && (
          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center dark:border-red-900/40 dark:bg-red-950/20">
            <ShieldAlert className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-3 text-lg font-bold text-red-900 dark:text-red-300">
              Unable to Load Eligibility Review
            </h3>
            <p className="mt-2 text-sm text-red-700 dark:text-red-400 max-w-md mx-auto">
              {fetchError}
            </p>
            <button
              type="button"
              onClick={loadEligibilityData}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        )}

        {/* MAIN CONTENT WHEN LOADED */}
        {!loading && !fetchError && (
          <>
            {/* SUMMARY CARD */}
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40">
                    <Building2 className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                  </div>

                  <div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {challengeData?.challenge_title || "Statutory & Entity Eligibility Verification"}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Department: {challengeData?.department?.name || "Assigned Government Department"}
                    </p>

                    {hasExistingReview && reviewerInfo && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>
                          Reviewed by {reviewerInfo.name} ({reviewerInfo.role})
                          {reviewedAt ? ` on ${new Date(reviewedAt).toLocaleDateString()}` : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {hasExistingReview ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Review Saved in PostgreSQL
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                      <Clock3 className="h-3.5 w-3.5" />
                      Pending Initial Review
                    </span>
                  )}
                </div>
              </div>
            </motion.section>

            {/* EMPTY STATE: NO CONFIGURED REQUIREMENTS */}
            {checks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <Info className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                  No Eligibility Requirements Configured
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  This challenge does not have any eligibility requirements or required documents configured in its profile.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <Link
                    to={`/government/challenges/${id}/applications`}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Applications
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* PROGRESS METRICS */}
                <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-bold text-slate-900 dark:text-white">
                        Eligibility Verification Checklist
                      </h2>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Review and verify all statutory requirements before recording final eligibility decision.
                      </p>
                    </div>

                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {completedChecks} of {checks.length} checks reviewed
                    </div>
                  </div>

                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-300"
                      style={{
                        width: `${(completedChecks / checks.length) * 100}%`,
                      }}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium">
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      Passed: {passedChecks}
                    </span>

                    <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400">
                      <XCircle className="h-4 w-4" />
                      Failed: {failedChecks}
                    </span>

                    <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <Clock3 className="h-4 w-4" />
                      Pending: {pendingChecks}
                    </span>
                  </div>
                </section>

                {/* CHECKLIST ITEMS */}
                <div className="space-y-4">
                  {checks.map((check, index) => (
                    <motion.section
                      key={check.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: index * 0.03 }}
                      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-4">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                              check.status === "passed"
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                                : check.status === "failed"
                                ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                                : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                            }`}
                          >
                            {check.status === "passed" ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : check.status === "failed" ? (
                              <XCircle className="h-5 w-5" />
                            ) : (
                              <Clock3 className="h-5 w-5" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                {check.title}
                              </h3>
                              {check.required && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                  Required
                                </span>
                              )}
                            </div>

                            {check.description && (
                              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">
                                {check.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => updateCheck(check.id, "passed")}
                            className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold transition ${
                              check.status === "passed"
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-800 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
                            }`}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Pass
                          </button>

                          <button
                            type="button"
                            onClick={() => updateCheck(check.id, "failed")}
                            className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold transition ${
                              check.status === "failed"
                                ? "bg-red-600 text-white shadow-sm"
                                : "border border-slate-200 hover:bg-red-50 hover:text-red-700 dark:border-slate-800 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                            }`}
                          >
                            <XCircle className="h-4 w-4" />
                            Fail
                          </button>

                          {check.status !== "pending" && (
                            <button
                              type="button"
                              onClick={() => updateCheck(check.id, "pending")}
                              title="Reset to Pending"
                              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-3 text-xs text-slate-400 hover:text-slate-700 dark:border-slate-800 dark:hover:text-slate-200 transition"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.section>
                  ))}
                </div>

                {/* REMARKS SECTION */}
                <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                      <AlertCircle className="h-4 w-4 text-slate-500" />
                    </div>

                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        Reviewer Remarks & Notes
                      </h2>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Add official notes explaining the verification outcome or specific compliance observations.
                      </p>
                    </div>
                  </div>

                  <textarea
                    value={remarks}
                    onChange={(event) => {
                      setSaveSuccessMsg("");
                      setSubmitError("");
                      setRemarks(event.target.value);
                    }}
                    rows={4}
                    placeholder="Enter official reviewer remarks and compliance audit notes..."
                    className="mt-4 w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-blue-500 dark:focus:ring-blue-950 text-slate-900 dark:text-white"
                  />
                </section>

                {/* FINAL DECISION */}
                <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      Overall Eligibility Determination
                    </h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Select the final statutory determination for this challenge.
                    </p>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <DecisionButton
                      active={decision === "eligible"}
                      onClick={() => {
                        setSaveSuccessMsg("");
                        setSubmitError("");
                        setDecision("eligible");
                      }}
                      icon={CheckCircle2}
                      title="Eligible"
                      description="Statutory requirements satisfied. Proceed to technical evaluation."
                      type="success"
                    />

                    <DecisionButton
                      active={decision === "clarification"}
                      onClick={() => {
                        setSaveSuccessMsg("");
                        setSubmitError("");
                        setDecision("clarification");
                      }}
                      icon={Clock3}
                      title="Request Clarification"
                      description="Supplementary compliance clarification required."
                      type="warning"
                    />

                    <DecisionButton
                      active={decision === "not_eligible"}
                      onClick={() => {
                        setSaveSuccessMsg("");
                        setSubmitError("");
                        setDecision("not_eligible");
                      }}
                      icon={XCircle}
                      title="Not Eligible"
                      description="Fails statutory or compliance criteria."
                      type="danger"
                    />
                  </div>

                  {!allCompleted && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>
                        Note: You have {pendingChecks} pending check(s). You can save draft progress at any time, but completing all checks is recommended before finalizing.
                      </span>
                    </div>
                  )}
                </section>

                {/* ACTIONS */}
                <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => navigate(`/government/challenges/${id}/applications`)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Applications
                  </button>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => handleSave(false)}
                      disabled={isSaving}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 shadow-sm transition"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {isSaving ? "Persisting to PostgreSQL..." : "Save Review"}
                    </button>

                    <button
                      type="button"
                      disabled={isSaving || !decision}
                      onClick={() => handleSave(true)}
                      className="btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 transition"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRight className="h-4 w-4" />
                      )}
                      Save & Continue to Evaluation
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

function DecisionButton({
  active,
  onClick,
  icon: Icon,
  title,
  description,
  type,
}) {
  const activeStyles = {
    success:
      "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 dark:border-emerald-500 dark:bg-emerald-950/30",
    warning:
      "border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 dark:border-amber-500 dark:bg-amber-950/30",
    danger:
      "border-red-500 bg-red-50/70 ring-2 ring-red-500/20 dark:border-red-500 dark:bg-red-950/30",
  };

  const iconStyles = {
    success:
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
    warning:
      "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    danger:
      "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        active
          ? activeStyles[type]
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            iconStyles[type]
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {title}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}

export default ChallengeEligibility;