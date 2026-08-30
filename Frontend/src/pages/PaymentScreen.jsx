// PaymentScreen.jsx
// Route: /government/challenges/[id]/payments   (Payment Screen)
// Mock data used for now — replace with API data later via TanStack Query.
// Note: For the hackathon, payment tracking is simulated — no real payment gateway needed.

import StatusBadge from "../components/StatusBadge";

// ---- MOCK DATA (matches the spec's example: Deployment 20%, Initial Testing 30%, KPI Review 30%, Final Validation 20%) ----
const pilotInfo = {
  title: "Smart Queue Management System",
  startup: "QueueSense Technologies",
};

const payments = [
  { label: "Deployment", percent: 20, amount: 80000, status: "Paid" },
  { label: "Initial Testing", percent: 30, amount: 120000, status: "Paid" },
  { label: "KPI Review", percent: 30, amount: 120000, status: "Pending" },
  { label: "Final Validation", percent: 20, amount: 80000, status: "Upcoming" },
];

const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
const paidAmount = payments
  .filter((p) => p.status === "Paid")
  .reduce((sum, p) => sum + p.amount, 0);

function formatINR(amount) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function PaymentScreen() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-8">

        {/* ---- Header ---- */}
        <div className="mb-8 border-b border-slate-200 pb-6">
          <p className="text-sm text-slate-500">Milestone Payments</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{pilotInfo.title}</h1>
          <p className="mt-1 text-sm text-slate-600">{pilotInfo.startup}</p>
        </div>

        {/* ---- Summary cards ---- */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border-l-4 border-[#1E3A5F] bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Total Budget
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold text-slate-900">
              {formatINR(totalAmount)}
            </p>
          </div>
          <div className="rounded-lg border-l-4 border-emerald-500 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Paid So Far
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold text-slate-900">
              {formatINR(paidAmount)}
            </p>
          </div>
          <div className="rounded-lg border-l-4 border-amber-500 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Remaining
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold text-slate-900">
              {formatINR(totalAmount - paidAmount)}
            </p>
          </div>
        </div>

        {/* ---- Payment table ---- */}
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 font-medium text-slate-600">Milestone</th>
                <th className="px-6 py-3 font-medium text-slate-600">Share</th>
                <th className="px-6 py-3 font-medium text-slate-600">Amount</th>
                <th className="px-6 py-3 font-medium text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => (
                <tr
                  key={p.label}
                  className={i !== payments.length - 1 ? "border-b border-slate-100" : ""}
                >
                  <td className="px-6 py-4 font-medium text-slate-800">{p.label}</td>
                  <td className="px-6 py-4 text-slate-500">{p.percent}%</td>
                  <td className="px-6 py-4 font-mono text-slate-800">{formatINR(p.amount)}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td className="px-6 py-4 font-semibold text-slate-900">Total</td>
                <td className="px-6 py-4 font-semibold text-slate-900">100%</td>
                <td className="px-6 py-4 font-mono font-semibold text-slate-900">
                  {formatINR(totalAmount)}
                </td>
                <td className="px-6 py-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ---- Disclaimer (per spec: not a real payment gateway / not binding) ---- */}
        <p className="mt-6 text-xs text-slate-400">
          Payment tracking shown here is simulated for demonstration purposes. This is not a live
          payment gateway and figures are not a legally binding disbursement record.
        </p>
      </div>
    </div>
  );
}