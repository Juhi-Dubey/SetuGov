import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  ClipboardCheck,
  ShieldCheck,
  Building2,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Award
} from "lucide-react";
import { getEvaluators, verifyEvaluator } from "../../services/evaluatorService";

function AdminEvaluators() {
  const [evaluators, setEvaluators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    fetchEvaluators();
  }, [statusFilter]);

  const fetchEvaluators = async () => {
    try {
      setLoading(true);
      setError("");
      const params = {};
      if (statusFilter !== "ALL") params.verification_status = statusFilter;
      const res = await getEvaluators(params);
      const list = res?.data?.evaluators || res?.evaluators || [];
      setEvaluators(list);
    } catch (err) {
      setError(err.message || "Failed to load evaluators.");
    } finally {
      setLoading(false);
    }
  };

  const filteredEvaluators = useMemo(() => {
    return evaluators.filter((item) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (
        (item.user?.name || "").toLowerCase().includes(q) ||
        (item.user?.email || "").toLowerCase().includes(q) ||
        (item.organization || "").toLowerCase().includes(q) ||
        (item.designation || "").toLowerCase().includes(q)
      );
    });
  }, [evaluators, search]);

  const handleStatusChange = async (profileId, newStatus) => {
    try {
      setActionLoading(true);
      setActionMessage("");
      await verifyEvaluator(profileId, newStatus);
      setActionMessage(`Evaluator status successfully updated to ${newStatus}.`);
      fetchEvaluators();
    } catch (err) {
      setActionMessage(err.message || "Failed to update evaluator status.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Evaluator Registry
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage all innovation evaluators, verification credentials, and domain expertise.
          </p>
        </div>

        <button
          onClick={fetchEvaluators}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Registry
        </button>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-medium dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800">
          {actionMessage}
        </div>
      )}

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by evaluator name, organization, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900"
          >
            <option value="ALL">All Verification Statuses</option>
            <option value="VERIFIED">Verified Evaluators</option>
            <option value="PENDING">Pending Review</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Evaluator Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin mb-2 text-indigo-500" />
            Loading evaluator registry...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-red-500 flex items-center justify-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : filteredEvaluators.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Evaluators Found</h3>
            <p className="text-xs text-slate-500 mt-1">There are no evaluators matching the selected criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="py-3.5 px-4">Evaluator</th>
                  <th className="py-3.5 px-4">Organization & Role</th>
                  <th className="py-3.5 px-4">Employment Type</th>
                  <th className="py-3.5 px-4">Domain Expertise</th>
                  <th className="py-3.5 px-4">Experience</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredEvaluators.map((profile) => (
                  <tr key={profile.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                      <div>{profile.user?.name}</div>
                      <div className="text-[11px] text-slate-400">{profile.user?.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{profile.organization}</div>
                      <div className="text-[11px] text-slate-400">{profile.designation}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                      {profile.employment_type || "Independent"}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {Array.isArray(profile.domain_expertise) ? (
                          profile.domain_expertise.slice(0, 2).map((exp, idx) => (
                            <span
                              key={idx}
                              className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
                            >
                              {exp}
                            </span>
                          ))
                        ) : (
                          <span>General</span>
                        )}
                        {Array.isArray(profile.domain_expertise) && profile.domain_expertise.length > 2 && (
                          <span className="text-[10px] text-slate-400">+{profile.domain_expertise.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                      {profile.years_experience} yrs
                    </td>
                    <td className="py-3.5 px-4">
                      {profile.verification_status === "VERIFIED" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" /> Verified
                        </span>
                      ) : profile.verification_status === "REJECTED" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                          <XCircle className="h-3 w-3" /> Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {profile.verification_status !== "VERIFIED" ? (
                        <button
                          disabled={actionLoading}
                          onClick={() => handleStatusChange(profile.id, "VERIFIED")}
                          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          Verify
                        </button>
                      ) : (
                        <button
                          disabled={actionLoading}
                          onClick={() => handleStatusChange(profile.id, "REJECTED")}
                          className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-300"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminEvaluators;
