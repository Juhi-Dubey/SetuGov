import { Routes, Route, Navigate, useParams } from "react-router-dom";

function RedirectSingularPilot() {
  const { id } = useParams();
  return <Navigate to={`/government/pilots/${id}`} replace />;
}

// =====================================================
// AUTHENTICATION & PUBLIC PAGES
// =====================================================
import LandingPage from "../pages/public/LandingPage";
import Login from "../pages/auth/Login";
import StartupSignup from "../pages/auth/StartupSignup";
import VerifyEmail from "../pages/auth/VerifyEmail";
import GovernmentAccessRequestPage from "../pages/public/GovernmentAccessRequestPage";
import EvaluatorApplyPage from "../pages/public/EvaluatorApplyPage";
import RoleSelection from "../pages/auth/RoleSelection";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import RoleRoute from "../components/auth/RoleRoute";

// =====================================================
// GOVERNMENT
// =====================================================
import GovernmentDashboard from "../pages/government/GovernmentDashboard";
import GovernmentChallenges from "../pages/government/GovernmentChallenges";
import CreateChallenge from "../pages/government/CreateChallenge";
import ChallengeOverview from "../pages/government/ChallengeOverview";
import ChallengeApplications from "../pages/government/ChallengeApplications";
import ChallengeEligibility from "../pages/government/ChallengeEligibility";
import ChallengeEvaluation from "../pages/government/ChallengeEvaluation";
import ChallengeEvidence from "../pages/government/ChallengeEvidence";
import ChallengeDecision from "../pages/government/ChallengeDecision";
import ChallengePilot from "../pages/government/ChallengePilot";
import ChallengePayments from "../pages/government/ChallengePayments";
import ChallengeContract from "../pages/government/ChallengeContract";
import ChallengeAudit from "../pages/government/ChallengeAudit";
import GovernmentReports from "../pages/government/GovernmentReports";
import GovernmentEvaluators from "../pages/government/GovernmentEvaluators";
import GovernmentEvaluatorDetail from "../pages/government/GovernmentEvaluatorDetail";
import GovernmentMyPage from "../pages/government/GovernmentMyPage";

// =====================================================
// STARTUP
// =====================================================
import StartupDashboard from "../pages/startup/StartupDashboard";
import StartupChallenges from "../pages/startup/StartupChallenges";
import StartupApplication from "../pages/startup/StartupApplication";
import StartupDocuments from "../pages/startup/StartupDocuments";
import StartupPayments from "../pages/startup/StartupPayments";
import StartupProfile from "../pages/startup/StartupProfile";
import StartupRegistration from "../pages/startup/StartupRegistration";
import StartupPilot from "../pages/startup/StartupPilot";
import StartupMyPage from "../pages/startup/StartupMyPage";

// =====================================================
// EVALUATOR
// =====================================================
import EvaluatorDashboard from "../pages/evaluator/EvaluatorDashboard";
import EvaluatorAssignments from "../pages/evaluator/EvaluatorAssignments";
import EvaluatorEvaluations from "../pages/evaluator/EvaluatorEvaluations";
import EvaluationDetail from "../pages/evaluator/EvaluationDetail";
import EvaluatorMyPage from "../pages/evaluator/EvaluatorMyPage";

// =====================================================
// ADMIN
// =====================================================
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminUsers from "../pages/admin/AdminUsers";
import AdminStartups from "../pages/admin/AdminStartups";
import AdminCriteria from "../pages/admin/AdminCriteria";
import AdminTemplates from "../pages/admin/AdminTemplates";
import AdminAudit from "../pages/admin/AdminAudit";
import AdminSettings from "../pages/admin/AdminSettings";
import AdminAccessRequests from "../pages/admin/AdminAccessRequests";
import AdminEvaluators from "../pages/admin/AdminEvaluators";
import AdminMyPage from "../pages/admin/AdminMyPage";

// =====================================================
// SHARED / GENERAL
// =====================================================
import NotFound from "../pages/NotFound";
import AppLayout from "../components/layout/AppLayout";
import InviteAccept from "../pages/auth/InviteAccept";
import { useAuth } from "../context/AuthContext";

function DashboardRedirect() {
  const { user, role } = useAuth();
  const normalizedRole = String(role || user?.role || "").toUpperCase();
  const defaultDashboard =
    {
      ADMIN: "/admin/dashboard",
      GOVERNMENT: "/government/dashboard",
      STARTUP: "/startup/dashboard",
      EVALUATOR: "/evaluator/dashboard",
    }[normalizedRole] || "/role-selection";

  return <Navigate to={defaultDashboard} replace />;
}

