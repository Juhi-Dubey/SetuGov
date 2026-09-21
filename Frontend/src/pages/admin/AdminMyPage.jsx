import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Users,
  Building2,
  UserCheck,
  Activity,
  History,
  AlertCircle,
  FileCheck2,
  Settings,
  ChevronRight,
  Shield,
  Clock,
  UserPlus,
  ClipboardList,
  Sparkles,
  Lock,
  Edit3,
  Save,
  X,
  Phone,
  CheckCircle2,
  Mail,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";
import MyPageHeader from "../../components/mypage/MyPageHeader";
import MyPageProfileCard from "../../components/mypage/MyPageProfileCard";
import MyPageStatCard from "../../components/mypage/MyPageStatCard";
import MyPageSection from "../../components/mypage/MyPageSection";
import MyPageActionCard from "../../components/mypage/MyPageActionCard";
import MyPageEmptyState from "../../components/mypage/MyPageEmptyState";
import { useAuth } from "../../context/AuthContext";
import { getAdminDashboard, getAdminAuditLogs, updateUser } from "../../services/adminService";

export default function AdminMyPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

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
    fetchAdminData();
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
      setSuccessMsg("Administrator profile updated successfully.");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setEditError(err?.message || "Failed to update profile details.");
    } finally {
      setSaving(false);
    }
  };

  const fetchAdminData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [dashRes, logsRes] = await Promise.all([
        getAdminDashboard().catch(() => null),
        getAdminAuditLogs({ limit: 6 }).catch(() => ({ data: [] })),
      ]);

      const data = dashRes?.data || dashRes || null;
      setDashboardData(data);

      const rawLogs =
        logsRes?.data?.auditLogs ||
        logsRes?.data?.logs ||
        logsRes?.data ||
        data?.recentAuditLogs ||
        [];

      setAuditLogs(Array.isArray(rawLogs) ? rawLogs.slice(0, 6) : []);
    } catch (err) {
      console.warn("Failed to load admin profile data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const summary = dashboardData?.summary || {};
  const usersBreakdown = dashboardData?.usersBreakdown || {};
  const pendingVerifications = summary?.pendingVerifications || {
    government: 0,
    startups: 0,
    evaluators: 0,
    total: 0,
  };

  const totalUsers = summary?.totalUsers ?? 0;
  const totalStartups = summary?.totalStartups ?? (usersBreakdown?.STARTUP ?? 0);
  const totalEvaluators = summary?.totalEvaluators ?? (usersBreakdown?.EVALUATOR ?? 0);
  const totalPilots = summary?.totalPilots ?? 0;

  const profileFields = [
    {
      label: "Platform Role",
      value: user?.role || "ADMIN",
      subtext: "System Administration",
      icon: ShieldCheck,
    },
    {
      label: "Account Status",
      value: user?.is_active ? "Active Account" : "Inactive",
      subtext: user?.is_verified ? "Official Identity Verified" : "Verification Pending",
      icon: UserCheck,
    },
    {
      label: "Official Contact",
      value: user?.email || "Not specified",
      subtext: user?.phone ? `Phone: ${user.phone}` : "Phone: Not provided",
      icon: Mail,
    },
    {
      label: "Verification Queue",
      value: `${pendingVerifications.total} Pending`,
      subtext: "Across Gov, Startup & Evaluator",
      icon: AlertCircle,
    },
  ];

  return (
    <AppLayout role="admin">
      <div className="space-y-5 sm:space-y-6">
        {/* SUCCESS ALERT */}
        {successMsg && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* HEADER */}
        <MyPageHeader
          title="System Administrator Workspace"
          subtitle="Platform governance, cross-role directory access, verification queues, and system audit logs."
          roleBadge="SYSTEM ADMINISTRATOR"
          roleColor="blue"
          onRefresh={() => fetchAdminData(true)}
          isRefreshing={refreshing}
          actions={
            <button
              type="button"
              onClick={() => navigate("/admin/users")}
              className="btn-primary inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500"
            >
              <Users className="h-4 w-4" />
              <span>Manage Directory</span>
            </button>
          }
        />

        {/* PROFILE IDENTITY CARD */}
        <MyPageProfileCard
          user={user}
          roleBadgeText="SYSTEM ADMINISTRATOR"
          roleTheme="blue"
          fields={profileFields}
          tags={["Platform Governance", "Audit Controller", "User Provisioning"]}
          onEditProfile={() => setIsEditing(true)}
          editButtonText="Edit Profile"
        />

        {/* SUMMARY STATS */}
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <MyPageStatCard
            index={0}
            title="Total Registered Users"
            value={totalUsers}
            subtext="Across all 4 ecosystem roles"
            icon={Users}
            color="blue"
            onClick={() => navigate("/admin/users")}
          />
          <MyPageStatCard
            index={1}
            title="Startups Registered"
            value={totalStartups}
            subtext="Innovation enterprises on platform"
            icon={Building2}
            color="emerald"
            onClick={() => navigate("/admin/startups")}
          />
          <MyPageStatCard
            index={2}
            title="Domain Evaluators"
            value={totalEvaluators}
            subtext="Empaneled expert reviewers"
            icon={UserCheck}
            color="purple"
            onClick={() => navigate("/admin/evaluators")}
          />
          <MyPageStatCard
            index={3}
            title="Operational Pilots"
            value={totalPilots}
            subtext="Statewide sandbox trials"
            icon={Activity}
            color="amber"
            onClick={() => navigate("/admin/dashboard")}
          />
        </div>

        {/* PENDING VERIFICATION CALLOUT */}
        {pendingVerifications.total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/30"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {pendingVerifications.total} Official Verification Request(s) Pending Action
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Government: {pendingVerifications.government} · Startups: {pendingVerifications.startups} · Evaluators: {pendingVerifications.evaluators}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {pendingVerifications.startups > 0 && (
                  <button
                    type="button"
                    onClick={() => navigate("/admin/startups")}
                    className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                  >
                    Review Startups
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate("/admin/access-requests")}
                  className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-amber-50 dark:border-amber-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  Access Requests
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* AUTHORIZED ADMINISTRATIVE CONTROLS */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MyPageActionCard
            title="User Directory & Roles"
            description="Manage users, designations & department bindings"
            icon={Users}
            color="blue"
            onClick={() => navigate("/admin/users")}
          />
          <MyPageActionCard
            title="Startup DPIIT Verification"
            description="Verify incorporation, GST & DPIIT numbers"
            icon={FileCheck2}
            color="emerald"
            onClick={() => navigate("/admin/startups")}
          />
          <MyPageActionCard
            title="Evaluator Empanelment"
            description="Review qualifications & verify credentials"
            icon={UserCheck}
            color="purple"
            onClick={() => navigate("/admin/evaluators")}
          />
          <MyPageActionCard
            title="System Audit Trail"
            description="Inspect tamper-evident immutable activity logs"
            icon={History}
            color="amber"
            onClick={() => navigate("/admin/audit")}
          />
        </div>

        {/* MAIN SECTIONS: AUDIT TRAIL & SYSTEM DIRECTORIES */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* ADMINISTRATIVE SUBSYSTEMS */}
          <MyPageSection
            title="Governance Modules"
            subtitle="Platform configuration, scoring rubrics, and access workflows"
            icon={ShieldCheck}
          >
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div
                onClick={() => navigate("/admin/access-requests")}
                className="group flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <UserPlus className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Access Requests</p>
                    <p className="text-[10px] text-slate-400">Department onboarding</p>
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-600" />
              </div>

              <div
                onClick={() => navigate("/admin/criteria")}
                className="group flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ClipboardList className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Evaluation Criteria</p>
                    <p className="text-[10px] text-slate-400">Standardized scoring rubric</p>
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-600" />
              </div>

              <div
                onClick={() => navigate("/admin/templates")}
                className="group flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Challenge Templates</p>
                    <p className="text-[10px] text-slate-400">Reusable problem blueprints</p>
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-600" />
              </div>

              <div
                onClick={() => navigate("/admin/settings")}
                className="group flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="h-4 w-4 text-amber-500" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Platform Settings</p>
                    <p className="text-[10px] text-slate-400">System parameters</p>
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-600" />
              </div>
            </div>
          </MyPageSection>

          {/* AUDIT LOG PREVIEW */}
          <MyPageSection
            title="Recent Security & Governance Logs"
            subtitle="Immutable activity records across all platform nodes"
            icon={History}
            badge="Audit Trail"
            action={
              <button
                type="button"
                onClick={() => navigate("/admin/audit")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400"
              >
                <span>Full Audit Log</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            }
          >
            {auditLogs.length === 0 ? (
              <MyPageEmptyState
                title="No Recent Audit Records"
                description="Administrative actions and state transitions will appear here in real-time."
              />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {auditLogs.map((log, idx) => (
                  <div key={log.id || idx} className="py-2.5 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                        {log.action || "GOVERNANCE_EVENT"}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {log.entity_type ? `${log.entity_type} · ` : ""}
                        {log.user?.email || log.details?.email || "System"}
                      </p>
                    </div>
                    {log.created_at && (
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(log.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
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
                    Edit Administrator Profile
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Update your platform administrator display name and official phone contact.
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
                    Administrator Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    placeholder="Admin Name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Official Contact Phone
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
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Security & Privileges</p>
                  <p className="mt-0.5">Role: {user?.role || "ADMIN"}</p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Primary login email ({user?.email}) is managed via master server environment configuration.
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
