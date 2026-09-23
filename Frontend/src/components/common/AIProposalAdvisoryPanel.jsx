import React, { useEffect, useState } from "react";
import { Sparkles, CheckCircle2, AlertTriangle, HelpCircle, FileText, Info, Loader2 } from "lucide-react";
import { getApplicationProposalAnalysis } from "../../services/aiService";

export default function AIProposalAdvisoryPanel({ applicationId }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    if (!applicationId) return;

    setLoading(true);
    setError(null);

    getApplicationProposalAnalysis(applicationId)
      .then((res) => {
        if (!mounted) return;
        const data = res?.data || res;
        setAnalysis(data?.id || data?.executive_summary ? data : null);
      })
      .catch((err) => {
        if (!mounted) return;
        // 404 is normal when no analysis has been run yet
        if (err.status === 404 || err.code === "NOT_FOUND") {
          setAnalysis(null);
        } else {
          setError(err.message || "Failed to load AI advisory");
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [applicationId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs text-indigo-700 dark:border-indigo-900/30 dark:bg-indigo-950/20 dark:text-indigo-300">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading AI Proposal Screening Advisory...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
        <p className="font-semibold text-slate-700 dark:text-slate-300">AI Screening Advisory</p>
        <p className="mt-1 text-slate-500">{error}</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
        <Info className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
        <div>
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            No AI Proposal Analysis Available
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Awaiting independent evaluator screening. AI analysis will appear here once an assigned evaluator runs the screening workflow.
          </p>
        </div>
      </div>
    );
  }

  const strengths = Array.isArray(analysis.strengths) ? analysis.strengths : [];
  const weaknesses = Array.isArray(analysis.weaknesses) ? analysis.weaknesses : [];
  const risks = Array.isArray(analysis.risks) ? analysis.risks : [];
  const missingInfo = Array.isArray(analysis.missing_information) ? analysis.missing_information : [];
  const questions = Array.isArray(analysis.evaluator_questions)
    ? analysis.evaluator_questions
    : (Array.isArray(analysis.questions_for_evaluator) ? analysis.questions_for_evaluator : []);

  return (
    <div className="overflow-hidden rounded-2xl border border-indigo-200/80 bg-white shadow-sm dark:border-indigo-900/40 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-indigo-100 bg-indigo-50/70 px-5 py-3.5 dark:border-indigo-900/30 dark:bg-indigo-950/30">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              AI Proposal Screening Advisory
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Read-only decision support for Government Reviewers
            </p>
          </div>
        </div>
        <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
          Evaluator Verified
        </span>
      </div>

      <div className="space-y-4 p-5 text-xs">
        {/* Executive Summary */}
        {analysis.executive_summary && (
          <div>
            <h5 className="font-bold uppercase tracking-wider text-[10px] text-slate-400">
              Executive Summary
            </h5>
            <p className="mt-1 leading-relaxed text-slate-700 dark:text-slate-300">
              {analysis.executive_summary}
            </p>
          </div>
        )}

        {/* Technical Feasibility & Innovation */}
        <div className="grid gap-3 sm:grid-cols-2">
          {analysis.technical_feasibility && (
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
              <h5 className="font-bold text-[11px] text-slate-800 dark:text-slate-200">
                Technical Feasibility
              </h5>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                {analysis.technical_feasibility}
              </p>
            </div>
          )}

          {analysis.innovation && (
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
              <h5 className="font-bold text-[11px] text-slate-800 dark:text-slate-200">
                Innovation & Differentiation
              </h5>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                {analysis.innovation}
              </p>
            </div>
          )}
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid gap-3 sm:grid-cols-2">
          {strengths.length > 0 && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 dark:border-emerald-900/30 dark:bg-emerald-950/20">
              <h5 className="flex items-center gap-1.5 font-bold text-[11px] text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" /> Key Strengths
              </h5>
              <ul className="mt-2 space-y-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                {strengths.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="font-bold">•</span>
                    <span>{typeof s === "string" ? s : s?.description || JSON.stringify(s)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(weaknesses.length > 0 || risks.length > 0) && (
            <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3 dark:border-amber-900/30 dark:bg-amber-950/20">
              <h5 className="flex items-center gap-1.5 font-bold text-[11px] text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5" /> Risks & Considerations
              </h5>
              <ul className="mt-2 space-y-1 text-[11px] text-amber-700 dark:text-amber-400">
                {[...weaknesses, ...risks].slice(0, 4).map((w, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="font-bold">•</span>
                    <span>{typeof w === "string" ? w : w?.description || JSON.stringify(w)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Missing Information */}
        {missingInfo.length > 0 && (
          <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3 dark:border-rose-900/30 dark:bg-rose-950/20">
            <h5 className="font-bold text-[11px] text-rose-800 dark:text-rose-300">
              Missing or Incomplete Proposal Information
            </h5>
            <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-[11px] text-rose-700 dark:text-rose-400">
              {missingInfo.map((m, idx) => (
                <li key={idx}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Questions for Evaluation */}
        {questions.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
            <h5 className="flex items-center gap-1.5 font-bold text-[11px] text-slate-800 dark:text-slate-200">
              <HelpCircle className="h-3.5 w-3.5 text-indigo-500" /> Key Questions for Technical Inquiry
            </h5>
            <ul className="mt-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
              {questions.map((q, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="font-mono text-indigo-500 font-bold">{idx + 1}.</span>
                  <span>{typeof q === "string" ? q : q?.question || JSON.stringify(q)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
