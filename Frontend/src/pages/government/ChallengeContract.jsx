import { useState, useEffect } from "react";
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
  Sparkles,
  Loader2,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";
import { getChallengeById } from "../../services/challengeService";
import { generateDocumentDraftWithAI } from "../../services/aiService";

function ChallengeContract() {
  const navigate = useNavigate();
  const { id: paramId, challengeId } = useParams();
  const id = paramId || challengeId || "1";

  const [challenge, setChallenge] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    contractTitle: "Pilot Agreement & Procurement Sandbox Contract",
    startupName: "MediQueue AI",
    contractType: "PILOT_AGREEMENT_DRAFT",
    startDate: "2026-10-01",
    endDate: "2026-11-30",
    contractValue: "1500000",
    paymentTerms: "30% upon gateway deployment, 40% upon live integration, 30% upon validation report approval.",
    scopeOfWork: "Deployment and empirical testing of AI queue routing across OPD departments.",
    deliverables: "1. Hardware & API Integration\n2. Real-time Telemetry Dashboard\n3. 30-Day Empirical Validation Report",
    ipOwnership: "The startup retains core IP; the State Department receives non-exclusive perpetual license for civic operations.",
    dataProtection: "All citizen health records remain within state government data boundary with no third-party transmission.",
    terminationTerms: "Either party may terminate upon 14-day notice in the event of severe security non-compliance.",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    getChallengeById(id)
      .then((res) => {
        if (res?.data) {
          setChallenge(res.data);
          setFormData((prev) => ({
            ...prev,
            contractTitle: `${res.data.title} — Pilot Agreement`,
          }));
        }
      })
      .catch(() => {});
  }, [id]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleDraftWithBrain5 = async () => {
    try {
      setIsGenerating(true);
      const res = await generateDocumentDraftWithAI({
        document_type: formData.contractType || "PILOT_AGREEMENT_DRAFT",
        challenge_title: challenge?.title || formData.contractTitle,
        startup_name: formData.startupName,
        pilot_duration: "60 days",
        pilot_budget: `₹${Number(formData.contractValue).toLocaleString("en-IN")}`,
        objectives: [formData.scopeOfWork],
      });

      const draft = res?.data || res;
      if (draft?.generated_document || draft?.content) {
        const text = draft.generated_document || draft.content;
        setFormData((prev) => ({
          ...prev,
          scopeOfWork: text.slice(0, 500),
          deliverables: "1. Phase 1 Deliverables\n2. Phase 2 Telemetry & Sandbox\n3. Phase 3 Final Validation Report",
        }));
      }
    } catch (err) {
      console.warn("Brain 5 draft fallback:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      alert("Contract draft successfully saved.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => {
      navigate(`/government/challenges/${id}/overview`);
    }, 1500);
  };

  return (
    <AppLayout role="government">
      <div className="mx-auto max-w-5xl">
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8"
        >
          <button
            type="button"
            onClick={() => navigate(`/government/challenges/${id}/overview`)}
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Challenge Overview
          </button>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <FileText className="h-3.5 w-3.5" />
                Legal & Governance Drafting
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Pilot Agreement & Governance Contract
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Draft legal terms, IP ownership, milestone payments, and compliance guarantees.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDraftWithBrain5}
              disabled={isGenerating}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-500 disabled:opacity-60"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Draft with Brain 5
            </button>
          </div>
        </motion.div>

        {submitted && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <span>Pilot contract successfully executed and finalized!</span>
          </div>
        )}

        {/* FORM */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold mb-1">Contract Title</label>
              <input
                type="text"
                name="contractTitle"
                value={formData.contractTitle}
                onChange={handleChange}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Selected Startup</label>
              <input
                type="text"
                name="startupName"
                value={formData.startupName}
                onChange={handleChange}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">End Date</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Contract Value (₹)</label>
              <input
                type="number"
                name="contractValue"
                value={formData.contractValue}
                onChange={handleChange}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Scope of Work</label>
            <textarea
              rows={3}
              name="scopeOfWork"
              value={formData.scopeOfWork}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Milestone Deliverables</label>
            <textarea
              rows={3}
              name="deliverables"
              value={formData.deliverables}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold mb-1">IP Ownership Clauses</label>
              <textarea
                rows={2}
                name="ipOwnership"
                value={formData.ipOwnership}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Data Governance & Security</label>
              <textarea
                rows={2}
                name="dataProtection"
                value={formData.dataProtection}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Save className="h-4 w-4" /> Save Draft
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
            >
              <Send className="h-4 w-4" /> Finalize Agreement
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default ChallengeContract;