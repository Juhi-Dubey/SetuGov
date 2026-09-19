import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  Landmark,
  MoreVertical,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
  UserX,
  X,
  XCircle,
  AlertTriangle,
  Send,
  Lock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getStartupVerifications,
  getStartupVerificationById,
  reviewStartupVerification,
  verifyStartupDocument,
} from "../../services/adminService.js";
import Pagination from "../../components/common/Pagination";

const STATUS_CONFIG = {
  DRAFT: { label: "Draft", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  SUBMITTED: { label: "Submitted", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" },
  UNDER_REVIEW: { label: "Under Review", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" },
  VERIFIED: { label: "Verified", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" },
  REJECTED: { label: "Rejected", color: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300" },
  CORRECTION_REQUESTED: { label: "Correction Requested", color: "bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300" },
};

const getRequiredDocumentTypes = (orgType) => {
  const normalized = (orgType || "PRIVATE_LIMITED").toUpperCase();
  switch (normalized) {
    case "PRIVATE_LIMITED":
    case "PUBLIC_LIMITED":
    case "LLP":
    case "PARTNERSHIP":
    case "TRUST":
    case "SOCIETY":
    case "OTHER":
      return ["PAN", "INCORPORATION_CERTIFICATE", "BANK_PROOF", "AUTHORIZED_PERSON_PROOF"];
    case "PROPRIETORSHIP":
      return ["PAN", "BANK_PROOF", "AUTHORIZED_PERSON_PROOF"];
    default:
      return ["PAN", "INCORPORATION_CERTIFICATE", "BANK_PROOF", "AUTHORIZED_PERSON_PROOF"];
  }
};

export default function AdminStartups() {
  const navigate = useNavigate();

  const [startups, setStartups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [orgTypeFilter, setOrgTypeFilter] = useState("ALL");
  const [selectedStartupId, setSelectedStartupId] = useState(null);
  const [dossier, setDossier] = useState(null);
  const [loadingDossier, setLoadingDossier] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { type: 'REJECT' | 'CORRECTION', notes: '' }
  const [submittingAction, setSubmittingAction] = useState(false);
  const [revealBankAccounts, setRevealBankAccounts] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, orgTypeFilter, search]);

  const paginatedStartups = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return startups.slice(start, start + pageSize);
  }, [startups, currentPage, pageSize]);

  const loadStartups = async () => {
    try {
      setLoading(true);
      const res = await getStartupVerifications({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        org_type: orgTypeFilter !== "ALL" ? orgTypeFilter : undefined,
        search: search || undefined,
      });
      const list = res?.data?.startups || res?.startups || (Array.isArray(res?.data) ? res.data : []) || [];
      setStartups(list);
    } catch (err) {
      console.error("Failed to load startups:", err);
      setStartups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStartups();
  }, [statusFilter, orgTypeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadStartups();
  };

  const handleOpenDossier = async (startupId) => {
    setSelectedStartupId(startupId);
    setLoadingDossier(true);
    try {
      const res = await getStartupVerificationById(startupId);
      setDossier(res?.data?.startup || res?.startup || res?.data);
    } catch (err) {
      alert(`Failed to load startup dossier: ${err.message}`);
    } finally {
      setLoadingDossier(false);
    }
  };

  const handleStatusTransition = async (action, additionalData = {}) => {
    if (!selectedStartupId) return;
    try {
      setSubmittingAction(true);
      await reviewStartupVerification(selectedStartupId, {
        action,
        ...additionalData,
      });
      setActionModal(null);
      // Reload dossier
      await handleOpenDossier(selectedStartupId);
      // Reload list
      loadStartups();
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleDocumentVerification = async (docId, status, rejectionReason = "") => {
    try {
      await verifyStartupDocument(docId, {
        verification_status: status,
        rejection_reason: rejectionReason,
      });
      // Refresh current dossier
      if (selectedStartupId) {
        await handleOpenDossier(selectedStartupId);
      }
    } catch (err) {
      alert(`Document action failed: ${err.message}`);
    }
  };

  const verifiedCount = startups.filter((s) => s.verification_status === "VERIFIED").length;
  const underReviewCount = startups.filter((s) => s.verification_status === "UNDER_REVIEW" || s.verification_status === "SUBMITTED").length;
  const correctionCount = startups.filter((s) => s.verification_status === "CORRECTION_REQUESTED").length;
  const rejectedCount = startups.filter((s) => s.verification_status === "REJECTED").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
      onClick={() => setOpenMenu(null)}
    >
      {/* HEADER */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        <button
          type="button"
          onClick={() => navigate("/admin/dashboard")}
          className="back-nav"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin Dashboard
        </button>

        <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <Building2 className="h-6 w-6" />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Government e-Procurement Verification
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Startup & Seller Verification
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Review statutory compliance, PAN/GSTIN identifiers, banking records, and verify private documents before granting procurement bidding eligibility.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadStartups}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total Sellers</p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{startups.length}</p>
            </div>
          </div>
        </div>
      </section>

      {/* SUMMARY STATS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={CheckCircle2} title="Verified Startups" value={verifiedCount} type="success" />
        <SummaryCard icon={Clock} title="Pending & In Review" value={underReviewCount} type="warning" />
        <SummaryCard icon={AlertTriangle} title="Correction Needed" value={correctionCount} type="neutral" />
        <SummaryCard icon={XCircle} title="Rejected" value={rejectedCount} type="danger" />
      </section>

      {/* STARTUP TABLE */}
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        {/* FILTERS */}
        <div className="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <form onSubmit={handleSearchSubmit} className="relative w-full xl:max-w-md flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search company, PAN, GSTIN, DPIIT, email..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-700"
              >
                Search
              </button>
            </form>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                <option value="ALL">All Status</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="VERIFIED">Verified</option>
                <option value="CORRECTION_REQUESTED">Correction Requested</option>
                <option value="REJECTED">Rejected</option>
                <option value="DRAFT">Draft</option>
              </select>

              <select
                value={orgTypeFilter}
                onChange={(e) => setOrgTypeFilter(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                <option value="ALL">All Entity Types</option>
                <option value="PRIVATE_LIMITED">Private Limited</option>
                <option value="LLP">LLP</option>
                <option value="PROPRIETORSHIP">Proprietorship</option>
                <option value="PARTNERSHIP">Partnership</option>
                <option value="PUBLIC_LIMITED">Public Limited</option>
              </select>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/50">
                <th className="px-6 py-4 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">Organization</th>
                <th className="px-6 py-4 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">Constitution</th>
                <th className="px-6 py-4 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">Statutory IDs</th>
                <th className="px-6 py-4 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">Email Status</th>
                <th className="px-6 py-4 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">Verification Status</th>
                <th className="px-6 py-4 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">Registered</th>
                <th className="px-6 py-4 text-right text-[9px] font-bold uppercase tracking-wider text-slate-400">Action</th>
              </tr>
            </thead>

            <tbody>
              {paginatedStartups.map((s, index) => {
                const statusInfo = STATUS_CONFIG[s.verification_status] || { label: s.verification_status, color: "bg-slate-100 text-slate-700" };
                const isEmailVerified = s.user?.email_verified_at || s.user?.is_verified;

                return (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-900/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="max-w-[200px] truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                            {s.company_name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {s.user?.email || s.contact_email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                        {s.org_type?.replace(/_/g, " ") || "Not Specified"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-0.5 text-[9px] font-mono text-slate-500 dark:text-slate-400">
                        <div>PAN: <span className="font-bold text-slate-700 dark:text-slate-200">{s.pan_number || "—"}</span></div>
                        {s.dpiit_number && <div>DPIIT: <span className="text-indigo-600 dark:text-indigo-400">{s.dpiit_number}</span></div>}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        isEmailVerified ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400" : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                      }`}>
                        {isEmailVerified ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                        {isEmailVerified ? "Verified" : "Unverified"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-[10px] text-slate-400">
                      {s.created_at ? new Date(s.created_at).toLocaleDateString("en-IN") : "—"}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenDossier(s.id)}
                        className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Inspect Dossier
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {startups.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <Building2 className="h-10 w-10 text-slate-400 mb-3" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No startups found</h3>
            <p className="mt-1 text-xs text-slate-400">Try adjusting your filters or search terms.</p>
          </div>
        )}
      </section>

      {/* PAGINATION */}
      <Pagination
        currentPage={currentPage}
        totalItems={startups.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        itemName="sellers"
      />

      {/* COMPREHENSIVE DOSSIER MODAL */}
      <AnimatePresence>
        {selectedStartupId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm overflow-y-auto"
            onClick={() => setSelectedStartupId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:p-8"
            >
              {loadingDossier || !dossier ? (
                <div className="py-20 text-center">
                  <RefreshCw className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
                  <p className="mt-3 text-xs font-semibold text-slate-500">Loading Seller Dossier...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* DOSSIER HEADER */}
                  <div className="flex items-start justify-between border-b border-slate-200 pb-5 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            {dossier.company_name}
                          </h2>
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                            STATUS_CONFIG[dossier.verification_status]?.color || "bg-slate-100"
                          }`}>
                            {STATUS_CONFIG[dossier.verification_status]?.label || dossier.verification_status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {dossier.org_type?.replace(/_/g, " ")} • Registered: {new Date(dossier.created_at).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedStartupId(null)}
                      className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* LIFECYCLE ACTION TOOLBAR */}
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mb-2">
                      Administrative Decision & Verification Actions
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {dossier.verification_status === "SUBMITTED" && (
                        <button
                          type="button"
                          disabled={submittingAction}
                          onClick={() => handleStatusTransition("START_REVIEW")}
                          className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
                        >
                          Mark Under Review
                        </button>
                      )}

                      {dossier.verification_status !== "VERIFIED" && (
                        <button
                          type="button"
                          disabled={submittingAction}
                          onClick={() => handleStatusTransition("APPROVE", { notes: "Verified by administrator against uploaded statutory documents." })}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          Approve Verification (Grant Eligibility)
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={submittingAction}
                        onClick={() => setActionModal({ type: "CORRECTION", notes: "" })}
                        className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-bold text-orange-700 hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950/60 dark:text-orange-300"
                      >
                        Request Corrections
                      </button>

                      <button
                        type="button"
                        disabled={submittingAction}
                        onClick={() => setActionModal({ type: "REJECT", notes: "" })}
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300"
                      >
                        Reject Verification
                      </button>
                    </div>

                    {dossier.correction_notes && (
                      <div className="mt-3 rounded-xl bg-orange-100/60 p-3 text-xs text-orange-900 dark:bg-orange-950/40 dark:text-orange-200">
                        <span className="font-bold">Active Correction Notice:</span> {dossier.correction_notes}
                      </div>
                    )}

                    {dossier.rejection_reason && (
                      <div className="mt-3 rounded-xl bg-red-100/60 p-3 text-xs text-red-900 dark:bg-red-950/40 dark:text-red-200">
                        <span className="font-bold">Rejection Reason:</span> {dossier.rejection_reason}
                      </div>
                    )}
                  </div>

                  {/* ACTION REASON MODAL */}
                  {actionModal && (
                    <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {actionModal.type === "CORRECTION" ? "Specify Required Corrections for Seller" : "Specify Rejection Reason"}
                      </h4>
                      <textarea
                        rows={3}
                        value={actionModal.notes}
                        onChange={(e) => setActionModal({ ...actionModal, notes: e.target.value })}
                        placeholder={actionModal.type === "CORRECTION" ? "e.g., PAN document is blurred. Please re-upload a clear copy." : "e.g., Ineligible entity type or fraudulent details."}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setActionModal(null)}
                          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={!actionModal.notes.trim() || submittingAction}
                          onClick={() => {
                            if (actionModal.type === "CORRECTION") {
                              handleStatusTransition("REQUEST_CORRECTION", { correction_notes: actionModal.notes });
                            } else {
                              handleStatusTransition("REJECT", { rejection_reason: actionModal.notes });
                            }
                          }}
                          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
                        >
                          Submit Decision
                        </button>
                      </div>
                    </div>
                  )}

                  {/* DOSSIER SECTIONS */}
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* SECTION 1: BUSINESS IDENTIFIERS */}
                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        <Building2 className="h-4 w-4" />
                        Statutory Identifiers
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <DossierItem label="PAN Number" value={dossier.pan_number} mono />
                        <DossierItem label="GSTIN" value={dossier.gstin} mono />
                        <DossierItem label="CIN / Reg Number" value={dossier.cin_number || dossier.registration_number} mono />
                        <DossierItem label="DPIIT Number" value={dossier.dpiit_number} mono />
                        <DossierItem label="Domain / Category" value={dossier.domain} />
                        <DossierItem label="TRL Stage" value={dossier.trl ? `TRL ${dossier.trl}` : "—"} />
                      </div>
                    </div>

                    {/* SECTION 2: AUTHORIZED SIGNATORY */}
                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        <User className="h-4 w-4" />
                        Authorized Representative
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <DossierItem label="Person Name" value={dossier.authorized_person_name || dossier.user?.name} />
                        <DossierItem label="Designation" value={dossier.authorized_person_designation} />
                        <DossierItem label="Official Email" value={dossier.authorized_person_email || dossier.user?.email} />
                        <DossierItem label="Mobile Number" value={dossier.authorized_person_phone || dossier.contact_phone} />
                        <DossierItem label="Authorization Type" value={dossier.authorization_type?.replace(/_/g, " ")} />
                        <DossierItem label="Account User" value={dossier.user?.name} />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: BANKING DETAILS (SENSITIVE) */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        <Landmark className="h-4 w-4" />
                        Disbursement & Settlement Bank Details
                      </div>
                      {dossier.bank_details && (
                        <button
                          type="button"
                          onClick={() => setRevealBankAccounts(prev => ({ ...prev, [dossier.id]: !prev[dossier.id] }))}
                          className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {revealBankAccounts[dossier.id] ? "Mask Account Number" : "Reveal Account Number"}
                        </button>
                      )}
                    </div>

                    {dossier.bank_details ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <DossierItem label="Bank Name" value={dossier.bank_details.bank_name} />
                        <DossierItem label="Account Holder" value={dossier.bank_details.account_holder_name} />
                        <DossierItem
                          label="Account Number"
                          value={
                            revealBankAccounts[dossier.id]
                              ? (dossier.bank_details.account_number || dossier.bank_details.masked_account_number)
                              : (dossier.bank_details.masked_account_number || (dossier.bank_details.account_number ? `****${dossier.bank_details.account_number.slice(-4)}` : "—"))
                          }
                          mono
                        />
                        <DossierItem label="IFSC Code" value={dossier.bank_details.ifsc_code} mono />
                        <DossierItem label="Branch" value={dossier.bank_details.branch_name} />
                        <DossierItem label="Account Type" value={dossier.bank_details.account_type} />
                        <DossierItem label="Bank Verified" value={dossier.bank_details.is_verified ? "Yes" : "Pending Admin Review"} />
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No banking details provided yet.</p>
                    )}
                  </div>

                  {/* SECTION 4: REGISTERED ADDRESS */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-2">Registered Address</div>
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      {[dossier.address_line1, dossier.address_line2, dossier.city, dossier.state, dossier.pincode, dossier.country].filter(Boolean).join(", ") || "No address submitted."}
                    </p>
                  </div>

                  {/* SECTION 5: VERIFICATION DOCUMENTS CHECKLIST */}
                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        <FileCheck2 className="h-4 w-4" />
                        Statutory Verification Documents ({dossier.documents?.length || 0})
                      </div>
                      {(() => {
                        const reqDocs = getRequiredDocumentTypes(dossier.org_type);
                        const uploadedTypes = new Set((dossier.documents || []).map(d => d.document_type));
                        const verifiedTypes = new Set((dossier.documents || []).filter(d => d.verification_status === "VERIFIED").map(d => d.document_type));
                        const allReqUploaded = reqDocs.every(t => uploadedTypes.has(t));
                        const allReqVerified = reqDocs.every(t => verifiedTypes.has(t));

                        return (
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            allReqVerified
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : allReqUploaded
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}>
                            {allReqVerified
                              ? "All Statutory Requirements Verified"
                              : allReqUploaded
                              ? "Mandatory Documents Uploaded (Pending Review)"
                              : `Missing Required Documents for ${dossier.org_type || "Entity"}`}
                          </span>
                        );
                      })()}
                    </div>

                    {(!dossier.documents || dossier.documents.length === 0) ? (
                      <p className="text-xs text-slate-400 italic py-2">No documents uploaded.</p>
                    ) : (
                      <div className="space-y-2">
                        {dossier.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                              <div>
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                  {doc.document_type?.replace(/_/g, " ")}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {doc.file_name || "Uploaded Document"} {doc.file_size ? `• ${(doc.file_size / 1024).toFixed(0)} KB` : ""}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                doc.verification_status === "VERIFIED"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                  : doc.verification_status === "REJECTED"
                                  ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                              }`}>
                                {doc.verification_status || "PENDING"}
                              </span>

                              {doc.document_url && (
                                <a
                                  href={doc.document_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  View
                                </a>
                              )}

                              {doc.verification_status !== "VERIFIED" && (
                                <button
                                  type="button"
                                  onClick={() => handleDocumentVerification(doc.id, "VERIFIED")}
                                  className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-emerald-700"
                                >
                                  Approve
                                </button>
                              )}

                              {doc.verification_status !== "REJECTED" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const reason = prompt("Enter reason for document rejection:");
                                    if (reason) {
                                      handleDocumentVerification(doc.id, "REJECTED", reason);
                                    }
                                  }}
                                  className="rounded-lg bg-red-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-red-700"
                                >
                                  Reject
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SummaryCard({ icon: Icon, title, value, type }) {
  let iconClass = "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400";
  if (type === "success") iconClass = "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400";
  if (type === "warning") iconClass = "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400";
  if (type === "danger") iconClass = "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-300">{title}</p>
    </div>
  );
}

function DossierItem({ label, value, mono }) {
  return (
    <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-950">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-0.5 truncate text-xs font-semibold text-slate-800 dark:text-slate-200 ${mono ? "font-mono font-bold" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}