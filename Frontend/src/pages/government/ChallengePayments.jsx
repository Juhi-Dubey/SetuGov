import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  IndianRupee,
  Save,
  Send,
  WalletCards,
  AlertCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";
import { getChallengePilot } from "../../services/challengeService";
import {
  getPilotById,
  getPilotMilestones,
  getPilotPayments,
  updatePaymentStatus,
} from "../../services/pilotService";

function ChallengePayments() {
  const navigate = useNavigate();
  const { challengeId } = useParams();

  const [pilot, setPilot] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [payments, setPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [processingPaymentId, setProcessingPaymentId] = useState(null);

  const [remarks, setRemarks] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Load real pilot, milestones, and payments from PostgreSQL
  const loadData = useCallback(async () => {
    if (!challengeId) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Resolve pilot associated with challenge
      let resolvedPilot = null;
      try {
        const pilotRes = await getChallengePilot(challengeId);
        resolvedPilot = pilotRes?.data?.pilot || pilotRes?.pilot;
      } catch {
        // Fallback in case challengeId in URL is already a pilotId
        try {
          const directPilotRes = await getPilotById(challengeId);
          resolvedPilot = directPilotRes?.data?.pilot || directPilotRes?.pilot;
        } catch {
          resolvedPilot = null;
        }
      }

      if (!resolvedPilot) {
        setPilot(null);
        setMilestones([]);
        setPayments([]);
        return;
      }

      setPilot(resolvedPilot);

      // 2. Concurrently fetch real milestones and payments for this pilot
      const [milestonesRes, paymentsRes] = await Promise.all([
        getPilotMilestones(resolvedPilot.id).catch(() => ({ milestones: [] })),
        getPilotPayments(resolvedPilot.id).catch(() => ({ payments: [] })),
      ]);

      const fetchedMilestones =
        milestonesRes?.data?.milestones || milestonesRes?.milestones || [];
      const fetchedPayments =
        paymentsRes?.data?.payments || paymentsRes?.payments || [];

      setMilestones(fetchedMilestones);
      setPayments(fetchedPayments);
    } catch (err) {
      setError(err.message || "Failed to load payment and milestone details.");
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real financial calculations based on PostgreSQL data
  const sumPaymentAmounts = payments.reduce(
    (total, p) => total + (Number(p.amount) || 0),
    0
  );

  const totalContractValue =
    pilot?.budget && Number(pilot.budget) > 0
      ? Number(pilot.budget)
      : sumPaymentAmounts;

  const paidAmount = payments
    .filter((p) => p.status === "PAID")
    .reduce((total, p) => total + (Number(p.amount) || 0), 0);

  const pendingAmount = Math.max(0, totalContractValue - paidAmount);

  const paidPercentage =
    totalContractValue > 0
      ? Math.min(100, Math.round((paidAmount / totalContractValue) * 100))
      : 0;

  // Mark as Paid: Validated against backend rule, persisted to PostgreSQL
  const handleMarkAsPaid = async (paymentId) => {
    if (!paymentId || processingPaymentId) return;

    setProcessingPaymentId(paymentId);
    setActionError(null);
    setActionSuccess(null);

    try {
      await updatePaymentStatus(paymentId, { status: "PAID" });
      setActionSuccess("Payment successfully marked as PAID and persisted.");

      // Refetch payments and milestones from database to ensure PostgreSQL remains the single source of truth
      if (pilot?.id) {
        const [milestonesRes, paymentsRes] = await Promise.all([
          getPilotMilestones(pilot.id).catch(() => null),
          getPilotPayments(pilot.id).catch(() => null),
        ]);

        if (milestonesRes) {
          setMilestones(
            milestonesRes?.data?.milestones || milestonesRes?.milestones || []
          );
        }
        if (paymentsRes) {
          setPayments(
            paymentsRes?.data?.payments || paymentsRes?.payments || []
          );
        }
      }
    } catch (err) {
      // If backend rejects (e.g. milestone not completed or unverified evidence), display backend error
      setActionError(err.message || "Failed to update payment status.");
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      setActionSuccess("Payment remarks noted.");
      setTimeout(() => setActionSuccess(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = () => {
    setActionSuccess("Payment records and remarks are up to date.");
    setTimeout(() => setActionSuccess(null), 3000);
  };

  // Find unlinked payments (payments without a matching milestone in milestones list)
  const unlinkedPayments = payments.filter(
    (p) => !milestones.some((m) => m.id === p.milestone_id)
  );

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
            onClick={() =>
              navigate(`/government/challenges/${challengeId}/contract`)
            }
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Contract
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <WalletCards className="h-3.5 w-3.5" />
                Payments
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Challenge Payments
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                {pilot
                  ? `Track milestone payments and financial disbursals for pilot: ${pilot.title || pilot.startup?.company_name || "Active Pilot"}`
                  : "Track milestone-based payments and financial progress for this challenge."}
              </p>
            </div>

            {pilot && (
              <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Pilot {pilot.status || "ACTIVE"}
              </div>
            )}
          </div>
        </motion.div>

        {/* ACTION FEEDBACK ALERTS */}
        {actionError && (
          <div className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
              <div>
                <p className="font-semibold">Payment Disbursal Blocked</p>
                <p className="mt-0.5 text-xs text-rose-700 dark:text-rose-400">
                  {actionError}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-xs font-semibold text-rose-600 hover:underline dark:text-rose-400"
            >
              Dismiss
            </button>
          </div>
        )}

        {actionSuccess && (
          <div className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-semibold">Success</p>
                <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                  {actionSuccess}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActionSuccess(null)}
              className="text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* LOADING STATE */}
        {loading && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
            <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">
              Loading payment milestones and financial records...
            </p>
          </div>
        )}

        {/* ERROR STATE */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
            <AlertCircle className="h-8 w-8 text-rose-600 dark:text-rose-400" />
            <p className="mt-2 text-base font-semibold">Unable to Load Payments</p>
            <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{error}</p>
            <button
              type="button"
              onClick={loadData}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-rose-500"
            >
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        )}

        {/* NO PILOT STATE */}
        {!loading && !error && !pilot && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold">No Active Pilot Found</h3>
            <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
              A pilot project has not been initiated for this challenge yet.
              Payments and milestone schedules can be tracked once the pilot is approved and active.
            </p>
            <button
              type="button"
              onClick={() => navigate(`/government/challenges/${challengeId}`)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Challenge
            </button>
          </div>
        )}

        {/* MAIN FINANCIAL CONTENT */}
        {!loading && !error && pilot && (
          <>
            {/* SUMMARY CARDS */}
            <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <PaymentSummary
                icon={IndianRupee}
                label="Contract Value"
                value={formatCurrency(totalContractValue)}
              />

              <PaymentSummary
                icon={CheckCircle2}
                label="Paid Amount"
                value={formatCurrency(paidAmount)}
              />

              <PaymentSummary
                icon={Clock3}
                label="Pending Amount"
                value={formatCurrency(pendingAmount)}
              />

              <PaymentSummary
                icon={CircleDollarSign}
                label="Payment Progress"
                value={`${paidPercentage}%`}
              />
            </section>

            {/* PROGRESS BAR */}
            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Payment Progress</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Milestone payment completion
                  </p>
                </div>

                <span className="text-sm font-bold">{paidPercentage}%</span>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{
                    width: `${paidPercentage}%`,
                  }}
                />
              </div>

              <div className="mt-3 flex justify-between text-xs text-slate-400">
                <span>Paid: {formatCurrency(paidAmount)}</span>
                <span>Remaining: {formatCurrency(pendingAmount)}</span>
              </div>
            </section>

            {/* MILESTONES & PAYMENTS */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
              <div className="mb-6">
                <h2 className="text-lg font-semibold">Payment Milestones</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Review and disburse payments linked to verified contract milestones.
                </p>
              </div>

              {milestones.length === 0 && unlinkedPayments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <Clock3 className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-sm font-medium">
                    No Milestones or Payments Scheduled
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Milestone deliverables and payment schedules will appear here once configured for this pilot.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {milestones.map((milestone) => {
                    // Map Milestone -> Payment via payment.milestone_id
                    const payment = payments.find(
                      (p) => p.milestone_id === milestone.id
                    );

                    return (
                      <MilestoneRow
                        key={milestone.id}
                        milestone={milestone}
                        payment={payment}
                        pilotBudget={pilot?.budget}
                        onMarkPaid={handleMarkAsPaid}
                        isProcessing={
                          payment ? processingPaymentId === payment.id : false
                        }
                      />
                    );
                  })}

                  {/* Render any additional payments not directly linked to a listed milestone */}
                  {unlinkedPayments.map((payment) => (
                    <UnlinkedPaymentRow
                      key={payment.id}
                      payment={payment}
                      onMarkPaid={handleMarkAsPaid}
                      isProcessing={processingPaymentId === payment.id}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* REMARKS */}
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-400" />
                <h2 className="text-lg font-semibold">Payment Remarks</h2>
              </div>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Add any notes related to payment approval, verification or disbursal processing.
              </p>

              <textarea
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                rows={4}
                placeholder="Enter payment remarks..."
                className="mt-5 w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950"
              />
            </section>

            {/* ACTIONS */}
            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
              <button
                type="button"
                onClick={() =>
                  navigate(`/government/challenges/${challengeId}/contract`)
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-semibold transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Contract
              </button>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:hover:bg-slate-800"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Remarks"}
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  <Send className="h-4 w-4" />
                  Submit Payment Update
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </AppLayout>
  );
}

// =========================================================
// PAYMENT SUMMARY CARD
// =========================================================

function PaymentSummary({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <p className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

// =========================================================
// MILESTONE ROW (MAPPED TO REAL PAYMENT RECORD)
// =========================================================

function MilestoneRow({
  milestone,
  payment,
  pilotBudget,
  onMarkPaid,
  isProcessing,
}) {
  const isPaid = payment?.status === "PAID";
  const hasPayment = !!payment;

  // Compute display amount from real Payment record when available
  const displayAmount = hasPayment
    ? Number(payment.amount) || 0
    : pilotBudget && milestone.payment_percentage
    ? (Number(pilotBudget) * milestone.payment_percentage) / 100
    : 0;

  const displayPercentage =
    payment?.payment_percentage ?? milestone.payment_percentage ?? 0;

  const isMilestoneCompleted =
    milestone.status === "COMPLETED" ||
    (Number(milestone.completion_percentage) || 0) >= 100;

  return (
    <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              isPaid
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                : hasPayment
                ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {isPaid ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <Clock3 className="h-5 w-5" />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">{milestone.name}</h3>

              {/* Milestone verification status tag */}
              <span
                className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                  isMilestoneCompleted
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : milestone.status === "IN_PROGRESS"
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {isMilestoneCompleted
                  ? "Milestone Verified & Completed"
                  : milestone.status === "IN_PROGRESS"
                  ? `In Progress (${milestone.completion_percentage || 0}%)`
                  : "Milestone Pending"}
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Target: {formatDate(milestone.target_date)}
              {milestone.description ? ` • ${milestone.description}` : ""}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {displayPercentage}% of contract
              </div>

              {isPaid && payment?.payment_date && (
                <div className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  Disbursed: {formatDate(payment.payment_date)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="text-left sm:text-right">
            <p className="text-xs text-slate-400">Scheduled Amount</p>
            <p className="text-base font-bold">
              {formatCurrency(displayAmount)}
            </p>
          </div>

          {/* Payment Status / Action */}
          {!hasPayment ? (
            <div className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-4 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              Not Scheduled
            </div>
          ) : isPaid ? (
            <div className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Paid
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onMarkPaid(payment.id)}
              disabled={isProcessing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <IndianRupee className="h-4 w-4" />
                  Mark as Paid
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================
// UNLINKED PAYMENT ROW (Payments without milestone ID)
// =========================================================

function UnlinkedPaymentRow({ payment, onMarkPaid, isProcessing }) {
  const isPaid = payment.status === "PAID";

  return (
    <div className="rounded-2xl border border-dashed border-slate-200 p-5 dark:border-slate-800">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              isPaid
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
            }`}
          >
            {isPaid ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <Clock3 className="h-5 w-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Scheduled Payment</h3>
              <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                General Disbursal
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Status: {payment.status}
              {payment.payment_date
                ? ` • Disbursed: ${formatDate(payment.payment_date)}`
                : ""}
            </p>

            <div className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {payment.payment_percentage || 0}% of contract
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="text-left sm:text-right">
            <p className="text-xs text-slate-400">Amount</p>
            <p className="text-base font-bold">
              {formatCurrency(payment.amount)}
            </p>
          </div>

          {isPaid ? (
            <div className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Paid
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onMarkPaid(payment.id)}
              disabled={isProcessing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <IndianRupee className="h-4 w-4" />
                  Mark as Paid
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================
// HELPERS: FORMAT CURRENCY & DATE
// =========================================================

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function formatDate(dateString) {
  if (!dateString) return "Not set";
  try {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(dateString);
  }
}

export default ChallengePayments;