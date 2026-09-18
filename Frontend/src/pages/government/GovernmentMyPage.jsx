import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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

export default function GovernmentMyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [challenges, setChallenges] = useState([]);
  const [pilots, setPilots] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetchGovernmentData();
  }, []);

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

  const departmentName = user?.department?.name || "Government Department";
  const departmentState = user?.department?.state || "State Level";
  const nodalDesignation = user?.designation || "Department Nodal Officer";

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
      subtext: departmentState,
      icon: Building2,
    },
    {
      label: "Designation",
      value: nodalDesignation,
      subtext: "Authorized Signatory",
      icon: ShieldCheck,
    },
    {
      label: "Jurisdiction",
      value: departmentState,
      subtext: "State Innovation Sandbox",
      icon: MapPin,
    },
    {
      label: "Official Contact",
      value: user?.department?.contact_email || user?.email,
      subtext: "Verified Channel",
      icon: Mail,
    },
  ];

  const recentChallenges = challenges.slice(0, 4);
  const activePilotsList = pilots.slice(0, 3);

  return (
    <AppLayout role="government">
      <div className="space-y-5 sm:space-y-6">
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
              className="btn-primary inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-900 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-800 dark:bg-blue-800 dark:text-white dark:hover:bg-blue-700"
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
          tags={[departmentName, departmentState, "Procurement Sandbox"]}
          onEditProfile={() => navigate("/government/dashboard")}
          editButtonText="Department Overview"
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
    </AppLayout>
  );
}
