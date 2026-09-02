import { Routes, Route, Navigate } from "react-router-dom";

// =====================================================
// AUTHENTICATION & ROUTE GUARDS
// =====================================================
import Login from "../pages/auth/Login";
import RoleSelection from "../pages/auth/RoleSelection";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import RoleRoute from "../components/auth/RoleRoute";

// =====================================================
// GOVERNMENT
// =====================================================
import GovernmentDashboard from "../pages/government/GovernmentDashboard";
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

// =====================================================
// STARTUP
// =====================================================
import StartupDashboard from "../pages/startup/StartupDashboard";
import StartupChallenges from "../pages/startup/StartupChallenges";
import StartupApplication from "../pages/startup/StartupApplication";
import StartupDocuments from "../pages/startup/StartupDocuments";
import StartupPayments from "../pages/startup/StartupPayments";
import StartupProfile from "../pages/startup/StartupProfile";
import StartupPilot from "../pages/startup/StartupPilot";

// =====================================================
// EVALUATOR
// =====================================================
import EvaluatorDashboard from "../pages/evaluator/EvaluatorDashboard";
import EvaluatorAssignments from "../pages/evaluator/EvaluatorAssignments";
import EvaluatorEvaluations from "../pages/evaluator/EvaluatorEvaluations";
import EvaluationDetail from "../pages/evaluator/EvaluationDetail";

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

// =====================================================
// SHARED / GENERAL
// =====================================================
import NotFound from "../pages/NotFound";
import AppLayout from "../components/layout/AppLayout";

function AppRoutes() {
  return (
    <Routes>
      {/* =====================================================
          PUBLIC AUTHENTICATION ROUTES
      ===================================================== */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />

      {/* Role Selection (Requires Login) */}
      <Route
        path="/role-selection"
        element={
          <ProtectedRoute>
            <RoleSelection />
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
              <GovernmentDashboard />
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
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
              <ChallengePilot />
            </RoleRoute>
          </ProtectedRoute>
        }
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
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
              <AppLayout role="government">
                <AdminStartups />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/government/evaluations"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
              <AppLayout role="government">
                <EvaluatorEvaluations />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/government/settings"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["GOVERNMENT", "ADMIN"]}>
              <AppLayout role="government">
                <AdminSettings />
              </AppLayout>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          STARTUP ROUTES (Role: STARTUP, ADMIN)
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
              <AdminTemplates />
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

      {/* =====================================================
          FALLBACK (404 NOT FOUND)
      ===================================================== */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;