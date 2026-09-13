// PilotDashboard.jsx
// Route: /government/challenges/:id/pilot or /pilots/:id (Pilot Dashboard)

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { Loader2, AlertCircle, ArrowLeft, RefreshCw, ShieldAlert, CheckCircle2 } from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import { getPilotDashboard, getPilotById } from "../services/pilotService";

function isKpiOnTarget(kpi) {
  const actual = Number(kpi.actual || kpi.current_value || 0);
  const target = Number(kpi.target || kpi.target_value || 0);
  return kpi.lowerIsBetter ? actual <= target : actual >= target;
}

export default function PilotDashboard() {
  const { id, challengeId } = useParams();
  const pilotId = id || challengeId;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    if (pilotId) {
      loadData();
    }
  }, [pilotId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getPilotDashboard(pilotId);
      setDashboardData(res?.data || res);
    } catch (err) {
      console.error("Failed to load pilot dashboard:", err);
      // Try fallback to getPilotById
      try {
        const pilotRes = await getPilotById(pilotId);
        setDashboardData(pilotRes?.data || pilotRes);
      } catch (innerErr) {
        setError(err?.response?.data?.message || "Failed to load pilot telemetry data.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Loading pilot sandbox telemetry...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-6 text-center shadow-sm">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Telemetry Unavailable</h2>
          <p className="text-sm text-slate-500 mb-5">{error || "No active pilot sandbox record found."}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" /> Go Back
            </button>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pilot = dashboardData.pilot || dashboardData;
  const kpis = dashboardData.kpis || pilot.kpis || [];
  const milestones = dashboardData.milestones || pilot.milestones || [];
  const risks = dashboardData.risks || pilot.risks || [];
  const openIssues = dashboardData.issues || pilot.issues || [];

  const progressPercent = Number(pilot.progress_pct || pilot.progress || 0);

  const kpisChartData = kpis.map((k) => ({
    label: k.name || k.label || "Metric",
    baseline: Number(k.baseline_value || k.baseline || 0),
    target: Number(k.target_value || k.target || 0),
    actual: Number(k.current_value || k.actual || 0),
    unit: k.unit || "",
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <p className="text-sm text-slate-500">Pilot Sandbox Monitoring</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{pilot.title || pilot.challenge?.title || "Pilot Sandbox"}</h1>
            <p className="mt-1 text-sm text-slate-600">{pilot.startup?.company_name || pilot.startup?.name || "Startup Partner"}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={pilot.status || "IN_PROGRESS"} />
            <p className="text-sm text-slate-500">
              Duration: <span className="font-medium text-slate-800">{pilot.duration_days || 60} days</span>
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">Sandbox Progress</span>
            <span className="text-slate-500">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-[#0F766E] transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* KPI Cards */}
        {kpis.length > 0 ? (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi, idx) => {
              const actual = Number(kpi.current_value ?? kpi.actual ?? 0);
              const target = Number(kpi.target_value ?? kpi.target ?? 0);
              const baseline = Number(kpi.baseline_value ?? kpi.baseline ?? 0);
              const onTarget = isKpiOnTarget({ ...kpi, actual, target });

              return (
                <div
                  key={kpi.id || idx}
                  className={`rounded-lg border-l-4 bg-white p-4 shadow-sm ${
                    onTarget ? "border-emerald-500" : "border-amber-500"
                  }`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {kpi.name || kpi.label || `KPI #${idx + 1}`}
                  </p>
                  <p className="mt-2 font-mono text-2xl font-semibold text-slate-900">
                    {actual}
                    <span className="ml-1 text-sm font-normal text-slate-400">{kpi.unit || ""}</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Target: {target}{kpi.unit} &nbsp;·&nbsp; Baseline: {baseline}{kpi.unit}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mb-8 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            No empirical KPIs registered for this pilot yet.
          </div>
        )}

        {/* KPI Chart: Baseline vs Target vs Actual */}
        {kpisChartData.length > 0 && (
          <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              KPI Performance — Baseline vs Target vs Actual
            </h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kpisChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748B" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748B" }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Bar dataKey="baseline" name="Baseline" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="target" name="Target" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name="Actual" fill="#0F766E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Milestone Timeline */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="mb-4 text-base font-semibold text-slate-900">Milestone Timeline</h2>
            {milestones.length > 0 ? (
              <ul className="space-y-4">
                {milestones.map((m, i) => (
                  <li key={m.id || m.title || i} className="flex items-center gap-4">
                    <div className="flex flex-col items-center">
                      <span
                        className={`h-3 w-3 rounded-full ${
                          m.status === "COMPLETED" || m.status === "PAID"
                            ? "bg-emerald-600"
                            : m.status === "IN_PROGRESS" || m.status === "PENDING"
                            ? "bg-amber-500"
                            : "bg-slate-300"
                        }`}
                      />
                      {i < milestones.length - 1 && (
                        <span className="mt-1 h-8 w-px bg-slate-200" />
                      )}
                    </div>
                    <div className="flex flex-1 items-center justify-between pb-4">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{m.title || m.label || `Milestone ${i + 1}`}</p>
                        <p className="text-xs text-slate-500">{m.due_date ? new Date(m.due_date).toLocaleDateString("en-IN") : m.date || "Scheduled"}</p>
                      </div>
                      <StatusBadge status={m.status || "PLANNED"} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">No scheduled milestones recorded.</p>
            )}
          </div>

          {/* Risk Panel + Open Issues */}
          <div className="flex flex-col gap-6">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-slate-900">Risk Assessment</h2>
              {risks.length > 0 ? (
                <ul className="space-y-3">
                  {risks.map((r, idx) => (
                    <li key={r.id || idx} className="flex items-start justify-between gap-3 text-sm">
                      <span className="text-slate-700">{r.description || r.label || r.title}</span>
                      <span
                        className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                          r.severity === "HIGH" || r.level === "High"
                            ? "bg-red-50 text-red-700"
                            : r.severity === "MEDIUM" || r.level === "Medium"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {r.severity || r.level || "Low"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">No active operational risks identified.</p>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-slate-900">Open Issues</h2>
              {openIssues.length > 0 ? (
                <ul className="space-y-3">
                  {openIssues.map((issue, idx) => (
                    <li key={issue.id || idx} className="flex items-start justify-between gap-3 text-sm">
                      <span className="text-slate-700">{issue.title || issue.label || issue.description}</span>
                      <span
                        className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                          issue.priority === "HIGH" || issue.priority === "High"
                            ? "bg-red-50 text-red-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {issue.priority || "Normal"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">No open blocker tickets.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}