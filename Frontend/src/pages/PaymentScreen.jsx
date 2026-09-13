// PaymentScreen.jsx
// Route: /government/challenges/:id/payments or /pilots/:id/payments

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, ArrowLeft, RefreshCw, IndianRupee } from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import { getPilotPayments, getPilotById } from "../services/pilotService";

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

export default function PaymentScreen() {
  const { id, challengeId } = useParams();
  const pilotId = id || challengeId;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pilot, setPilot] = useState(null);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    if (pilotId) {
      loadData();
    }
  }, [pilotId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [pilotRes, paymentsRes] = await Promise.all([
        getPilotById(pilotId).catch(() => null),
        getPilotPayments(pilotId).catch(() => ({ data: { payments: [] } })),
      ]);

      if (pilotRes?.data) {
        setPilot(pilotRes.data);
      }
      const payList = paymentsRes?.data?.payments || paymentsRes?.data || [];
      setPayments(payList);
    } catch (err) {
      console.error("Failed to load payment records:", err);
      setError(err?.response?.data?.message || "Failed to load milestone payment records.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Loading escrow milestone payments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-6 text-center shadow-sm">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Payment Records Unavailable</h2>
          <p className="text-sm text-slate-500 mb-5">{error}</p>
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

  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const paidAmount = payments
    .filter((p) => p.status === "PAID" || p.status === "COMPLETED")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 border-b border-slate-200 pb-6 flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">Milestone Payment Tracking</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{pilot?.title || pilot?.challenge?.title || "Milestone Disbursements"}</h1>
            <p className="mt-1 text-sm text-slate-600">{pilot?.startup?.company_name || pilot?.startup?.name || "Startup Partner"}</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
        </div>

        {/* Summary cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border-l-4 border-[#1E3A5F] bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Total Budget
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold text-slate-900">
              {formatINR(totalAmount || pilot?.budget)}
            </p>
          </div>
          <div className="rounded-lg border-l-4 border-emerald-500 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Disbursed / Paid
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold text-slate-900">
              {formatINR(paidAmount)}
            </p>
          </div>
          <div className="rounded-lg border-l-4 border-amber-500 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Committed Balance
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold text-slate-900">
              {formatINR(Math.max(0, (totalAmount || pilot?.budget || 0) - paidAmount))}
            </p>
          </div>
        </div>

        {/* Payment table */}
        {payments.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 font-medium text-slate-600">Milestone</th>
                  <th className="px-6 py-3 font-medium text-slate-600">Amount</th>
                  <th className="px-6 py-3 font-medium text-slate-600">Reference</th>
                  <th className="px-6 py-3 font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr
                    key={p.id || i}
                    className={i !== payments.length - 1 ? "border-b border-slate-100" : ""}
                  >
                    <td className="px-6 py-4 font-medium text-slate-800">{p.milestone?.title || p.title || p.label || `Milestone ${i + 1}`}</td>
                    <td className="px-6 py-4 font-mono text-slate-800">{formatINR(p.amount)}</td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-500">{p.payment_reference || p.transaction_id || "—"}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={p.status || "UPCOMING"} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td className="px-6 py-4 font-semibold text-slate-900">Total</td>
                  <td className="px-6 py-4 font-mono font-semibold text-slate-900">
                    {formatINR(totalAmount)}
                  </td>
                  <td colSpan={2} className="px-6 py-4 text-xs text-slate-500">
                    {payments.filter(p => p.status === "PAID").length} of {payments.length} disbursed
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No milestone payment schedules registered for this pilot yet.
          </div>
        )}
      </div>
    </div>
  );
}