import { useState } from "react";
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
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";

function ChallengePayments() {
  const navigate = useNavigate();
  const { challengeId } = useParams();

  const id = challengeId || "1";

  const [milestones, setMilestones] = useState([
    {
      id: "m1",
      name: "Pilot Deployment",
      percentage: 25,
      amount: 125000,
      status: "paid",
      dueDate: "2026-06-15",
    },
    {
      id: "m2",
      name: "Performance Evaluation",
      percentage: 25,
      amount: 125000,
      status: "pending",
      dueDate: "2026-07-15",
    },
    {
      id: "m3",
      name: "Scale-up Deployment",
      percentage: 30,
      amount: 150000,
      status: "pending",
      dueDate: "2026-08-15",
    },
    {
      id: "m4",
      name: "Final Acceptance",
      percentage: 20,
      amount: 100000,
      status: "pending",
      dueDate: "2026-09-15",
    },
  ]);

  const [remarks, setRemarks] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const totalContractValue = milestones.reduce(
    (total, milestone) => total + milestone.amount,
    0
  );

  const paidAmount = milestones
    .filter((milestone) => milestone.status === "paid")
    .reduce(
      (total, milestone) => total + milestone.amount,
      0
    );

  const pendingAmount = totalContractValue - paidAmount;

  const paidPercentage =
    totalContractValue > 0
      ? Math.round(
          (paidAmount / totalContractValue) * 100
        )
      : 0;

  const handleMarkAsPaid = (milestoneId) => {
    setMilestones((previous) =>
      previous.map((milestone) =>
        milestone.id === milestoneId
          ? {
              ...milestone,
              status: "paid",
            }
          : milestone
      )
    );
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      await new Promise((resolve) =>
        setTimeout(resolve, 600)
      );

      console.log("Payment information saved:", {
        challengeId: id,
        milestones,
        remarks,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = () => {
    console.log("Payment request submitted:", {
      challengeId: id,
      milestones,
      remarks,
    });

    alert("Payment information submitted successfully.");
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
                `/government/challenges/${id}/contract`
              )
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
                Track milestone-based payments and
                financial progress for this challenge.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Contract Active
            </div>

          </div>
        </motion.div>

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

        {/* PROGRESS */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="flex items-center justify-between">

            <div>
              <h2 className="text-lg font-semibold">
                Payment Progress
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Milestone payment completion
              </p>
            </div>

            <span className="text-sm font-bold">
              {paidPercentage}%
            </span>

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
            <span>
              Paid: {formatCurrency(paidAmount)}
            </span>

            <span>
              Remaining: {formatCurrency(pendingAmount)}
            </span>
          </div>

        </section>

        {/* MILESTONES */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">

          <div className="mb-6">
            <h2 className="text-lg font-semibold">
              Payment Milestones
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Review and manage payments linked to
              contract milestones.
            </p>
          </div>

          <div className="space-y-4">

            {milestones.map((milestone) => (
              <MilestoneRow
                key={milestone.id}
                milestone={milestone}
                onMarkPaid={handleMarkAsPaid}
              />
            ))}

          </div>

        </section>

        {/* REMARKS */}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-400" />

            <h2 className="text-lg font-semibold">
              Payment Remarks
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Add any notes related to payment approval,
            verification or processing.
          </p>

          <textarea
            value={remarks}
            onChange={(event) =>
              setRemarks(event.target.value)
            }
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
              navigate(
                `/government/challenges/${id}/contract`
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
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:hover:bg-slate-800"
            >
              <Save className="h-4 w-4" />

              {isSaving
                ? "Saving..."
                : "Save Changes"}
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

      </div>
    </AppLayout>
  );
}

// =========================================================
// PAYMENT SUMMARY
// =========================================================

function PaymentSummary({
  icon: Icon,
  label,
  value,
}) {
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

      <p className="mt-1 text-xl font-bold">
        {value}
      </p>

    </div>
  );
}

// =========================================================
// MILESTONE ROW
// =========================================================

function MilestoneRow({
  milestone,
  onMarkPaid,
}) {
  const isPaid = milestone.status === "paid";

  return (
    <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">

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
            <h3 className="text-sm font-semibold">
              {milestone.name}
            </h3>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Due: {milestone.dueDate}
            </p>

            <div className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {milestone.percentage}% of contract
            </div>
          </div>

        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

          <div className="text-left sm:text-right">
            <p className="text-xs text-slate-400">
              Amount
            </p>

            <p className="text-base font-bold">
              {formatCurrency(milestone.amount)}
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
              onClick={() =>
                onMarkPaid(milestone.id)
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              <IndianRupee className="h-4 w-4" />
              Mark as Paid
            </button>
          )}

        </div>

      </div>

    </div>
  );
}

// =========================================================
// FORMAT CURRENCY
// =========================================================

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default ChallengePayments;