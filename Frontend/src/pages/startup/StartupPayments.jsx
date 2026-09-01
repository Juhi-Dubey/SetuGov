import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  FileText,
  IndianRupee,
  Receipt,
  WalletCards,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const paymentSummary = {
  approved: 4000000,
  paid: 2400000,
  pending: 1600000,
};

const paymentMilestones = [
  {
    id: 1,
    title: "Pilot Approval",
    description:
      "Initial payment after pilot approval and contract activation.",
    amount: 1200000,
    date: "05 Aug 2026",
    status: "Paid",
  },
  {
    id: 2,
    title: "Deployment Milestone",
    description:
      "Payment after successful technology deployment.",
    amount: 1200000,
    date: "28 Aug 2026",
    status: "Paid",
  },
  {
    id: 3,
    title: "Field Testing",
    description:
      "Payment after completion of field testing and submission of evidence.",
    amount: 800000,
    date: "15 Oct 2026",
    status: "Pending",
  },
  {
    id: 4,
    title: "Final Pilot Completion",
    description:
      "Final payment after evaluation and acceptance of the pilot.",
    amount: 800000,
    date: "30 Nov 2026",
    status: "Pending",
  },
];

const transactions = [
  {
    id: "TXN-2026-001",
    date: "05 Aug 2026",
    description: "Pilot Approval Payment",
    amount: 1200000,
    status: "Completed",
    reference: "GOV-PAY-847291",
  },
  {
    id: "TXN-2026-002",
    date: "28 Aug 2026",
    description: "Deployment Milestone Payment",
    amount: 1200000,
    status: "Completed",
    reference: "GOV-PAY-852104",
  },
];

function StartupPayments() {
  const navigate = useNavigate();

  const [selectedTransaction, setSelectedTransaction] =
    useState(null);

  const paidPercentage = Math.round(
    (paymentSummary.paid /
      paymentSummary.approved) *
      100
  );

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 12,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.35,
      }}
      className="space-y-6"
    >
      {/* ================================================= */}
      {/* HEADER                                            */}
      {/* ================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        <button
          type="button"
          onClick={() => navigate("/startup")}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <WalletCards className="h-5 w-5" />
              </div>

              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Financial Management
              </span>
            </div>

            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Payments
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Track approved funding, milestone
              payments, transactions and pending
              amounts for your government pilot.
            </p>
          </div>

          <div className="rounded-2xl bg-emerald-50 px-5 py-4 dark:bg-emerald-500/10">
            <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Payment Status
            </p>

            <div className="mt-1 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />

              <span className="text-sm font-bold text-slate-800 dark:text-white">
                Active
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* SUMMARY CARDS                                     */}
      {/* ================================================= */}

      <section className="grid gap-4 md:grid-cols-3">
        <PaymentCard
          icon={IndianRupee}
          title="Approved Amount"
          amount={paymentSummary.approved}
          description="Total approved pilot funding"
        />

        <PaymentCard
          icon={CheckCircle2}
          title="Amount Paid"
          amount={paymentSummary.paid}
          description={`${paidPercentage}% of approved amount`}
          status="paid"
        />

        <PaymentCard
          icon={Clock3}
          title="Pending Amount"
          amount={paymentSummary.pending}
          description="Expected against upcoming milestones"
          status="pending"
        />
      </section>

      {/* ================================================= */}
      {/* PAYMENT PROGRESS                                  */}
      {/* ================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Payment Progress
            </h2>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Track how much of your approved
              funding has been released.
            </p>
          </div>

          <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
            {formatCurrency(paymentSummary.paid)}
            {" / "}
            {formatCurrency(paymentSummary.approved)}
          </span>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
          <motion.div
            initial={{
              width: 0,
            }}
            animate={{
              width: `${paidPercentage}%`,
            }}
            transition={{
              duration: 0.8,
            }}
            className="h-full rounded-full bg-indigo-600"
          />
        </div>

        <div className="mt-3 flex justify-between text-[10px] text-slate-400">
          <span>
            {paidPercentage}% released
          </span>

          <span>
            {formatCurrency(
              paymentSummary.pending
            )}{" "}
            remaining
          </span>
        </div>
      </section>

      {/* ================================================= */}
      {/* PAYMENT MILESTONES                                */}
      {/* ================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Payment Milestones
          </h2>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Payments are released according to
            approved pilot milestones.
          </p>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {paymentMilestones.map(
            (milestone, index) => (
              <PaymentMilestone
                key={milestone.id}
                milestone={milestone}
                index={index}
              />
            )
          )}
        </div>
      </section>

      {/* ================================================= */}
      {/* TRANSACTIONS                                      */}
      {/* ================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Transaction History
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Record of payments released by the
                government.
              </p>
            </div>

            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              <Download className="h-3.5 w-3.5" />
              Export History
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-slate-100 text-left dark:border-slate-800">
                <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-wider text-slate-400 sm:px-6">
                  Transaction
                </th>

                <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Date
                </th>

                <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Amount
                </th>

                <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Status
                </th>

                <th className="px-5 py-3 text-right text-[9px] font-bold uppercase tracking-wider text-slate-400 sm:px-6">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {transactions.map(
                (transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                  >
                    <td className="px-5 py-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                          <Receipt className="h-4 w-4" />
                        </div>

                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            {transaction.description}
                          </p>

                          <p className="mt-0.5 text-[9px] text-slate-400">
                            {transaction.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">
                      {transaction.date}
                    </td>

                    <td className="px-5 py-4 text-xs font-bold text-slate-800 dark:text-slate-200">
                      {formatCurrency(
                        transaction.amount
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        {transaction.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right sm:px-6">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedTransaction(
                            transaction
                          )
                        }
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                      >
                        View
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================================================= */}
      {/* PAYMENT DOCUMENTS                                 */}
      {/* ================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <FileText className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Payment Documents
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Access invoices, payment receipts and
              other financial documents.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <DocumentCard
            title="Pilot Payment Receipt"
            description="Receipt for completed milestone payments."
          />

          <DocumentCard
            title="Funding Agreement"
            description="Approved funding and payment terms."
          />
        </div>
      </section>

      {/* ================================================= */}
      {/* PAYMENT NOTE                                      */}
      {/* ================================================= */}

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/5">
        <div className="flex items-start gap-3">
          <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />

          <p className="text-[10px] leading-5 text-indigo-700 dark:text-indigo-400">
            Payment release is subject to milestone
            completion, submitted evidence and
            government approval.
          </p>
        </div>
      </div>

      {/* ================================================= */}
      {/* TRANSACTION MODAL                                */}
      {/* ================================================= */}

      {selectedTransaction && (
        <TransactionModal
          transaction={selectedTransaction}
          onClose={() =>
            setSelectedTransaction(null)
          }
        />
      )}
    </motion.div>
  );
}

