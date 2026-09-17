import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  ClipboardCheck,
  UserPlus,
  ShieldCheck,
  Building2,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Award,
  Sparkles,
  ExternalLink
} from "lucide-react";
import { getEvaluators, nominateEvaluator } from "../../services/evaluatorService";

function GovernmentEvaluators() {
  const navigate = useNavigate();
  const [evaluators, setEvaluators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("ALL");

  // Nomination Modal
  const [showNominateModal, setShowNominateModal] = useState(false);
  const [nominateLoading, setNominateLoading] = useState(false);
  const [nominateSuccess, setNominateSuccess] = useState(false);
  const [nominateError, setNominateError] = useState("");
  const [nominateForm, setNominateForm] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
    designation: "",
    employment_type: "EMPLOYED",
    domain_expertise: "",
    years_experience: "",
    bio: "",
    reason: "",
    supporting_document_url: ""
  });

  useEffect(() => {
    fetchVerifiedEvaluators();
  }, []);

  const fetchVerifiedEvaluators = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getEvaluators();
      const list = res?.data?.evaluators || res?.evaluators || [];
      setEvaluators(list);
    } catch (err) {
      setError(err.message || "Failed to load verified evaluators.");
    } finally {
      setLoading(false);
    }
  };

  const filteredEvaluators = useMemo(() => {
    return evaluators.filter((item) => {
      const q = search.toLowerCase().trim();
      const matchesQuery =
        !q ||
        (item.user?.name || "").toLowerCase().includes(q) ||
        (item.user?.email || "").toLowerCase().includes(q) ||
        (item.organization || "").toLowerCase().includes(q) ||
        (item.designation || "").toLowerCase().includes(q);

      const matchesDomain =
        domainFilter === "ALL" ||
        (Array.isArray(item.domain_expertise) && item.domain_expertise.includes(domainFilter));

      return matchesQuery && matchesDomain;
    });
  }, [evaluators, search, domainFilter]);

  const handleNominateSubmit = async (e) => {
    e.preventDefault();
    setNominateLoading(true);
    setNominateError("");
    try {
      await nominateEvaluator({
        ...nominateForm,
        domain_expertise: nominateForm.domain_expertise.split(",").map((s) => s.trim()).filter(Boolean),
        years_experience: parseInt(nominateForm.years_experience, 10) || 0,
      });
      setNominateSuccess(true);
    } catch (err) {
      setNominateError(err.message || "Failed to submit evaluator nomination.");
    } finally {
      setNominateLoading(false);
    }
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 mb-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified Expert Directory
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Official Evaluator Registry
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Browse administrator-verified technical evaluators for scoring innovation proposals or nominate new experts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchVerifiedEvaluators}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            <button
              onClick={() => {
                setShowNominateModal(true);
                setNominateSuccess(false);
                setNominateError("");
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900"
            >
              <UserPlus className="h-4 w-4" />
              Nominate Evaluator
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search verified evaluators by name, institution, or designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs outline-none focus:border-purple-500 dark:border-slate-800 dark:bg-slate-900"
            />
          </div>

          <div>
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-purple-500 dark:border-slate-800 dark:bg-slate-900"
            >
              <option value="ALL">All Technical Domains</option>
              <option value="Artificial Intelligence">Artificial Intelligence</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Smart City">Smart City</option>
              <option value="IoT">IoT</option>
              <option value="Agriculture">Agriculture</option>
            </select>
          </div>
        </div>

        {/* Evaluator Cards Grid */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin mb-2 text-purple-500" />
            Loading verified evaluator registry...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-red-500 flex items-center justify-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : filteredEvaluators.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Verified Evaluators Found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Evaluators become available once verified by SetuGov administrators. You can nominate domain specialists anytime.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvaluators.map((profile) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                role="button"
                tabIndex={0}
                aria-label={`View profile of ${profile.user?.name || "evaluator"}`}
                onClick={() => navigate(`/government/evaluators/${profile.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/government/evaluators/${profile.id}`);
                  }
                }}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:border-purple-400 hover:shadow-md hover:shadow-purple-100/50 dark:hover:border-purple-700 dark:hover:shadow-purple-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-purple-700">
                        {profile.user?.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {[profile.designation, profile.organization].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>

                    {/* Verified badge — pointer-events-none so it doesn't interfere with card click */}
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 pointer-events-none flex-shrink-0"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Verified
                    </span>
                  </div>

                  <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                    {profile.bio || "Verified domain specialist available for technical feasibility and innovation evaluation."}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {Array.isArray(profile.domain_expertise) &&
                      profile.domain_expertise.map((exp, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 pointer-events-none"
                        >
                          {exp}
                        </span>
                      ))}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {profile.years_experience != null
                      ? `Experience: ${profile.years_experience} yr${profile.years_experience !== 1 ? "s" : ""}`
                      : "Experience: —"}
                  </span>
                  <span className="text-slate-400">
                    {profile.employment_type || "Independent"}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* =====================================================
            GOVERNMENT NOMINATE EVALUATOR MODAL
        ===================================================== */}
        {showNominateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-8"
            >
              <div className="mb-4">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-semibold text-xs uppercase tracking-wider">
                  <UserPlus className="h-4 w-4" />
                  Evaluator Recommendation
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  Nominate Domain Evaluator
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Recommend an external expert or academician. Nominations are forwarded to SetuGov Administrators for independent credential verification.
                </p>
              </div>

              {nominateSuccess ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-900/40 dark:bg-emerald-950/40">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-2" />
                  <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Nomination Forwarded!</h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                    Your recommendation has been submitted to SetuGov Administrators. The evaluator will appear in your selection panel once verified.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNominateModal(false);
                      setNominateSuccess(false);
                    }}
                    className="mt-4 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleNominateSubmit} className="space-y-3.5 text-xs max-h-[70vh] overflow-y-auto pr-1">
                  {nominateError && (
                    <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/30">
                      {nominateError}
                    </div>
                  )}

                  <div>
                    <label className="block font-medium mb-1">Evaluator Full Name *</label>
                    <input
                      type="text"
                      required
                      value={nominateForm.name}
                      onChange={(e) => setNominateForm({ ...nominateForm, name: e.target.value })}
                      placeholder="Prof. Ananya Sen"
                      className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={nominateForm.email}
                        onChange={(e) => setNominateForm({ ...nominateForm, email: e.target.value })}
                        placeholder="ananya.sen@iitd.ac.in"
                        className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={nominateForm.phone}
                        onChange={(e) => setNominateForm({ ...nominateForm, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium mb-1">Organization / Institution</label>
                      <input
                        type="text"
                        value={nominateForm.organization}
                        onChange={(e) => setNominateForm({ ...nominateForm, organization: e.target.value })}
                        placeholder="IIT Delhi / AIIMS"
                        className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Designation</label>
                      <input
                        type="text"
                        value={nominateForm.designation}
                        onChange={(e) => setNominateForm({ ...nominateForm, designation: e.target.value })}
                        placeholder="Department Head / Professor"
                        className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium mb-1">Domain Expertise *</label>
                      <input
                        type="text"
                        required
                        value={nominateForm.domain_expertise}
                        onChange={(e) => setNominateForm({ ...nominateForm, domain_expertise: e.target.value })}
                        placeholder="AI, Healthcare, IoT"
                        className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Experience (Years)</label>
                      <input
                        type="number"
                        min="0"
                        value={nominateForm.years_experience}
                        onChange={(e) => setNominateForm({ ...nominateForm, years_experience: e.target.value })}
                        placeholder="10"
                        className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium mb-1">Reason for Nomination *</label>
                    <textarea
                      rows={2}
                      required
                      value={nominateForm.reason}
                      onChange={(e) => setNominateForm({ ...nominateForm, reason: e.target.value })}
                      placeholder="Why is this expert suited to evaluate solutions for your department's challenges?"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent p-2.5 outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1">Supporting Profile URL</label>
                    <input
                      type="url"
                      value={nominateForm.supporting_document_url}
                      onChange={(e) => setNominateForm({ ...nominateForm, supporting_document_url: e.target.value })}
                      placeholder="https://iitd.ac.in/faculty/..."
                      className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowNominateModal(false)}
                      className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={nominateLoading}
                      className="px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 disabled:opacity-50"
                    >
                      {nominateLoading ? "Forwarding..." : "Submit Nomination"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </div>
  );
}

export default GovernmentEvaluators;
