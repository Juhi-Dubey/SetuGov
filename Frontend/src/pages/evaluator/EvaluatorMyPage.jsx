import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  UserCheck,
  ClipboardCheck,
  FileText,
  Clock,
  CheckCircle2,
  Award,
  Building,
  GraduationCap,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  BookOpen,
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
  getMyAssignments,
  getOpenChallengesForEvaluator,
} from "../../services/evaluatorService";

export default function EvaluatorMyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [openChallenges, setOpenChallenges] = useState([]);

  useEffect(() => {
    fetchEvaluatorData();
  }, []);

  const fetchEvaluatorData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [assignmentsRes, challengesRes] = await Promise.all([
        getMyAssignments().catch(() => ({ data: [] })),
        getOpenChallengesForEvaluator().catch(() => ({ data: [] })),
      ]);

      const rawAssignments =
        assignmentsRes?.data?.assignments ||
        assignmentsRes?.assignments ||
        (Array.isArray(assignmentsRes?.data) ? assignmentsRes.data : []) ||
        [];

      const rawChallenges =
        challengesRes?.data?.challenges ||
        challengesRes?.challenges ||
        (Array.isArray(challengesRes?.data) ? challengesRes.data : []) ||
        [];

      setAssignments(Array.isArray(rawAssignments) ? rawAssignments : []);
      setOpenChallenges(Array.isArray(rawChallenges) ? rawChallenges : []);
    } catch (err) {
      console.warn("Failed to load evaluator profile data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const evalProfile = user?.evaluator_profile || {};
  const organization = evalProfile.organization || "Independent Domain Expert";
  const designation = evalProfile.designation || user?.designation || "Technical Evaluator";
  const expertise = Array.isArray(evalProfile.domain_expertise)
    ? evalProfile.domain_expertise
    : typeof evalProfile.domain_expertise === "string"
    ? evalProfile.domain_expertise.split(",").map((s) => s.trim())
    : ["Healthcare Systems", "Public Policy", "AI & Evaluation"];

  const pendingAssignments = assignments.filter(
    (a) => a.status === "ASSIGNED" || a.status === "IN_PROGRESS" || a.status === "PENDING"
  );
  const completedAssignments = assignments.filter(
    (a) => a.status === "COMPLETED" || a.status === "SUBMITTED"
  );

  const profileFields = [
    {
      label: "Affiliated Institution",
      value: organization,
      subtext: "Accredited Evaluation Body",
      icon: Building,
    },
    {
      label: "Academic / Technical Role",
      value: designation,
      subtext: "Empaneled Reviewer",
      icon: GraduationCap,
    },
    {
      label: "Verification Status",
      value: evalProfile.verification_status || (user?.is_verified ? "VERIFIED" : "ACTIVE"),
      subtext: "State Technical Panel",
      icon: ShieldCheck,
    },
    {
      label: "Assigned Queue",
      value: `${assignments.length} Applications`,
      subtext: `${pendingAssignments.length} Pending Review`,
      icon: ClipboardCheck,
    },
  ];

  return (
    <AppLayout role="evaluator">
      <div className="space-y-5 sm:space-y-6">
        {/* HEADER */}
        <MyPageHeader
          title="Technical Evaluator Workspace"
          subtitle="Expert credentials, assigned application scorecards, pending scoring sheets, and evaluation track record."
          roleBadge="EMPAtools / EVALUATOR"
          roleColor="purple"
          onRefresh={() => fetchEvaluatorData(true)}
          isRefreshing={refreshing}
          actions={
            <button
              type="button"
              onClick={() => navigate("/evaluator/assignments")}
              className="btn-primary inline-flex h-9 items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-purple-700"
            >
              <ClipboardCheck className="h-4 w-4" />
              <span>Review Assignments</span>
            </button>
          }
        />

        {/* PROFILE IDENTITY CARD */}
        <MyPageProfileCard
          user={user}
          roleBadgeText="TECHNICAL EVALUATOR"
          roleTheme="purple"
          fields={profileFields}
          tags={expertise}
          onEditProfile={() => navigate("/evaluator/assignments")}
          editButtonText="Review Assignments"
        />

        {/* SUMMARY STATS */}
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <MyPageStatCard
            index={0}
            title="Total Assigned Evaluations"
            value={assignments.length}
            subtext="Applications routed to panel"
            icon={ClipboardCheck}
            color="purple"
            onClick={() => navigate("/evaluator/assignments")}
          />
          <MyPageStatCard
            index={1}
            title="Pending Scorecards"
            value={pendingAssignments.length}
            subtext={pendingAssignments.length > 0 ? "Awaiting your review & scoring" : "All reviews completed"}
            icon={Clock}
            color={pendingAssignments.length > 0 ? "amber" : "emerald"}
            onClick={() => navigate("/evaluator/assignments")}
          />
          <MyPageStatCard
            index={2}
            title="Completed Evaluations"
            value={completedAssignments.length}
            subtext="Submitted scores & feedback"
            icon={CheckCircle2}
            color="emerald"
            onClick={() => navigate("/evaluator/evaluations")}
          />
          <MyPageStatCard
            index={3}
            title="Open Challenge Calls"
            value={openChallenges.length}
            subtext="Challenges seeking expert review"
            icon={Sparkles}
            color="blue"
            onClick={() => navigate("/evaluator/assignments")}
          />
        </div>

        {/* AUTHORIZED EVALUATOR ACTIONS */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MyPageActionCard
            title="Open Assignment Queue"
            description="Evaluate assigned proposals & submit scores"
            icon={ClipboardCheck}
            color="purple"
            onClick={() => navigate("/evaluator/assignments")}
          />
          <MyPageActionCard
            title="Evaluation History"
            description="View past scorecards and recommendations"
            icon={FileText}
            color="blue"
            onClick={() => navigate("/evaluator/evaluations")}
          />
          <MyPageActionCard
            title="Browse Open Calls"
            description="Apply to evaluate upcoming public challenges"
            icon={BookOpen}
            color="emerald"
            onClick={() => navigate("/evaluator/dashboard")}
          />
          <MyPageActionCard
            title="Technical Standards"
            description="Review state evaluation criteria & rubric"
            icon={ShieldCheck}
            color="amber"
            onClick={() => navigate("/evaluator/dashboard")}
          />
        </div>

        {/* MAIN SECTIONS: ASSIGNMENTS & OPEN CALLS */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* PENDING / ASSIGNED EVALUATIONS */}
          <MyPageSection
            title="Assigned Applications Queue"
            subtitle="Startup bids currently allocated for your expert assessment"
            icon={ClipboardCheck}
            badge={`${assignments.length} Assigned`}
            action={
              <button
                type="button"
                onClick={() => navigate("/evaluator/assignments")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400"
              >
                <span>View All</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            }
          >
            {assignments.length === 0 ? (
              <MyPageEmptyState
                title="No Pending Assignments"
                description="Government nodal departments will assign innovation proposals matching your domain expertise."
              />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {assignments.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/evaluator/assignments`)}
                    className="group flex items-center justify-between py-3 cursor-pointer transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 rounded-xl px-2.5 -mx-2.5"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400">
                        {item.application?.startup?.company_name ||
                          item.application?.title ||
                          "Startup Proposal"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span
                          className={`rounded-md px-1.5 py-0.5 font-medium ${
                            item.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                          }`}
                        >
                          {item.status || "ASSIGNED"}
                        </span>
                        {item.application?.challenge?.title && (
                          <span className="truncate max-w-[200px]">
                            {item.application.challenge.title}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-600 dark:text-slate-600 dark:group-hover:text-slate-300" />
                  </div>
                ))}
              </div>
            )}
          </MyPageSection>

          {/* COMPLETED REVIEWS OR OPEN CALLS */}
          <MyPageSection
            title="Available Challenge Calls"
            subtitle="Government innovation challenges seeking expert reviewers"
            icon={Sparkles}
            badge={`${openChallenges.length} Calls`}
            action={
              <button
                type="button"
                onClick={() => navigate("/evaluator/dashboard")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400"
              >
                <span>View Dashboard</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            }
          >
            {openChallenges.length === 0 ? (
              <MyPageEmptyState
                title="No Open Calls"
                description="There are currently no additional open challenges requesting evaluators."
              />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {openChallenges.slice(0, 4).map((ch) => (
                  <div
                    key={ch.id}
                    onClick={() => navigate("/evaluator/dashboard")}
                    className="group flex items-center justify-between py-3 cursor-pointer transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 rounded-xl px-2.5 -mx-2.5"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400">
                        {ch.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        {ch.department?.name && (
                          <span className="font-medium text-slate-600 dark:text-slate-300">
                            {ch.department.name}
                          </span>
                        )}
                        {ch.stage && <span>· {ch.stage}</span>}
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