/* ===================================================== */
/* PAYMENT CARD                                          */
/* ===================================================== */

function PaymentCard({
  icon: Icon,
  title,
  amount,
  description,
  status,
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          status === "paid"
            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
            : status === "pending"
            ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
            : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <p className="mt-5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        {formatCurrency(amount)}
      </p>

      <p className="mt-1 text-[10px] text-slate-400">
        {description}
      </p>
    </div>
  );
}

/* ===================================================== */
/* PAYMENT MILESTONE                                     */
/* ===================================================== */

function PaymentMilestone({
  milestone,
  index,
}) {
  const paid =
    milestone.status === "Paid";

  return (
    <motion.div
      initial={{
        opacity: 0,
        x: 10,
      }}
      animate={{
        opacity: 1,
        x: 0,
      }}
      transition={{
        delay: index * 0.05,
      }}
      className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6"
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
          paid
            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
            : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
        }`}
      >
        {paid ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <Clock3 className="h-5 w-5" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {milestone.title}
          </h3>

          <span
            className={`rounded-full px-2 py-1 text-[9px] font-bold ${
              paid
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
            }`}
          >
            {milestone.status}
          </span>
        </div>

        <p className="mt-1 text-[10px] leading-5 text-slate-400">
          {milestone.description}
        </p>

        <div className="mt-2 flex items-center gap-1.5 text-[9px] text-slate-400">
          <Clock3 className="h-3 w-3" />
          {milestone.date}
        </div>
      </div>

      <div className="shrink-0 sm:text-right">
        <p className="text-base font-bold text-slate-900 dark:text-white">
          {formatCurrency(
            milestone.amount
          )}
        </p>

        <p className="mt-1 text-[9px] text-slate-400">
          Milestone {index + 1}
        </p>
      </div>
    </motion.div>
  );
}

/* ===================================================== */
/* DOCUMENT CARD                                         */
/* ===================================================== */

function DocumentCard({
  title,
  description,
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
        <FileText className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
          {title}
        </h3>

        <p className="mt-1 text-[9px] leading-4 text-slate-400">
          {description}
        </p>
      </div>

      <button
        type="button"
        className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-900 dark:hover:text-indigo-400"
        title="Download"
      >
        <Download className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ===================================================== */
/* TRANSACTION MODAL                                     */
/* ===================================================== */

function TransactionModal({
  transaction,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <motion.div
        initial={{
          opacity: 0,
          scale: 0.96,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-500">
              Transaction Details
            </p>

            <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
              {transaction.description}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            ×
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <Detail
            label="Transaction ID"
            value={transaction.id}
          />

          <Detail
            label="Payment Reference"
            value={transaction.reference}
          />

          <Detail
            label="Payment Date"
            value={transaction.date}
          />

          <Detail
            label="Amount"
            value={formatCurrency(
              transaction.amount
            )}
          />

          <Detail
            label="Status"
            value={transaction.status}
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white hover:bg-indigo-700"
        >
          Close
        </button>
      </motion.div>
    </div>
  );
}

/* ===================================================== */
/* DETAIL                                               */
/* ===================================================== */

function Detail({
  label,
  value,
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-200">
        {value}
      </p>
    </div>
  );
}

/* ===================================================== */
/* CURRENCY                                              */
/* ===================================================== */

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default StartupPayments;