// PilotDashboard.jsx
// Route: /government/challenges/[id]/pilot   (S09 — Pilot Dashboard)
// Mock data used for now — replace with API data later via TanStack Query.

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import StatusBadge from "../components/StatusBadge";

// ---- MOCK DATA (based on the hospital pilot example from the spec) ----
const pilot = {
  title: "Smart Queue Management System",
  startup: "QueueSense Technologies",
  status: "On Track",
  dayCurrent: 38,
  dayTotal: 60,
  progressPercent: 63,
};

const kpis = [
  { label: "Waiting Time", unit: "min", baseline: 90, target: 60, actual: 54, lowerIsBetter: true },
  { label: "Throughput", unit: "/day", baseline: 100, target: 130, actual: 137, lowerIsBetter: false },
  { label: "Processing Time", unit: "min", baseline: 15, target: 10, actual: 11, lowerIsBetter: true },
  { label: "Satisfaction", unit: "%", baseline: 65, target: 80, actual: 76, lowerIsBetter: false },
];

const milestones = [
  { label: "Deployment", date: "Day 1", status: "Paid" },
  { label: "Initial Testing", date: "Day 15", status: "Paid" },
  { label: "KPI Review", date: "Day 40", status: "Pending" },
  { label: "Final Validation", date: "Day 60", status: "Upcoming" },
];

const risks = [
  { label: "Data integration delay with hospital EHR", level: "Medium" },
  { label: "Staff training completion", level: "Low" },
];

const openIssues = [
  { id: "ISS-01", label: "Dashboard sync lag during peak hours", priority: "High" },
  { id: "ISS-02", label: "Minor UI glitch in mobile check-in flow", priority: "Low" },
];

// Helper: does this KPI meet its target?
function isKpiOnTarget(kpi) {
  return kpi.lowerIsBetter ? kpi.actual <= kpi.target : kpi.actual >= kpi.target;
}

export default function PilotDashboard() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-8">

        {/* ---- Header ---- */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <p className="text-sm text-slate-500">Pilot Monitoring</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{pilot.title}</h1>
            <p className="mt-1 text-sm text-slate-600">{pilot.startup}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={pilot.status} />
            <p className="text-sm text-slate-500">
              Day <span className="font-medium text-slate-800">{pilot.dayCurrent}</span> / {pilot.dayTotal}
            </p>
          </div>
        </div>

        {/* ---- Progress bar ---- */}
        <div className="mb-8">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">Pilot Progress</span>
            <span className="text-slate-500">{pilot.progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-[#0F766E] transition-all"
              style={{ width: `${pilot.progressPercent}%` }}
            />
          </div>
        </div>

        {/* ---- KPI Cards ---- */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => {
            const onTarget = isKpiOnTarget(kpi);
            return (
              <div
                key={kpi.label}
                className={`rounded-lg border-l-4 bg-white p-4 shadow-sm ${
                  onTarget ? "border-emerald-500" : "border-amber-500"
                }`}
              >
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {kpi.label}
                </p>
                <p className="mt-2 font-mono text-2xl font-semibold text-slate-900">
                  {kpi.actual}
                  <span className="ml-1 text-sm font-normal text-slate-400">{kpi.unit}</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Target: {kpi.target}{kpi.unit} &nbsp;·&nbsp; Baseline: {kpi.baseline}{kpi.unit}
                </p>
              </div>
            );
          })}
        </div>

        {/* ---- KPI Chart: Baseline vs Target vs Actual ---- */}
        <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            KPI Performance — Baseline vs Target vs Actual
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kpis} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* ---- Milestone Timeline ---- */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="mb-4 text-base font-semibold text-slate-900">Milestone Timeline</h2>
            <ul className="space-y-4">
              {milestones.map((m, i) => (
                <li key={m.label} className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={`h-3 w-3 rounded-full ${
                        m.status === "Paid"
                          ? "bg-emerald-600"
                          : m.status === "Pending"
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
                      <p className="text-sm font-medium text-slate-800">{m.label}</p>
                      <p className="text-xs text-slate-500">{m.date}</p>
                    </div>
                    <StatusBadge status={m.status} />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* ---- Risk Panel + Open Issues ---- */}
          <div className="flex flex-col gap-6">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-slate-900">Risk Panel</h2>
              <ul className="space-y-3">
                {risks.map((r) => (
                  <li key={r.label} className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-slate-700">{r.label}</span>
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                        r.level === "Medium"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {r.level}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-slate-900">Open Issues</h2>
              <ul className="space-y-3">
                {openIssues.map((issue) => (
                  <li key={issue.id} className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-slate-700">{issue.label}</span>
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                        issue.priority === "High"
                          ? "bg-red-50 text-red-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {issue.priority}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}