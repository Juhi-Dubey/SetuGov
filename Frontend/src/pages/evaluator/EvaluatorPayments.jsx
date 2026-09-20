import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { getPayments } from "../../services/pilotService";

function EvaluatorPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getPayments();
      const list = res?.data?.payments || res?.data || res?.payments || [];
      setPayments(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || "Failed to load payment records.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const q = search.toLowerCase().trim();
      const ref = p.reference_number || "";
      const challenge = p.pilot?.challenge?.title || "";

      const matchSearch =
        !q ||
        ref.toLowerCase().includes(q) ||
        challenge.toLowerCase().includes(q);

      const matchStatus =
        statusFilter === "All" ||
        String(p.status || "").toUpperCase() === statusFilter.toUpperCase();

      return matchSearch && matchStatus;
    });
  }, [payments, search, statusFilter]);

  const getStatusBadge = (status) => {
    const s = String(status || "").toUpperCase();
    if (s === "PAID") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3" /> Disbursed (Paid)
        </span>
      );
    }
    if (s === "APPROVED") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
          <Clock className="h-3 w-3" /> Approved
        </span>
      );
    }
    if (s === "REJECTED") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="h-3 w-3" /> Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
        <Clock className="h-3 w-3" /> {s || "Pending"}
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* HEADER */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <CreditCard className="h-4.5 w-4.5" />
            </span>
            <p className="text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              Evaluator Financials
            </p>
          </div>

          <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Payments & Disbursements
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            View disbursement records and honorarium status from participating government departments.
          </p>
        </div>

        <button
          onClick={fetchPayments}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </section>

      {/* POLICY INFORMATION NOTICE */}
      <section className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/30 dark:bg-indigo-950/20">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
          <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <span className="font-semibold text-slate-900 dark:text-white">
              Official Compensation & Honorarium Governance:
            </span>{" "}
            Evaluator honoraria and evaluation service disbursements are administered directly by the sponsoring Government department in accordance with official procurement guidelines. Records are posted upon department treasury authorization.
          </div>
        </div>
      </section>

      {/* SEARCH & FILTERS */}
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payments by reference number or challenge..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option value="All">All status</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="PAID">Disbursed (Paid)</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </section>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-600 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* RECORDS LIST */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-950/40">
            <CreditCard className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
            No payment records available.
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            When participating government departments authorize and schedule honorarium disbursements for completed evaluation milestones, transaction records will be logged here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((payment) => (
            <div
              key={payment.id}
              className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {payment.pilot?.challenge?.title || "Evaluation Milestone"}
                  </span>
                  {getStatusBadge(payment.status)}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Ref: {payment.reference_number || "—"}</span>
                  <span>•</span>
                  <span>
                    Date:{" "}
                    {payment.payment_date
                      ? new Date(payment.payment_date).toLocaleDateString("en-IN")
                      : "Pending Disbursal"}
                  </span>
                  {payment.milestone?.name && (
                    <>
                      <span>•</span>
                      <span>Milestone: {payment.milestone.name}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-400">Disbursement</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  ₹{Number(payment.amount || 0).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default EvaluatorPayments;
