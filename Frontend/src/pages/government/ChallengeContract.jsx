import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  Save,
  Send,
  Building2,
  CalendarDays,
  IndianRupee,
  ShieldCheck,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";

function ChallengeContract() {
  const navigate = useNavigate();
  const { challengeId } = useParams();

  const id = challengeId || "1";

  const [formData, setFormData] = useState({
    contractTitle: "",
    startupName: "GreenTech Solutions",
    contractType: "Scale-up Agreement",
    startDate: "",
    endDate: "",
    contractValue: "",
    paymentTerms: "",
    scopeOfWork: "",
    deliverables: "",
    ipOwnership: "",
    dataProtection: "",
    terminationTerms: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);

    try {
      await new Promise((resolve) =>
        setTimeout(resolve, 600)
      );

      console.log("Contract draft:", {
        challengeId: id,
        ...formData,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = () => {
    if (!formData.contractTitle.trim()) {
      alert("Contract title is required.");
      return;
    }

    if (!formData.startDate) {
      alert("Start date is required.");
      return;
    }

    if (!formData.endDate) {
      alert("End date is required.");
      return;
    }

    if (!formData.contractValue) {
      alert("Contract value is required.");
      return;
    }

    if (!formData.scopeOfWork.trim()) {
      alert("Scope of work is required.");
      return;
    }

    if (!formData.deliverables.trim()) {
      alert("Deliverables are required.");
      return;
    }

    setSubmitted(true);

    console.log("Contract submitted:", {
      challengeId: id,
      ...formData,
    });
  };

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
                `/government/challenges/${id}/decision`
              )
            }
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Decision
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <FileText className="h-3.5 w-3.5" />
                Contract
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Challenge Contract
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Define the contractual terms for the
                approved startup solution.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Decision Approved
            </div>

          </div>
        </motion.div>

        {/* SUMMARY */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

            <InfoCard
              icon={FileText}
              label="Challenge ID"
              value={id}
            />

            <InfoCard
              icon={Building2}
              label="Startup"
              value={formData.startupName}
            />

            <InfoCard
              icon={ShieldCheck}
              label="Status"
              value="Approved"
            />

            <InfoCard
              icon={FileText}
              label="Contract Type"
              value={formData.contractType}
            />

          </div>

        </section>

        {/* CONTRACT FORM */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">

          <div className="mb-7">
            <h2 className="text-lg font-semibold">
              Contract Details
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Enter the terms and conditions for the
              implementation agreement.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">

            {/* CONTRACT TITLE */}

            <FormField
              label="Contract Title"
              name="contractTitle"
              value={formData.contractTitle}
              onChange={handleChange}
              placeholder="Enter contract title"
            />

            {/* STARTUP */}

            <FormField
              label="Startup Name"
              name="startupName"
              value={formData.startupName}
              onChange={handleChange}
              placeholder="Startup name"
            />

            {/* CONTRACT TYPE */}

            <div>
              <label className="text-sm font-semibold">
                Contract Type
              </label>

              <select
                name="contractType"
                value={formData.contractType}
                onChange={handleChange}
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950"
              >
                <option value="Scale-up Agreement">
                  Scale-up Agreement
                </option>

                <option value="Implementation Contract">
                  Implementation Contract
                </option>

                <option value="Pilot Extension">
                  Pilot Extension
                </option>

                <option value="Service Agreement">
                  Service Agreement
                </option>
              </select>
            </div>

            {/* CONTRACT VALUE */}

            <FormField
              label="Contract Value"
              name="contractValue"
              type="number"
              value={formData.contractValue}
              onChange={handleChange}
              placeholder="Enter amount in INR"
            />

            {/* START DATE */}

            <FormField
              label="Start Date"
              name="startDate"
              type="date"
              value={formData.startDate}
              onChange={handleChange}
            />

            {/* END DATE */}

            <FormField
              label="End Date"
              name="endDate"
              type="date"
              value={formData.endDate}
              onChange={handleChange}
            />

          </div>

          {/* PAYMENT TERMS */}

          <TextAreaField
            label="Payment Terms"
            name="paymentTerms"
            value={formData.paymentTerms}
            onChange={handleChange}
            placeholder="Describe payment schedule, milestones and payment conditions..."
          />

          {/* SCOPE */}

          <TextAreaField
            label="Scope of Work"
            name="scopeOfWork"
            value={formData.scopeOfWork}
            onChange={handleChange}
            placeholder="Describe the work that the startup is expected to perform..."
          />

          {/* DELIVERABLES */}

          <TextAreaField
            label="Deliverables"
            name="deliverables"
            value={formData.deliverables}
            onChange={handleChange}
            placeholder="List the expected deliverables and measurable outputs..."
          />

          {/* IP */}

          <TextAreaField
            label="Intellectual Property Ownership"
            name="ipOwnership"
            value={formData.ipOwnership}
            onChange={handleChange}
            placeholder="Define ownership and licensing of intellectual property..."
          />

          {/* DATA */}

          <TextAreaField
            label="Data Protection & Compliance"
            name="dataProtection"
            value={formData.dataProtection}
            onChange={handleChange}
            placeholder="Specify data protection, privacy and cybersecurity requirements..."
          />

          {/* TERMINATION */}

          <TextAreaField
            label="Termination Terms"
            name="terminationTerms"
            value={formData.terminationTerms}
            onChange={handleChange}
            placeholder="Define termination conditions and notice requirements..."
          />

          {/* CONTRACT NOTICE */}

          <div className="mt-7 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">

            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />

            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                Compliance Review
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-600 dark:text-amber-300">
                Contract details should be reviewed by
                the appropriate procurement and legal
                authorities before execution.
              </p>
            </div>

          </div>

        </section>

        {/* SUCCESS */}

        {submitted && (
          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/10"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />

            <div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Contract submitted successfully
              </p>

              <p className="mt-1 text-xs leading-5 text-emerald-600 dark:text-emerald-400">
                The contract is now ready for the next
                procurement and approval stage.
              </p>
            </div>
          </motion.div>
        )}

        {/* ACTIONS */}

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">

          <button
            type="button"
            onClick={() =>
              navigate(
                `/government/challenges/${id}/decision`
              )
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-semibold transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">

            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:hover:bg-slate-800"
            >
              <Save className="h-4 w-4" />

              {isSaving
                ? "Saving..."
                : "Save Draft"}
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              <Send className="h-4 w-4" />
              Submit Contract
            </button>

          </div>

        </div>

      </div>
    </AppLayout>
  );
}

// =========================================================
// INFO CARD
// =========================================================

function InfoCard({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">

      <div className="flex items-center gap-3">

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>

          <p className="mt-1 truncate text-sm font-semibold">
            {value}
          </p>
        </div>

      </div>

    </div>
  );
}

// =========================================================
// INPUT FIELD
// =========================================================

function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
}) {
  return (
    <div>
      <label className="text-sm font-semibold">
        {label}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950"
      />
    </div>
  );
}

// =========================================================
// TEXT AREA
// =========================================================

function TextAreaField({
  label,
  name,
  value,
  onChange,
  placeholder,
}) {
  return (
    <div className="mt-6">
      <label className="text-sm font-semibold">
        {label}
      </label>

      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={4}
        placeholder={placeholder}
        className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950"
      />
    </div>
  );
}

export default ChallengeContract;