import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  FileText,
  FlaskConical,
  Users,
  ShieldCheck,
  Plus,
  ArrowRight,
  ClipboardCheck,
  BarChart3,
  AlertTriangle,
  Clock,
  Sparkles,
  MapPin,
  Mail,
  CheckCircle2,
  ChevronRight,
  Search,
  Edit3,
  Save,
  X,
  Phone,
  AlertCircle,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";
import MyPageHeader from "../../components/mypage/MyPageHeader";
import MyPageProfileCard from "../../components/mypage/MyPageProfileCard";
import MyPageStatCard from "../../components/mypage/MyPageStatCard";
import MyPageSection from "../../components/mypage/MyPageSection";
import MyPageActionCard from "../../components/mypage/MyPageActionCard";
import MyPageEmptyState from "../../components/mypage/MyPageEmptyState";
import { useAuth } from "../../context/AuthContext";
import { getChallenges, getGovernmentAnalytics } from "../../services/challengeService";
import { getPilots } from "../../services/pilotService";
import { updateUser } from "../../services/adminService";

export default function GovernmentMyPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [challenges, setChallenges] = useState([]);
  const [pilots, setPilots] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  // Edit Profile Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  useEffect(() => {
    fetchGovernmentData();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    try {
      setSaving(true);
      setEditError("");
      await updateUser(user.id, {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
      });
      if (refreshUser) await refreshUser();
      setIsEditing(false);
      setSuccessMsg("Profile details updated successfully.");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setEditError(err?.message || "Failed to update profile details.");
    } finally {
      setSaving(false);
    }
  };

  const fetchGovernmentData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [challengesRes, pilotsRes, analyticsRes] = await Promise.all([
        getChallenges().catch(() => ({ data: { challenges: [] } })),
        getPilots().catch(() => ({ data: { pilots: [] } })),
        getGovernmentAnalytics().catch(() => null),
      ]);

      const rawChallenges =
        challengesRes?.data?.challenges ||
        challengesRes?.challenges ||
        (Array.isArray(challengesRes?.data) ? challengesRes.data : []) ||
        [];

      const rawPilots =
        pilotsRes?.data?.pilots ||
        pilotsRes?.pilots ||
        (Array.isArray(pilotsRes?.data) ? pilotsRes.data : []) ||
        [];

      setChallenges(rawChallenges);
      setPilots(rawPilots);
      setAnalytics(analyticsRes?.data || analyticsRes || null);
    } catch (err) {
      console.warn("Failed to load government profile data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const departmentName = user?.department?.name || "Not specified";
  const departmentState = user?.department?.state || "Not specified";
  const nodalDesignation = user?.designation || "Not specified";

  const totalChallenges = analytics?.metrics?.total_challenges ?? challenges.length;
  const totalApplications =
    analytics?.metrics?.total_applications ??
    challenges.reduce((sum, ch) => {
      const count = ch._count?.applications ?? (Array.isArray(ch.applications) ? ch.applications.length : 0);
      return sum + count;
    }, 0);
  const activePilots =
    analytics?.metrics?.active_pilots ??
    pilots.filter((p) => ["RUNNING", "PLANNED", "VALIDATION"].includes(p.status)).length;
  const pilotsAtRisk =
    analytics?.metrics?.pilots_at_risk ??
    pilots.filter((p) => p.status === "AT_RISK").length;

  const profileFields = [
    {
      label: "Department",
      value: departmentName,
      subtext: user?.department?.code ? `Code: ${user.department.code}` : null,
      icon: Building2,
    },
    {
      label: "Designation",
      value: nodalDesignation,
      subtext: user?.role ? `Role: ${user.role}` : null,
      icon: ShieldCheck,
    },
    {
      label: "Jurisdiction",
      value: departmentState,
      subtext: null,
      icon: MapPin,
    },
    {
      label: "Official Contact",
      value: user?.department?.contact_email || user?.email || "Not specified",
      subtext: user?.phone ? `Phone: ${user.phone}` : null,
      icon: Mail,
    },
  ];

  const recentChallenges = challenges.slice(0, 4);
  const activePilotsList = pilots.slice(0, 3);

  return (
    <AppLayout role="government">
      <div className="space-y-5 sm:space-y-6">
        {/* SUCCESS / ERROR ALERTS */}
        {successMsg && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* HEADER */}
        <MyPageHeader
          title="Government Nodal Workspace"
          subtitle="Department profile, procurement initiatives, pilot deployments, and authorized governance actions."
          roleBadge="GOVERNMENT OFFICER"
          roleColor="blue"
          onRefresh={() => fetchGovernmentData(true)}
          isRefreshing={refreshing}
          actions={
            <button
              type="button"
              onClick={() => navigate("/government/challenges/create")}
              className="btn-primary inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              <span>Create Challenge</span>
            </button>
          }
        />

        {/* PROFILE IDENTITY CARD */}
        <MyPageProfileCard
          user={user}
          roleBadgeText="GOVERNMENT NODAL OFFICER"
          roleTheme="blue"
          fields={profileFields}
          tags={[departmentName, departmentState].filter((t) => t !== "Not specified")}
          onEditProfile={() => setIsEditing(true)}
          editButtonText="Edit Profile"
        />

        {/* SUMMARY STATS */}
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <MyPageStatCard
            index={0}
            title="Active Department Challenges"
            value={totalChallenges}
            subtext="Published innovation problem statements"
            icon={FileText}
            color="blue"
            onClick={() => navigate("/government/challenges")}
          />
          <MyPageStatCard
            index={1}
            title="Total Applications Received"
            value={totalApplications}
            subtext="Startup proposals in review"
            icon={ClipboardCheck}
            color="emerald"
            onClick={() => navigate("/government/challenges")}
          />
          <MyPageStatCard
            index={2}
            title="Active Pilot Deployments"
            value={activePilots}
            subtext="Live operational sandbox trials"
            icon={FlaskConical}
            color="purple"
            onClick={() => navigate("/government/pilots")}
          />
          <MyPageStatCard
            index={3}
            title="Pilots Needing Attention"
            value={pilotsAtRisk}
            subtext={pilotsAtRisk > 0 ? "Flagged for delay or risk" : "All deployments on track"}
            icon={AlertTriangle}
            color={pilotsAtRisk > 0 ? "amber" : "slate"}
            onClick={() => navigate("/government/pilots")}
          />
        </div>

        {/* AUTHORIZED GOVERNMENT ACTIONS */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MyPageActionCard
            title="Post New Challenge"
            description="Formulate innovation problem statement"
            icon={Plus}
            color="blue"
            onClick={() => navigate("/government/challenges/create")}
          />
          <MyPageActionCard
            title="Manage Evaluator Pool"
            description="Assign domain experts to review bids"
            icon={Users}
            color="purple"
            onClick={() => navigate("/government/evaluators")}
          />
          <MyPageActionCard
            title="Monitor Pilot Sandboxes"
            description="Track milestones, KPIs & disbursements"
            icon={FlaskConical}
            color="emerald"
            onClick={() => navigate("/government/pilots")}
          />
          <MyPageActionCard
            title="Procurement Reports"
            description="Audit compliance & governance analytics"
            icon={BarChart3}
            color="amber"
            onClick={() => navigate("/government/reports")}
          />
        </div>

        {/* MAIN SECTIONS: CHALLENGES & PILOTS */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* SECTION 1: DEPARTMENT INITIATIVES */}
          <MyPageSection
            title="Department Problem Statements"
            subtitle="Active challenges published by your nodal department"
            icon={FileText}
            badge={`${challenges.length} Total`}
            action={
              <button
                type="button"
                onClick={() => navigate("/government/challenges")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                <span>View All</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            }
          >
            {challenges.length === 0 ? (
              <MyPageEmptyState
                title="No Department Challenges Created"
                description="Formulate your department's first public challenge to invite startup solutions."
                actionText="Create Challenge"
                onAction={() => navigate("/government/challenges/create")}
              />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {recentChallenges.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/government/challenges/${item.id}`)}
                    className="group flex items-center justify-between py-3 cursor-pointer transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 rounded-xl px-2.5 -mx-2.5"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {item.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {item.stage || item.status || "ACTIVE"}
                        </span>
                        {item._count?.applications !== undefined && (
                          <span>{item._count.applications} applications</span>
                        )}
                        {item.budget_allocated && (
                          <span>₹{(Number(item.budget_allocated) / 100000).toFixed(1)}L Budget</span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-600 dark:text-slate-600 dark:group-hover:text-slate-300" />
                  </div>
                ))}
              </div>
            )}
          </MyPageSection>

          {/* SECTION 2: PILOT SANDBOX DEPLOYMENTS */}
          <MyPageSection
            title="Pilot Deployments"
            subtitle="Operational trials underway in department facilities"
            icon={FlaskConical}
            badge={`${pilots.length} Sandboxes`}
            action={
              <button
                type="button"
                onClick={() => navigate("/government/pilots")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                <span>View Pilots</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            }
          >
            {pilots.length === 0 ? (
              <MyPageEmptyState
                title="No Active Pilot Sandboxes"
                description="Once challenge applications are evaluated and approved, pilot trials will appear here."
              />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {activePilotsList.map((pilot) => (
                  <div
                    key={pilot.id}
                    onClick={() => navigate(`/government/pilots/${pilot.id}`)}
                    className="group flex items-center justify-between py-3 cursor-pointer transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 rounded-xl px-2.5 -mx-2.5"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {pilot.title || pilot.challenge?.title || "Department Sandbox Trial"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span
                          className={`rounded-md px-1.5 py-0.5 font-medium ${
                            pilot.status === "AT_RISK"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          }`}
                        >
                          {pilot.status || "RUNNING"}
                        </span>
                        {pilot.startup?.company_name && (
                          <span className="font-medium text-slate-600 dark:text-slate-300">
                            {pilot.startup.company_name}
                          </span>
                        )}
                        {pilot.location && <span>· {pilot.location}</span>}
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-600 dark:text-slate-600 dark:group-hover:text-slate-300" />
                  </div>
                ))}
              </div>
            )}
          </MyPageSection>
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      <AnimatePresence>
        {isEditing && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            onClick={() => setIsEditing(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:p-8"
            >
              <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Edit Government Officer Profile
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Update your authorized account name and official contact number.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {editError && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/60">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Officer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    placeholder="Full Name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Official Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Department Affiliation</p>
                  <p className="mt-0.5">{departmentName} ({departmentState})</p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Official email and department assignments are verified by State Nodal Administrators.
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{saving ? "Saving..." : "Save Changes"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
