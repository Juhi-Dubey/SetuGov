import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Rocket,
  Building2,
  FileCheck2,
  FileStack,
  FlaskConical,
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Award,
  Sparkles,
  FileText,
  ShieldCheck,
  Upload,
  Briefcase,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";
import MyPageHeader from "../../components/mypage/MyPageHeader";
import MyPageProfileCard from "../../components/mypage/MyPageProfileCard";
import MyPageStatCard from "../../components/mypage/MyPageStatCard";
import MyPageSection from "../../components/mypage/MyPageSection";
import MyPageActionCard from "../../components/mypage/MyPageActionCard";
import MyPageEmptyState from "../../components/mypage/MyPageEmptyState";
import { useAuth } from "../../context/AuthContext";
import {
  getMyRegistration,
  getStartupApplications,
  getStartupPilots,
} from "../../services/startupService";

export default function StartupMyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [applications, setApplications] = useState([]);
  const [pilots, setPilots] = useState([]);

  const activeStartup = user?.startups?.[0] || registration?.startup || null;
  const startupId = activeStartup?.id || user?.startup_id;

  useEffect(() => {
    fetchStartupData();
  }, [startupId]);

  const fetchStartupData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const regRes = await getMyRegistration().catch(() => null);
      const regData = regRes?.data || regRes || null;
      setRegistration(regData);

      const effectiveStartupId = startupId || regData?.startup?.id || regData?.id;

      if (effectiveStartupId) {
        const [appsRes, pilotsRes] = await Promise.all([
          getStartupApplications(effectiveStartupId).catch(() => ({ data: [] })),
          getStartupPilots(effectiveStartupId).catch(() => ({ data: [] })),
        ]);

        const rawApps = appsRes?.data?.applications || appsRes?.data || appsRes || [];
        const rawPilots = pilotsRes?.data?.pilots || pilotsRes?.data || pilotsRes || [];

        setApplications(Array.isArray(rawApps) ? rawApps : []);
        setPilots(Array.isArray(rawPilots) ? rawPilots : []);
      }
    } catch (err) {
      console.warn("Failed to load startup profile data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const companyName =
    activeStartup?.company_name || registration?.company_name || "Registered Startup";
  const dpiitNumber =
    activeStartup?.dpiit_number || registration?.dpiit_number || "Pending DPIIT";
  const domain = activeStartup?.domain || registration?.domain || "Technology & Innovation";
  const verificationStatus =
    activeStartup?.verification_status ||
    registration?.verification_status ||
    "PENDING";

  // 9-step registration completion status
  const currentStep = registration?.registration_step || 1;
  const totalSteps = 9;
  const completionPercentage = Math.min(
    100,
    Math.round(((currentStep - 1) / totalSteps) * 100)
  );

  const profileFields = [
    {
      label: "Enterprise",
      value: companyName,
      subtext: "DPIIT Recognized Startup",
      icon: Building2,
    },
    {
      label: "DPIIT Certificate",
      value: dpiitNumber,
      subtext: verificationStatus,
      icon: Award,
    },
    {
      label: "Sector / Domain",
      value: domain,
      subtext: "Primary Focus Area",
      icon: Rocket,
    },
    {
      label: "Verification Status",
      value: verificationStatus,
      subtext: "State Innovation Sandbox",
      icon: ShieldCheck,
    },
  ];

  const recentApplications = applications.slice(0, 3);
  const activePilots = pilots.slice(0, 2);
  const documentsCount =
    registration?.documents?.length ||
    registration?.startup_documents?.length ||
    0;

  return (
    <AppLayout role="startup">
      <div className="space-y-5 sm:space-y-6">
        {/* HEADER */}
        <MyPageHeader
          title="Startup Founder Workspace"
          subtitle="Enterprise identity, DPIIT verification status, challenge applications, and active pilot deployments."
          roleBadge="STARTUP ENTERPRISE"
          roleColor="emerald"
          onRefresh={() => fetchStartupData(true)}
          isRefreshing={refreshing}
          actions={
            <button
              type="button"
              onClick={() => navigate("/startup/challenges")}
              className="btn-primary inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Sparkles className="h-4 w-4" />
              <span>Explore Challenges</span>
            </button>
          }
        />

        {/* PROFILE IDENTITY CARD */}
        <MyPageProfileCard
          user={user}
          roleBadgeText="STARTUP FOUNDER"
          roleTheme="emerald"
          fields={profileFields}
          tags={[companyName, domain, dpiitNumber]}
          onEditProfile={() => navigate("/startup/profile")}
          editButtonText="Registration Form"
        />

        {/* 9-STEP ONBOARDING TRACKER BANNER */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-white p-4.5 sm:p-5 shadow-sm dark:border-emerald-900/50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 dark:bg-emerald-500">
                <FileCheck2 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    9-Step Startup Organization Registration
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      verificationStatus === "VERIFIED"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                    }`}
                  >
                    {verificationStatus === "VERIFIED"
                      ? "Verified by State"
                      : `Step ${currentStep} of ${totalSteps} (${completionPercentage}%)`}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 max-w-xl">
                  {verificationStatus === "VERIFIED"
                    ? "Your startup is fully verified and authorized for direct government procurement and sandbox pilot deployments."
                    : "Complete all 9 onboarding steps to qualify for fast-track state procurement and pilot funding."}
                </p>

                {/* PROGRESS BAR */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-2 w-48 sm:w-64 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{
                        width: verificationStatus === "VERIFIED" ? "100%" : `${completionPercentage}%`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {verificationStatus === "VERIFIED" ? "100%" : `${completionPercentage}% Completed`}
                  </span>
                </div>
              </div>
            </div>

            {/* ACTION TO 9-STEP ONBOARDING ROUTE */}
            <div className="shrink-0 pt-2 lg:pt-0">
              <button
                type="button"
                onClick={() => navigate("/startup/profile")}
                className="inline-flex h-9.5 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <span>
                  {verificationStatus === "VERIFIED"
                    ? "View Registration Profile"
                    : "Continue 9-Step Registration"}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* SUMMARY STATS */}
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <MyPageStatCard
            index={0}
            title="Applications Submitted"
            value={applications.length}
            subtext="Challenge bids in review"
            icon={ClipboardCheck}
            color="emerald"
            onClick={() => navigate("/startup/applications")}
          />
          <MyPageStatCard
            index={1}
            title="Active Pilots"
            value={pilots.length}
            subtext="Live operational trials"
            icon={FlaskConical}
            color="blue"
            onClick={() => navigate("/startup/pilots")}
          />
          <MyPageStatCard
            index={2}
            title="Compliance Documents"
            value={documentsCount}
            subtext="DPIIT, GST & Incorporation"
            icon={FileStack}
            color="purple"
            onClick={() => navigate("/startup/documents")}
          />
          <MyPageStatCard
            index={3}
            title="DPIIT Verification"
            value={verificationStatus}
            subtext={dpiitNumber || "Verification Status"}
            icon={Award}
            color={verificationStatus === "VERIFIED" ? "emerald" : "amber"}
            onClick={() => navigate("/startup/profile")}
          />
        </div>

        {/* AUTHORIZED STARTUP ACTIONS */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MyPageActionCard
            title="Discover Public Challenges"
            description="Explore open government problem statements"
            icon={Sparkles}
            color="emerald"
            onClick={() => navigate("/startup/challenges")}
          />
          <MyPageActionCard
            title="9-Step Registration Flow"
            description="Review details, sign declaration & documents"
            icon={FileCheck2}
            color="blue"
            onClick={() => navigate("/startup/profile")}
          />
          <MyPageActionCard
            title="Upload Compliance Files"
            description="Pitch decks, certifications & accounts"
            icon={Upload}
            color="purple"
            onClick={() => navigate("/startup/documents")}
          />
          <MyPageActionCard
            title="Pilot Operations Hub"
            description="Post progress updates & track milestones"
            icon={FlaskConical}
            color="amber"
            onClick={() => navigate("/startup/pilots")}
          />
        </div>

        {/* MAIN SECTIONS: APPLICATIONS & PILOTS */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* APPLICATIONS */}
          <MyPageSection
            title="Submitted Proposals"
            subtitle="Government challenges you have applied to"
            icon={ClipboardCheck}
            badge={`${applications.length} Total`}
            action={
              <button
                type="button"
                onClick={() => navigate("/startup/applications")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
              >
                <span>View All</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            }
          >
            {applications.length === 0 ? (
              <MyPageEmptyState
                title="No Applications Submitted"
                description="Browse active government challenges to submit your innovative solution."
                actionText="Explore Challenges"
                onAction={() => navigate("/startup/challenges")}
              />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {recentApplications.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => navigate(`/startup/applications/${app.id}`)}
                    className="group flex items-center justify-between py-3 cursor-pointer transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 rounded-xl px-2.5 -mx-2.5"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                        {app.challenge?.title || "Challenge Application"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {app.status || "SUBMITTED"}
                        </span>
                        {app.created_at && (
                          <span>Applied on {new Date(app.created_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-600 dark:text-slate-600 dark:group-hover:text-slate-300" />
                  </div>
                ))}
              </div>
            )}
          </MyPageSection>

          {/* PILOTS */}
          <MyPageSection
            title="Operational Pilots"
            subtitle="Active deployments under government sanction"
            icon={FlaskConical}
            badge={`${pilots.length} Sandboxes`}
            action={
              <button
                type="button"
                onClick={() => navigate("/startup/pilots")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
              >
                <span>View Pilots</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            }
          >
            {pilots.length === 0 ? (
              <MyPageEmptyState
                title="No Active Pilots"
                description="When your solution is selected, pilot deployments and milestone tracking will appear here."
              />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {activePilots.map((pilot) => (
                  <div
                    key={pilot.id}
                    onClick={() => navigate(`/startup/pilot/${pilot.id}`)}
                    className="group flex items-center justify-between py-3 cursor-pointer transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 rounded-xl px-2.5 -mx-2.5"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                        {pilot.title || pilot.challenge?.title || "Pilot Sandbox"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {pilot.status || "RUNNING"}
                        </span>
                        {pilot.location && <span>Location: {pilot.location}</span>}
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
