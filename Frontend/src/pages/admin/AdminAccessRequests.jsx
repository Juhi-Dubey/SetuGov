import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  ShieldCheck,
  UserCheck,
  XCircle,
  Clock,
  Building2,
  ClipboardCheck,
  Eye,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  UserPlus,
  RefreshCw,
  Copy,
  Check
} from "lucide-react";
import {
  getAccessRequests,
  reviewAccessRequest,
  approveAccessRequest,
  rejectAccessRequest,
} from "../../services/accessRequestService";
import { formatEmploymentType } from "../../utils/filterUtils";
import Pagination from "../../components/common/Pagination";
import PageHeader from "../../components/layout/PageHeader";

function AdminAccessRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Detail Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  // Rejection Reason State
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Approval Success State
  const [approvalResult, setApprovalResult] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, roleFilter, sourceFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");
      const params = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (roleFilter !== "ALL") params.requested_role = roleFilter;
      if (sourceFilter !== "ALL") params.request_source = sourceFilter;

      const res = await getAccessRequests(params);
      const data = res?.data?.requests || res?.requests || [];
      setRequests(data);
    } catch (err) {
      setError(err.message || "Failed to load access requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, roleFilter, sourceFilter, search]);

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (
        (req.name || "").toLowerCase().includes(q) ||
        (req.email || "").toLowerCase().includes(q) ||
        (req.organization || "").toLowerCase().includes(q) ||
        (req.designation || "").toLowerCase().includes(q)
      );
    });
  }, [requests, search]);

  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  const handleReview = async (id) => {
    try {
      setActionLoading(true);
      setActionMessage("");
      await reviewAccessRequest(id);
      setActionMessage("Request status marked as UNDER_REVIEW.");
      fetchRequests();
      if (selectedRequest && selectedRequest.id === id) {
        setSelectedRequest((prev) => ({ ...prev, status: "UNDER_REVIEW" }));
      }
    } catch (err) {
      setActionMessage(err.message || "Failed to update review status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      setActionLoading(true);
      setActionMessage("");
      const res = await approveAccessRequest(id);
      const resultData = res?.data || res;
      setApprovalResult(resultData);
      setActionMessage("Access request approved and user account provisioned successfully!");
      fetchRequests();
      if (selectedRequest && selectedRequest.id === id) {
        setSelectedRequest((prev) => ({ ...prev, status: "APPROVED" }));
      }
    } catch (err) {
      setActionMessage(err.message || "Failed to approve access request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id) => {
    if (!rejectionReason.trim()) {
      setActionMessage("Please provide a reason for rejection.");
      return;
    }
    try {
      setActionLoading(true);
      setActionMessage("");
      await rejectAccessRequest(id, rejectionReason.trim());
      setActionMessage("Access request has been rejected.");
      setShowRejectInput(false);
      setRejectionReason("");
      fetchRequests();
      if (selectedRequest && selectedRequest.id === id) {
        setSelectedRequest((prev) => ({
          ...prev,
          status: "REJECTED",
          rejection_reason: rejectionReason.trim(),
        }));
      }
    } catch (err) {
      setActionMessage(err.message || "Failed to reject access request.");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800">
            <XCircle className="h-3.5 w-3.5" />
            Rejected
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="h-3.5 w-3.5" />
            Under Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Clock className="h-3.5 w-3.5" />
            Pending Verification
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        badge="Platform Governance"
        badgeIcon={ShieldCheck}
        title="Access & Onboarding Requests"
        description="Review and verify privileged user onboarding for Evaluators and Government Officers."
        actions={
          <button
            type="button"
            onClick={fetchRequests}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-xs transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Requests
          </button>
        }
      />

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="relative sm:col-span-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search applicants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition-all focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending Verification</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition-all focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="ALL">All Requested Roles</option>
            <option value="EVALUATOR">Evaluators</option>
            <option value="GOVERNMENT">Government Officers</option>
          </select>
        </div>

        <div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900"
          >
            <option value="ALL">All Request Sources</option>
            <option value="SELF_REQUEST">Independent Self-Application</option>
            <option value="GOVERNMENT_NOMINATION">Government Nomination</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin mb-2 text-indigo-500" />
            Loading onboarding requests...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-red-500 flex items-center justify-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Access Requests Found</h3>
            <p className="text-xs text-slate-500 mt-1">There are no onboarding requests matching the current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-200 text-left text-slate-900 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100">
                <tr>
                  <th className="py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Applicant</th>
                  <th className="py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Requested Role</th>
                  <th className="py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Source</th>
                  <th className="py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Organization / Dept</th>
                  <th className="py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Expertise / Domain</th>
                  <th className="py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Submitted</th>
                  <th className="py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Status</th>
                  <th className="py-2.5 px-4 text-right text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {paginatedRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                      <div>{req.name}</div>
                      <div className="text-[11px] text-slate-400">{req.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {req.requested_role === "EVALUATOR" ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 font-semibold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                          <ClipboardCheck className="h-3 w-3" /> Evaluator
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                          <Building2 className="h-3 w-3" /> Government
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {req.request_source === "GOVERNMENT_NOMINATION" ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          Gov Nomination
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Self Request
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {req.organization || req.department?.name || "Independent"}
                      </div>
                      <div className="text-[11px] text-slate-400">{req.designation || "Specialist"}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="max-w-[160px] truncate">
                        {Array.isArray(req.domain_expertise)
                          ? req.domain_expertise.join(", ")
                          : req.domain_expertise || "Innovation"}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(req.status)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedRequest(req);
                          setApprovalResult(null);
                          setShowRejectInput(false);
                          setActionMessage("");
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAGINATION */}
      <Pagination
        currentPage={currentPage}
        totalItems={filteredRequests.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        itemName="requests"
      />

      {/* =====================================================
          REQUEST DETAIL & VERIFICATION MODAL
      ===================================================== */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-8 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase">Access Request ID</span>
                  <span className="text-xs font-mono text-slate-500">{selectedRequest.id.slice(0, 8)}</span>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {selectedRequest.name}
                </h3>
                <p className="text-xs text-slate-500">{selectedRequest.email}</p>
              </div>

              <button
                onClick={() => setSelectedRequest(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Action Feedback Banner */}
            {actionMessage && (
              <div className="my-4 p-3 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-medium dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800">
                {actionMessage}
              </div>
            )}

            {/* If approved, show secure invitation email confirmation */}
            {approvalResult && approvalResult.invitation && (
              <div className="my-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs dark:border-emerald-900/40 dark:bg-emerald-950/40">
                <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-200 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Invitation Dispatched via Secure Email
                </div>
                <p className="text-emerald-700 dark:text-emerald-300">
                  The request has been approved for <strong>{selectedRequest.requested_role}</strong> access. A secure, single-use invitation email has been sent to <strong>{selectedRequest.email}</strong> (valid for 48 hours). The privileged account will activate once the applicant accepts the email invitation and establishes their credentials.
                </p>
              </div>
            )}

            {/* Request Details Grid */}
            <div className="my-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/40">
                <div>
                  <span className="font-semibold text-slate-500 block mb-0.5">Requested Role</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedRequest.requested_role}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block mb-0.5">Source</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedRequest.request_source === "GOVERNMENT_NOMINATION"
                      ? "Government Officer Nomination"
                      : "Independent Self-Application"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block mb-0.5">Organization / Dept</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {selectedRequest.department_name || selectedRequest.organization || selectedRequest.department?.name || "Independent"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block mb-0.5">Designation</span>
                  <span className="text-slate-800 dark:text-slate-200">{selectedRequest.designation || "N/A"}</span>
                </div>
                {selectedRequest.state && (
                  <div>
                    <span className="font-semibold text-slate-500 block mb-0.5">State / Jurisdiction</span>
                    <span className="text-slate-800 dark:text-slate-200">{selectedRequest.state}</span>
                  </div>
                )}
                {selectedRequest.department_code && (
                  <div>
                    <span className="font-semibold text-slate-500 block mb-0.5">Department Code</span>
                    <span className="text-slate-800 dark:text-slate-200">{selectedRequest.department_code}</span>
                  </div>
                )}
                {selectedRequest.official_website && (
                  <div>
                    <span className="font-semibold text-slate-500 block mb-0.5">Official Website</span>
                    <a
                      href={selectedRequest.official_website.startsWith("http") ? selectedRequest.official_website : `https://${selectedRequest.official_website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:underline dark:text-indigo-400 truncate block"
                    >
                      {selectedRequest.official_website}
                    </a>
                  </div>
                )}
                <div>
                  <span className="font-semibold text-slate-500 block mb-0.5">Employment Type</span>
                  <span className="text-slate-800 dark:text-slate-200">{formatEmploymentType(selectedRequest.employment_type)}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block mb-0.5">Experience</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {selectedRequest.years_experience} years
                  </span>
                </div>
              </div>

              {/* Expertise */}
              <div>
                <span className="font-semibold text-slate-500 block mb-1">Domain Expertise</span>
                <div className="flex flex-wrap gap-1.5">
                  {Array.isArray(selectedRequest.domain_expertise) ? (
                    selectedRequest.domain_expertise.map((exp, idx) => (
                      <span
                        key={idx}
                        className="rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                      >
                        {exp}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400">General</span>
                  )}
                </div>
              </div>

              {/* Reason */}
              <div>
                <span className="font-semibold text-slate-500 block mb-1">Application / Nomination Reason</span>
                <p className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 text-slate-700 dark:text-slate-300">
                  {selectedRequest.reason || "No statement provided."}
                </p>
              </div>

              {/* Bio */}
              {selectedRequest.bio && (
                <div>
                  <span className="font-semibold text-slate-500 block mb-1">Profile Bio</span>
                  <p className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 text-slate-700 dark:text-slate-300">
                    {selectedRequest.bio}
                  </p>
                </div>
              )}

              {/* Supporting Credentials URL */}
              {selectedRequest.supporting_document_url && (
                <div>
                  <span className="font-semibold text-slate-500 block mb-1">Supporting Credentials</span>
                  <a
                    href={selectedRequest.supporting_document_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {selectedRequest.supporting_document_url}
                  </a>
                </div>
              )}

              {/* Nominator Information */}
              {selectedRequest.nominator && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/30 dark:bg-amber-950/20">
                  <span className="font-semibold text-amber-800 dark:text-amber-300 block mb-1">
                    Nominated by Government Official
                  </span>
                  <div className="text-slate-700 dark:text-slate-300">
                    {selectedRequest.nominator.name} ({selectedRequest.nominator.email})
                  </div>
                </div>
              )}

              {/* Rejection input area */}
              {showRejectInput && (
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 space-y-2 dark:border-red-900/30 dark:bg-red-950/20">
                  <label className="block font-semibold text-red-800 dark:text-red-300">
                    Reason for Rejection <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="State reason for rejecting this access request..."
                    className="w-full rounded-lg border border-red-200 dark:border-red-900/40 bg-white dark:bg-slate-900 p-2 text-xs outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRejectInput(false)}
                      className="px-3 py-1 rounded bg-slate-200 text-slate-700 text-xs font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleReject(selectedRequest.id)}
                      className="px-3 py-1 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
              <div>
                {selectedRequest.status === "PENDING" && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleReview(selectedRequest.id)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                  >
                    Mark Under Review
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Close
                </button>

                {selectedRequest.status !== "APPROVED" && selectedRequest.status !== "REJECTED" && !showRejectInput && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowRejectInput(true)}
                      className="px-3.5 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300"
                    >
                      Reject
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleApprove(selectedRequest.id)}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {actionLoading ? "Provisioning..." : "Approve & Verify Account"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default AdminAccessRequests;
