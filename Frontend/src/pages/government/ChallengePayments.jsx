import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  IndianRupee,
  WalletCards,
  AlertCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  PlusCircle,
  ExternalLink,
  Receipt,
  FileCheck2,
  ShieldCheck,
  Check,
  XCircle,
  Send,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";
import Pagination from "../../components/common/Pagination";
import PageHeader from "../../components/layout/PageHeader";
import StatCard from "../../components/common/StatCard";
import { getChallengeById, getChallengePilot } from "../../services/challengeService";
import { getPilotMilestones } from "../../services/pilotService";
import {
  getPilotPayments,
  getPayments,
  createPayment,
  updatePaymentStatus,
} from "../../services/paymentService";

function ChallengePayments() {
  const navigate = useNavigate();
  const { id: paramId, challengeId: paramChallengeId } = useParams();
  const routeId = paramId || paramChallengeId;

  const [challenge, setChallenge] = useState(null);
  const [pilot, setPilot] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [payments, setPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [processingPaymentId, setProcessingPaymentId] = useState(null);
  const [schedulingMilestoneId, setSchedulingMilestoneId] = useState(null);

  // Dialog / Modal state for marking payment as paid with optional reference number
  const [selectedPaymentForDisbursal, setSelectedPaymentForDisbursal] = useState(null);
  const [disbursalForm, setDisbursalForm] = useState({
    reference_number: "",
    payment_date: new Date().toISOString().split("T")[0],
  });

  // Load real pilot, milestones, and payments from PostgreSQL
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setActionError(null);

    try {
      if (!routeId) {
        // Global department payments page
        const paymentsRes = await getPayments({ limit: 100 }).catch(() => ({ data: { payments: [] } }));
        const fetched = paymentsRes?.data?.payments || paymentsRes?.payments || (Array.isArray(paymentsRes?.data) ? paymentsRes.data : []) || [];
        setPayments(fetched);
        setMilestones([]);
        setPilot(null);
        setChallenge(null);
        return;
      }

      // 1. Fetch challenge info if routeId is challenge ID
      const chRes = await getChallengeById(routeId).catch(() => null);
      const chData = chRes?.data?.challenge || chRes?.data || chRes;
      if (chData && chData.id) {
        setChallenge(chData);
      }

      // 2. Resolve pilot strictly via challenge route — never fall back to getPilotById(challengeId)
      let resolvedPilot = null;
      try {
        const pilotRes = await getChallengePilot(routeId);
        resolvedPilot = pilotRes?.data?.pilot || pilotRes?.pilot || pilotRes?.data;
      } catch {
        // Challenge has no pilot yet — show empty state instead of misinterpreting routeId
        resolvedPilot = null;
      }

      if (!resolvedPilot || !resolvedPilot.id) {
        setPilot(null);
        setMilestones([]);
        setPayments([]);
        return;
      }

      setPilot(resolvedPilot);

      // 3. Concurrently fetch real milestones and payments for this pilot
      const [milestonesRes, paymentsRes] = await Promise.all([
        getPilotMilestones(resolvedPilot.id).catch(() => ({ data: { milestones: [] } })),
        getPilotPayments(resolvedPilot.id).catch(() => ({ data: { payments: [] } })),
      ]);

      const fetchedMilestones =
        milestonesRes?.data?.milestones || milestonesRes?.milestones || (Array.isArray(milestonesRes?.data) ? milestonesRes.data : []);
      const fetchedPayments =
        paymentsRes?.data?.payments || paymentsRes?.payments || (Array.isArray(paymentsRes?.data) ? paymentsRes.data : []);

      setMilestones(Array.isArray(fetchedMilestones) ? fetchedMilestones : []);
      setPayments(Array.isArray(fetchedPayments) ? fetchedPayments : []);
    } catch (err) {
      setError(err.message || "Failed to load payment and milestone details from database.");
    } finally {
      setLoading(false);
    }
  }, [routeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Combined payment items for unified rendering and pagination
  const unlinkedPayments = useMemo(() => {
    return payments.filter(
      (p) => !milestones.some((m) => m.id === p.milestone_id)
    );
  }, [milestones, payments]);

  const allPaymentItems = useMemo(() => {
    if (!routeId) {
      const items = payments.map((p) => ({
        type: "payment",
        payment: p,
        id: p.id,
      }));
      // Sort actionable (non-paid) first, then paid
      return items.sort((a, b) => {
        const aPaid = a.payment?.status === "PAID" ? 1 : 0;
        const bPaid = b.payment?.status === "PAID" ? 1 : 0;
        return aPaid - bPaid;
      });
    }
    const items = [];
    milestones.forEach((m) => {
      const payment = payments.find((p) => p.milestone_id === m.id);
      items.push({ type: "milestone", milestone: m, payment, id: m.id });
    });
    unlinkedPayments.forEach((p) => {
      items.push({ type: "payment", payment: p, id: p.id });
    });

    // Prioritize actionable/pending payments at the top:
    // 1: Pending payment actionable (has payment, not paid)
    // 2: Needs payment scheduled (no payment, not completed)
    // 3: Paid/Completed
    return items.sort((a, b) => {
      const getPriority = (item) => {
        const p = item.payment;
        if (p && p.status !== "PAID") return 0; // Highest: ready/pending action
        if (!p) return 1; // Needs schedule
        return 2; // Already paid
      };
      return getPriority(a) - getPriority(b);
    });
  }, [milestones, payments, unlinkedPayments, routeId]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const paginatedPaymentItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return allPaymentItems.slice(start, start + pageSize);
  }, [allPaymentItems, currentPage, pageSize]);

  // Real financial calculations based on persisted PostgreSQL data
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

  // Schedule payment tranche for a milestone — only if amount and percentage are calculable from PostgreSQL data
  const handleScheduleMilestonePayment = async (milestone) => {
    if (!pilot?.id || schedulingMilestoneId) return;

    setSchedulingMilestoneId(milestone.id);
    setActionError(null);
    setActionSuccess(null);

    try {
      const percentage = Number(milestone.payment_percentage) || 0;
      const calculatedAmount =
        pilot.budget && percentage > 0
          ? (Number(pilot.budget) * percentage) / 100
          : 0;

      // Block submission if amount or percentage cannot be derived from persisted data
      if (calculatedAmount <= 0 || percentage <= 0) {
        setActionError(
          `Cannot schedule payment: milestone "${milestone.name}" does not have a valid payment_percentage, or this pilot does not have a budget recorded in the database. Update the milestone's payment percentage and pilot budget before scheduling.`
        );
        return;
      }

      await createPayment(pilot.id, {
        milestone_id: milestone.id,
        amount: calculatedAmount,
        payment_percentage: percentage,
        status: "UPCOMING",
      });

      setActionSuccess(`Payment schedule generated for milestone "${milestone.name}".`);
      await loadData();
    } catch (err) {
      setActionError(err.message || "Failed to schedule milestone payment.");
    } finally {
      setSchedulingMilestoneId(null);
    }
  };

  // Open Disbursal Modal
  const handleOpenDisbursalModal = (payment) => {
    setSelectedPaymentForDisbursal(payment);
    setDisbursalForm({
      reference_number: payment.reference_number || "",
      payment_date: new Date().toISOString().split("T")[0],
    });
    setActionError(null);
  };

  // Confirm Mark as Paid
  const handleConfirmMarkAsPaid = async (e) => {
    e?.preventDefault();
    if (!selectedPaymentForDisbursal || processingPaymentId) return;

    const paymentId = selectedPaymentForDisbursal.id;
    setProcessingPaymentId(paymentId);
    setActionError(null);
    setActionSuccess(null);

    try {
      await updatePaymentStatus(paymentId, {
        status: "PAID",
        payment_date: disbursalForm.payment_date,
        reference_number: disbursalForm.reference_number.trim() || null,
      });

      setActionSuccess("Payment successfully marked as PAID and persisted in PostgreSQL.");
      setSelectedPaymentForDisbursal(null);
      await loadData();
    } catch (err) {
      setActionError(err.message || "Failed to update payment status.");
    } finally {
      setProcessingPaymentId(null);
    }
  };

  return (
    <AppLayout role="government">
      <div className="mx-auto max-w-6xl">
        {/* PAGE HEADER */}
        <PageHeader
          showBack
          backTo={
            routeId
              ? `/government/challenges/${routeId}/overview`
              : "/government/dashboard"
          }
          backLabel={routeId ? "Back to Challenge Overview" : "Back to Dashboard"}
          topActions={
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-900 disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh Data
            </button>
          }
          badge="Statutory Milestone Escrow & Disbursal"
          badgeIcon={WalletCards}
          title={routeId ? "Challenge Payments & Escrow Releases" : "Department Payments & Treasury Releases"}
          description={
            routeId
              ? (pilot
                  ? `Track milestone payments, verified deliverable completion, and treasury disbursals for pilot: ${pilot.title || pilot.startup?.company_name || "Active Pilot"}`
                  : "Track milestone-based payments and financial progress for this challenge.")
              : "Consolidated register of milestone releases, verified deliverable completion, and treasury disbursals across all departmental pilots and procurements."
          }
          actions={
            pilot ? (
              <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Pilot Status: {pilot.status || "RUNNING"}
              </div>
            ) : null
          }
        />

        {/* ACTION FEEDBACK ALERTS */}
        <AnimatePresence>
          {actionError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
                <div>
                  <p className="font-semibold">Payment Action Blocked</p>
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
            </motion.div>
          )}

          {actionSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="font-semibold">Payment Disbursal Confirmed</p>
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* LOADING STATE */}
        {loading && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
            <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">
              Retrieving milestone payments and financial records from PostgreSQL...
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

        {/* NO PILOT STATE (Challenge View Only) */}
        {!loading && !error && !pilot && routeId && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
              No Active Pilot Found
            </h3>
            <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
              A pilot deployment must be initiated for this challenge before milestone escrow schedules and payments can be tracked.
            </p>
            <button
              type="button"
              onClick={() => navigate(`/government/challenges/${routeId}/pilot`)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500"
            >
              Go to Pilot Management
            </button>
          </div>
        )}

        {/* MAIN FINANCIAL CONTENT */}
        {!loading && !error && (pilot || !routeId) && (
          <>
            {/* SUMMARY CARDS */}
            <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <PaymentSummary
                icon={IndianRupee}
                label="Total Pilot Budget"
                value={formatCurrency(totalContractValue)}
                description="Sanctioned contract value"
                color="cyan"
              />

              <PaymentSummary
                icon={CheckCircle2}
                label="Disbursed Amount"
                value={formatCurrency(paidAmount)}
                description="Verified & released"
                color="emerald"
                highlightColor="text-emerald-700 dark:text-emerald-400"
              />

              <PaymentSummary
                icon={Clock3}
                label="Pending Disbursal"
                value={formatCurrency(pendingAmount)}
                description="Awaiting milestone release"
                color="amber"
                highlightColor="text-amber-700 dark:text-amber-400"
              />

              <PaymentSummary
                icon={CircleDollarSign}
                label="Escrow Disbursal %"
                value={`${paidPercentage}%`}
                description="Disbursed vs Total Budget"
                color="blue"
              />
            </section>

            {/* PROGRESS BAR */}
            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Disbursal Progression
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                    Statutory milestone tranche releases
                  </p>
                </div>

                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {paidPercentage}%
                </span>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{
                    width: `${paidPercentage}%`,
                  }}
                />
              </div>

              <div className="mt-3 flex justify-between text-xs text-slate-700 dark:text-slate-400">
                <span>Disbursed: <strong>{formatCurrency(paidAmount)}</strong></span>
                <span>Remaining: <strong>{formatCurrency(pendingAmount)}</strong></span>
              </div>
            </section>

            {/* MILESTONES & PAYMENTS */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Contract Milestones & Disbursal Tranches
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                    Disbursals require verified milestone completion and evidence review under public procurement rules.
                  </p>
                </div>
              </div>

              {allPaymentItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <Clock3 className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                    No Payment Records Scheduled
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {routeId
                      ? "Milestone deliverables and payment schedules will appear here once configured in Pilot Management."
                      : "No payment records found across active pilots or contracts in your department."}
                  </p>
                  {routeId && (
                    <Link
                      to={`/government/challenges/${routeId}/pilot`}
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      Configure Pilot Milestones <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {paginatedPaymentItems.map((item) => {
                    if (item.type === "milestone") {
                      return (
                        <MilestoneRow
                          key={item.id}
                          milestone={item.milestone}
                          payment={item.payment}
                          pilotBudget={pilot?.budget}
                          onMarkPaid={handleOpenDisbursalModal}
                          onSchedulePayment={handleScheduleMilestonePayment}
                          isProcessing={
                            item.payment
                              ? processingPaymentId === item.payment.id
                              : false
                          }
                          isScheduling={schedulingMilestoneId === item.milestone.id}
                        />
                      );
                    }
                    return (
                      <UnlinkedPaymentRow
                        key={item.id}
                        payment={item.payment}
                        onMarkPaid={handleOpenDisbursalModal}
                        isProcessing={processingPaymentId === item.payment.id}
                      />
                    );
                  })}

                  <Pagination
                    currentPage={currentPage}
                    totalItems={allPaymentItems.length}
                    pageSize={pageSize}
                    pageSizeOptions={[5, 10, 20]}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                    itemName="scheduled tranches"
                    className="mt-6"
                  />
                </div>
              )}
            </section>
          </>
        )}

        {/* DISBURSAL CONFIRMATION MODAL */}
        <AnimatePresence>
          {selectedPaymentForDisbursal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                      <IndianRupee className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Confirm Statutory Disbursal
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Record Treasury / Escrow Release in PostgreSQL
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentForDisbursal(null)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleConfirmMarkAsPaid} className="mt-4 space-y-4">
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950/50 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Disbursal Amount:</span>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {formatCurrency(selectedPaymentForDisbursal.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tranche Percentage:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedPaymentForDisbursal.payment_percentage}% of contract
                      </span>
                    </div>
                    {selectedPaymentForDisbursal.milestone && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Linked Milestone:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedPaymentForDisbursal.milestone.name}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Treasury / Bank Voucher Reference Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={disbursalForm.reference_number}
                      onChange={(e) =>
                        setDisbursalForm((prev) => ({
                          ...prev,
                          reference_number: e.target.value,
                        }))
                      }
                      placeholder="e.g. TREAS-MH-2026-94812"
                      className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Disbursal Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={disbursalForm.payment_date}
                      onChange={(e) =>
                        setDisbursalForm((prev) => ({
                          ...prev,
                          payment_date: e.target.value,
                        }))
                      }
                      className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentForDisbursal(null)}
                      className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={!!processingPaymentId}
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {processingPaymentId ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Recording in PostgreSQL...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Confirm & Mark as Paid
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </AppLayout>
  );
}

// =========================================================
// PAYMENT SUMMARY CARD
// =========================================================

function PaymentSummary({ icon: Icon, label, value, description, highlightColor, color }) {
  return (
    <StatCard
      icon={Icon}
      title={label}
      value={value}
      description={description}
      color={color || (highlightColor?.includes("emerald") ? "emerald" : "cyan")}
      valueColor={highlightColor}
    />
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
  onSchedulePayment,
  isProcessing,
  isScheduling,
}) {
  const isPaid = payment?.status === "PAID";
  const hasPayment = !!payment;

  // Ensure milestone naming has consistent 'Milestone X:' convention when order_index exists
  const formattedMilestoneName = useMemo(() => {
    const name = milestone.name || "Milestone Deliverable";
    if (/^milestone\s+\d+/i.test(name)) return name;
    if (milestone.order_index != null) {
      return `Milestone ${milestone.order_index}: ${name}`;
    }
    return name;
  }, [milestone.name, milestone.order_index]);

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
    <div className={`rounded-2xl border bg-white p-5 dark:bg-slate-900 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700 ${
      !isPaid && hasPayment
        ? "border-amber-300 ring-1 ring-amber-300/40 dark:border-amber-800 dark:ring-amber-800/30"
        : "border-slate-200 dark:border-slate-800"
    }`}>
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
            ) : hasPayment ? (
              <Clock3 className="h-5 w-5" />
            ) : (
              <Receipt className="h-5 w-5" />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {formattedMilestoneName}
              </h3>

              {/* Action priority highlight tag */}
              {!isPaid && hasPayment && (
                <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Action Required
                </span>
              )}

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
                  : "Milestone Incomplete"}
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-700 dark:text-slate-400">
              Due Date: {formatDate(milestone.due_date || milestone.target_date)}
              {milestone.description ? ` • ${milestone.description}` : ""}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
              <div className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {displayPercentage}% of contract
              </div>

              {hasPayment && (
                <div className={`inline-flex rounded-full px-2.5 py-0.5 font-semibold ${
                  isPaid
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                }`}>
                  Payment: {payment.status}
                </div>
              )}

              {isPaid && payment?.payment_date && (
                <div className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  Disbursed: {formatDate(payment.payment_date)}
                </div>
              )}

              {payment?.reference_number && (
                <div className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Ref: {payment.reference_number}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="text-left sm:text-right">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tranche Amount</p>
            <p className="text-base font-bold text-slate-900 dark:text-white">
              {formatCurrency(displayAmount)}
            </p>
          </div>

          {/* Payment Status / Action */}
          {!hasPayment ? (
            <button
              type="button"
              onClick={() => onSchedulePayment(milestone)}
              disabled={isScheduling}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
            >
              {isScheduling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlusCircle className="h-4 w-4" />
              )}
              Schedule Payment
            </button>
          ) : isPaid ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Paid
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onMarkPaid(payment)}
              disabled={isProcessing}
              title={
                !isMilestoneCompleted
                  ? "Milestone must be completed and verified before disbursing payment."
                  : "Click to record statutory payment disbursal."
              }
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold shadow-sm transition ${
                isMilestoneCompleted
                  ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
                  : "border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
              }`}
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
  const pilotTitle = payment.pilot?.title || payment.pilot?.challenge?.title || payment.procurement?.contract_title;
  const startupName = payment.pilot?.startup?.company_name || payment.procurement?.startup?.company_name;
  const milestoneName = payment.milestone?.name;
  const displayTitle = milestoneName || pilotTitle || "General Scheduled Disbursal";

  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
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
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {displayTitle}
              </h3>
              <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {milestoneName ? "Milestone Tranche" : (pilotTitle ? "Pilot Tranche" : "Direct Tranche")}
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {startupName ? `Startup: ${startupName} • ` : ""}Status: {payment.status}
              {payment.payment_date
                ? ` • Disbursed: ${formatDate(payment.payment_date)}`
                : ""}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
              <div className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {payment.payment_percentage || 0}% of contract
              </div>
              {payment.reference_number && (
                <div className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Ref: {payment.reference_number}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="text-left sm:text-right">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Amount</p>
            <p className="text-base font-bold text-slate-900 dark:text-white">
              {formatCurrency(payment.amount)}
            </p>
          </div>

          {isPaid ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Paid
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onMarkPaid(payment)}
              disabled={isProcessing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500"
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