function MyPageRedirect() {
  const { user, role } = useAuth();
  const normalizedRole = String(role || user?.role || "").toUpperCase();
  const defaultMyPage =
    {
      ADMIN: "/admin/my-page",
      GOVERNMENT: "/government/my-page",
      STARTUP: "/startup/my-page",
      EVALUATOR: "/evaluator/my-page",
    }[normalizedRole] || "/login";

  return <Navigate to={defaultMyPage} replace />;
}

function ProfileRedirect() {
  const { user, role } = useAuth();
  const normalizedRole = String(role || user?.role || "").toUpperCase();
  const defaultProfile =
    {
      ADMIN: "/admin/my-page",
      GOVERNMENT: "/government/my-page",
      STARTUP: "/startup/profile",
      EVALUATOR: "/evaluator/my-page",
    }[normalizedRole] || "/login";

  return <Navigate to={defaultProfile} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* =====================================================
          PUBLIC PAGES & AUTHENTICATION ROUTES (NO AUTH REQUIRED)
      ===================================================== */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<StartupSignup />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/government/request-access" element={<GovernmentAccessRequestPage />} />
      <Route path="/evaluator/apply" element={<EvaluatorApplyPage />} />
      <Route path="/invite/accept" element={<InviteAccept />} />
      <Route path="/government/set-password" element={<InviteAccept />} />
      <Route path="/set-password" element={<InviteAccept />} />

      {/* Role Selection (Requires Login) */}
      <Route
        path="/role-selection"
        element={
          <ProtectedRoute>
            <RoleSelection />
          </ProtectedRoute>
        }
      />

      {/* Dynamic Role-Aware Dashboard Redirection */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardRedirect />
          </ProtectedRoute>
        }
      />

      {/* Common Dynamic My Page & Profile Routes */}
      <Route
        path="/my-page"
        element={
          <ProtectedRoute>
            <MyPageRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfileRedirect />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          GOVERNMENT ROUTES (Role: GOVERNMENT, ADMIN)
      ===================================================== */}
      <Route
        path="/government"
        element={<Navigate to="/government/dashboard" replace />}
      />
      <Route
        path="/government/dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
              <GovernmentDashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/government/challenges"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
              <GovernmentChallenges />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/government/challenges/new"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
              <CreateChallenge />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/government/challenges/:id/edit"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
              <CreateChallenge />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/government/challenges/:id"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
              <ChallengeOverview />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/government/challenges/:id/overview"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
              <ChallengeOverview />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/government/challenges/:id/applications"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
              <ChallengeApplications />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/government/applications"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
              <ChallengeApplications />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/government/challenges/:id/eligibility"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
              <ChallengeEligibility />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/government/challenges/:id/evaluation"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
              <ChallengeEvaluation />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/government/challenges/:id/evidence"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
              <ChallengeEvidence />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/government/challenges/:id/decision"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
              <ChallengeDecision />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/government/challenges/:id/pilot"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
              <ChallengePilot />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/government/pilot"
        element={<Navigate to="/government/pilots" replace />}
      />
      <Route
        path="/government/pilot/:id"
        element={<RedirectSingularPilot />}
      />
      <Route
        path="/government/pilots"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
              <ChallengePilot />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/government/pilots/:id"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
              <ChallengePilot />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/government/challenges/:id/payments"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
              <ChallengePayments />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/government/payments"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
              <ChallengePayments />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/government/challenges/:id/contract"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
              <ChallengeContract />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/government/challenges/:id/audit"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
              <ChallengeAudit />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/government/audit"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
              <ChallengeAudit />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/government/startups"
        element={<Navigate to="/government/challenges" replace />}
      />
      <Route
        path="/government/evaluations"
        element={<Navigate to="/government/evaluators" replace />}
      />
      <Route
        path="/government/settings"
        element={<Navigate to="/government/dashboard" replace />}
      />
      <Route
        path="/government/reports"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
              <AppLayout role="government">
                <GovernmentReports />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/government/report"
        element={<Navigate to="/government/reports" replace />}
      />
      <Route
        path="/government/templates"
        element={<Navigate to="/government/challenges" replace />}
      />
      <Route
        path="/government/evaluators"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
              <AppLayout role="government">
                <GovernmentEvaluators />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* Dynamic evaluator detail — works for any evaluator ID, current or future */}
      <Route
        path="/government/evaluators/:evaluatorId"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
              <AppLayout role="government">
                <GovernmentEvaluatorDetail />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* Government My Page & Profile */}
      <Route
        path="/government/my-page"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
              <GovernmentMyPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/government/profile"
        element={<Navigate to="/government/my-page" replace />}
      />

      {/* =====================================================
          STARTUP ROUTES (Role: STARTUP, GOVERNMENT, ADMIN, EVALUATOR)
      ===================================================== */}
      <Route
        path="/startup"
        element={<Navigate to="/startup/dashboard" replace />}
      />
      <Route
        path="/startup/dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["STARTUP", "ADMIN"]}>
              <AppLayout role="startup">
                <StartupDashboard />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/startup/challenges"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["STARTUP", "ADMIN"]}>
              <AppLayout role="startup">
                <StartupChallenges />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/startup/challenges/:id"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["STARTUP", "ADMIN"]}>
              <AppLayout role="startup">
                <StartupChallenges />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/startup/application"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["STARTUP", "ADMIN"]}>
              <AppLayout role="startup">
                <StartupApplication />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/startup/application/:id"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["STARTUP", "ADMIN"]}>
              <AppLayout role="startup">
                <StartupApplication />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/startup/applications"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["STARTUP", "ADMIN"]}>
              <AppLayout role="startup">
                <StartupApplication />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/startup/applications/:id"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["STARTUP", "ADMIN"]}>
              <AppLayout role="startup">
                <StartupApplication />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/startup/documents"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["STARTUP", "ADMIN"]}>
              <AppLayout role="startup">
                <StartupDocuments />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/startup/payments"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["STARTUP", "ADMIN"]}>
              <AppLayout role="startup">
                <StartupPayments />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      {/* Startup My Page */}
      <Route
        path="/startup/my-page"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["STARTUP", "ADMIN"]}>
              <StartupMyPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* Startup Profile */}
      <Route
        path="/startup/profile"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["STARTUP", "ADMIN"]}>
              <AppLayout role="startup">
                <StartupProfile />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* Startup 9-Step Onboarding Registration Flow (Startup & Admin only) */}
      <Route
        path="/startup/registration"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["STARTUP", "ADMIN"]}>
              <StartupRegistration />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/startup/onboarding"
        element={<Navigate to="/startup/registration" replace />}
      />
      <Route
        path="/startup/pilot"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["STARTUP", "ADMIN"]}>
              <AppLayout role="startup">
                <StartupPilot />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/startup/pilot/:id"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["STARTUP", "ADMIN"]}>
              <AppLayout role="startup">
                <StartupPilot />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/startup/pilots"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["STARTUP", "ADMIN"]}>
              <AppLayout role="startup">
                <StartupPilot />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/startup/pilots/:id"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["STARTUP", "ADMIN"]}>
              <AppLayout role="startup">
                <StartupPilot />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          EVALUATOR ROUTES (Role: EVALUATOR, ADMIN)
      ===================================================== */}
      <Route
        path="/evaluator"
        element={<Navigate to="/evaluator/dashboard" replace />}
      />
      <Route
        path="/evaluator/dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["EVALUATOR", "ADMIN"]}>
              <AppLayout role="evaluator">
                <EvaluatorDashboard />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/evaluator/assignments"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["EVALUATOR", "ADMIN"]}>
              <AppLayout role="evaluator">
                <EvaluatorAssignments />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/evaluator/evaluation"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["EVALUATOR", "ADMIN"]}>
              <AppLayout role="evaluator">
                <EvaluatorEvaluations />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/evaluator/evaluations"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["EVALUATOR", "ADMIN"]}>
              <AppLayout role="evaluator">
                <EvaluatorEvaluations />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/evaluator/evaluation/:id"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["EVALUATOR", "ADMIN"]}>
              <AppLayout role="evaluator">
                <EvaluationDetail />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/evaluator/evaluations/:id"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["EVALUATOR", "ADMIN"]}>
              <AppLayout role="evaluator">
                <EvaluationDetail />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* Evaluator My Page & Profile */}
      <Route
        path="/evaluator/my-page"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["EVALUATOR", "ADMIN"]}>
              <EvaluatorMyPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/evaluator/profile"
        element={<Navigate to="/evaluator/my-page" replace />}
      />

      {/* =====================================================
          ADMIN ROUTES (Role: ADMIN)
      ===================================================== */}
      <Route
        path="/admin"
        element={<Navigate to="/admin/dashboard" replace />}
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN"]}>
              <AppLayout role="admin">
                <AdminDashboard />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN"]}>
              <AppLayout role="admin">
                <AdminUsers />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/startups"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN"]}>
              <AppLayout role="admin">
                <AdminStartups />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/criteria"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN"]}>
              <AppLayout role="admin">
                <AdminCriteria />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/templates"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN"]}>
              <AppLayout role="admin">
                <AdminTemplates />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN"]}>
              <AppLayout role="admin">
                <AdminAudit />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN"]}>
              <AppLayout role="admin">
                <AdminSettings />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/access-requests"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN"]}>
              <AppLayout role="admin">
                <AdminAccessRequests />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/evaluators"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN"]}>
              <AppLayout role="admin">
                <AdminEvaluators />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* Admin My Page & Profile */}
      <Route
        path="/admin/my-page"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN"]}>
              <AdminMyPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/profile"
        element={<Navigate to="/admin/my-page" replace />}
      />

      {/* =====================================================
          FALLBACK (404 NOT FOUND)
      ===================================================== */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;