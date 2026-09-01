import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Plus,
  Trash2,
  Upload,
  XCircle,
  Clock,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";

const initialEvidence = [
  {
    id: crypto.randomUUID(),
    title: "",
    type: "Pilot Report",
    description: "",
    fileName: "",
    status: "pending",
    remarks: "",
  },
];

function ChallengeEvidence() {
  const navigate = useNavigate();
  const { challengeId } = useParams();

  const id = challengeId || "1";

  const [evidence, setEvidence] =
    useState(initialEvidence);

  const [isSaving, setIsSaving] = useState(false);

  const addEvidence = () => {
    setEvidence((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        title: "",
        type: "Pilot Report",
        description: "",
        fileName: "",
        status: "pending",
        remarks: "",
      },
    ]);
  };

  const updateEvidence = (
    evidenceId,
    field,
    value
  ) => {
    setEvidence((previous) =>
      previous.map((item) =>
        item.id === evidenceId
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const removeEvidence = (evidenceId) => {
    setEvidence((previous) =>
      previous.filter(
        (item) => item.id !== evidenceId
      )
    );
  };

  const handleFileChange = (
    evidenceId,
    event
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    updateEvidence(
      evidenceId,
      "fileName",
      file.name
    );
  };

  const handleVerification = (
    evidenceId,
    status
  ) => {
    updateEvidence(
      evidenceId,
      "status",
      status
    );
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      await new Promise((resolve) =>
        setTimeout(resolve, 600)
      );

      console.log("Evidence saved:", {
        challengeId: id,
        evidence,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const verifiedCount = evidence.filter(
    (item) => item.status === "verified"
  ).length;

  const rejectedCount = evidence.filter(
    (item) => item.status === "rejected"
  ).length;

  const pendingCount = evidence.filter(
    (item) => item.status === "pending"
  ).length;

  return (
    <AppLayout role="government">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <motion.div
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.35,
          }}
          className="mb-8"
        >
          <button
            type="button"
            onClick={() =>
              navigate(
                `/government/challenges/${id}/pilot`
              )
            }
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Pilot
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <FileText className="h-3.5 w-3.5" />
                Evidence Management
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Challenge Evidence
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Upload, review and verify evidence
                collected during the pilot.
              </p>
            </div>

            <button
              type="button"
              onClick={addEvidence}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              <Plus className="h-4 w-4" />
              Add Evidence
            </button>
          </div>
        </motion.div>

        {/* SUMMARY */}

        <section className="mb-6 grid gap-4 sm:grid-cols-3">

          <EvidenceSummary
            icon={CheckCircle2}
            label="Verified"
            value={verifiedCount}
            description="Evidence approved"
            type="success"
          />

          <EvidenceSummary
            icon={Clock}
            label="Pending"
            value={pendingCount}
            description="Awaiting verification"
            type="warning"
          />

          <EvidenceSummary
            icon={XCircle}
            label="Rejected"
            value={rejectedCount}
            description="Needs correction"
            type="danger"
          />

        </section>

        {/* PILOT INFO */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Pilot
              </p>

              <h2 className="mt-1 text-lg font-semibold">
                Smart Waste Management Pilot
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                GreenTech Solutions · Challenge ID:{" "}
                {id}
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-500/10">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Pilot Status
              </p>

              <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Active
              </p>
            </div>

          </div>

        </section>

        {/* EVIDENCE LIST */}

        <section className="space-y-5">

          {evidence.map(
            (item, index) => (
              <motion.article
                key={item.id}
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.25,
                  delay: index * 0.04,
                }}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >

                {/* CARD HEADER */}

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      <FileText className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold">
                        Evidence {index + 1}
                      </p>

                      <p className="text-xs text-slate-400">
                        Pilot evidence record
                      </p>
                    </div>

                  </div>

                  {evidence.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        removeEvidence(
                          item.id
                        )
                      }
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}

                </div>

                {/* FORM */}

                <div className="mt-6 grid gap-5 md:grid-cols-2">

                  {/* TITLE */}

                  <div>
                    <label className="text-xs font-semibold">
                      Evidence Title
                    </label>

                    <input
                      type="text"
                      value={item.title}
                      onChange={(event) =>
                        updateEvidence(
                          item.id,
                          "title",
                          event.target.value
                        )
                      }
                      placeholder="e.g. Pilot Performance Report"
                      className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-600"
                    />
                  </div>

                  {/* TYPE */}

                  <div>
                    <label className="text-xs font-semibold">
                      Evidence Type
                    </label>

                    <select
                      value={item.type}
                      onChange={(event) =>
                        updateEvidence(
                          item.id,
                          "type",
                          event.target.value
                        )
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950"
                    >
                      <option>
                        Pilot Report
                      </option>

                      <option>
                        KPI Results
                      </option>

                      <option>
                        Technical Report
                      </option>

                      <option>
                        Financial Report
                      </option>

                      <option>
                        User Feedback
                      </option>

                      <option>
                        Compliance Document
                      </option>

                      <option>
                        Other
                      </option>
                    </select>
                  </div>

                  {/* DESCRIPTION */}

                  <div className="md:col-span-2">

                    <label className="text-xs font-semibold">
                      Description
                    </label>

                    <textarea
                      value={item.description}
                      onChange={(event) =>
                        updateEvidence(
                          item.id,
                          "description",
                          event.target.value
                        )
                      }
                      rows={4}
                      placeholder="Describe what this evidence demonstrates..."
                      className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-600"
                    />

                  </div>

                  {/* FILE */}

                  <div className="md:col-span-2">

                    <label className="text-xs font-semibold">
                      Evidence File
                    </label>

                    <label className="mt-2 flex min-h-[110px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center transition hover:border-slate-400 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-600">

                      <Upload className="h-6 w-6 text-slate-400" />

                      <p className="mt-2 text-sm font-semibold">
                        {item.fileName
                          ? item.fileName
                          : "Upload evidence file"}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        PDF, DOCX, XLSX or image
                      </p>

                      <input
                        type="file"
                        className="hidden"
                        onChange={(event) =>
                          handleFileChange(
                            item.id,
                            event
                          )
                        }
                      />

                    </label>

                  </div>

                </div>

                {/* VERIFICATION */}

                <div className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-800">

                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                    <div>
                      <p className="text-sm font-semibold">
                        Verification Status
                      </p>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Review the evidence and select
                        the appropriate status.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">

                      <VerificationButton
                        active={
                          item.status ===
                          "verified"
                        }
                        onClick={() =>
                          handleVerification(
                            item.id,
                            "verified"
                          )
                        }
                        icon={CheckCircle2}
                        label="Verify"
                        type="success"
                      />

                      <VerificationButton
                        active={
                          item.status ===
                          "pending"
                        }
                        onClick={() =>
                          handleVerification(
                            item.id,
                            "pending"
                          )
                        }
                        icon={Clock}
                        label="Pending"
                        type="warning"
                      />

                      <VerificationButton
                        active={
                          item.status ===
                          "rejected"
                        }
                        onClick={() =>
                          handleVerification(
                            item.id,
                            "rejected"
                          )
                        }
                        icon={XCircle}
                        label="Reject"
                        type="danger"
                      />

                    </div>

                  </div>

                  {/* REMARKS */}

                  <div className="mt-5">

                    <label className="text-xs font-semibold">
                      Verification Remarks
                    </label>

                    <textarea
                      value={item.remarks}
                      onChange={(event) =>
                        updateEvidence(
                          item.id,
                          "remarks",
                          event.target.value
                        )
                      }
                      rows={3}
                      placeholder="Add verification comments..."
                      className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-600"
                    />

                  </div>

                </div>

              </motion.article>
            )
          )}

        </section>

        {/* ACTIONS */}

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">

          <button
            type="button"
            onClick={() =>
              navigate(
                `/government/challenges/${id}/pilot`
              )
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-semibold transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Pilot
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:hover:bg-slate-800"
            >
              <FileText className="h-4 w-4" />

              {isSaving
                ? "Saving..."
                : "Save Evidence"}
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  `/government/challenges/${id}/decision`
                )
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              Continue to Decision
              <CheckCircle2 className="h-4 w-4" />
            </button>

          </div>

        </div>

      </div>
    </AppLayout>
  );
}

// =========================================================
// SUMMARY
// =========================================================

function EvidenceSummary({
  icon: Icon,
  label,
  value,
  description,
  type,
}) {
  const styles = {
    success:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",

    warning:
      "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",

    danger:
      "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

      <div className="flex items-center justify-between">

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles[type]}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <p className="text-2xl font-bold">
          {value}
        </p>

      </div>

      <p className="mt-4 text-sm font-semibold">
        {label}
      </p>

      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {description}
      </p>

    </div>
  );
}

// =========================================================
// VERIFICATION BUTTON
// =========================================================

function VerificationButton({
  active,
  onClick,
  icon: Icon,
  label,
  type,
}) {
  const styles = {
    success: active
      ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
      : "",

    warning: active
      ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
      : "",

    danger: active
      ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
      : "",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-xs font-semibold transition ${
        active
          ? styles[type]
          : "border-slate-200 text-slate-500 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

export default ChallengeEvidence;