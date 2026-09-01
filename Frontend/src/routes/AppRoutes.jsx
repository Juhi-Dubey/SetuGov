import { Routes, Route, Navigate } from "react-router-dom";

// =====================================================
// AUTHENTICATION
// =====================================================

import Login from "../pages/auth/Login";
import RoleSelection from "../pages/auth/RoleSelection";

// =====================================================
// GOVERNMENT
// =====================================================

import GovernmentDashboard from "../pages/government/GovernmentDashboard";
import CreateChallenge from "../pages/government/CreateChallenge";
import ChallengeAudit from "../pages/government/ChallengeAudit";
import ChallengePilot from "../pages/government/ChallengePilot";

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
import NotFound from "../pages/NotFound";

import AppLayout from "../components/layout/AppLayout";

function AppRoutes() {
  return (
    <Routes>

      {/* =====================================================
          AUTHENTICATION
      ===================================================== */}

      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/role-selection"
        element={<RoleSelection />}
      />


      {/* =====================================================
          GOVERNMENT
      ===================================================== */}

      <Route
        path="/government/dashboard"
        element={<GovernmentDashboard />}
      />

      <Route
        path="/government/challenges/new"
        element={<CreateChallenge />}
      />

        <Route
        path="/government/audit"
        element={<ChallengeAudit />}
      />
    
        <Route  
        path="/government/pilot"
        element={<ChallengePilot />}
      />

        <Route  
        path="/government/pilots"
        element={<ChallengePilot />}
      />


      {/* =====================================================
          STARTUP
      ===================================================== */}

      <Route
        path="/startup/dashboard"
        element={
          <AppLayout role="startup">
            <StartupDashboard />
          </AppLayout>
        }
      />

      <Route
        path="/startup/challenges"
        element={
          <AppLayout role="startup">
            <StartupChallenges />
          </AppLayout>
        }
      />

      <Route
        path="/startup/challenges/:id"
        element={
          <AppLayout role="startup">
            <StartupChallenges />
          </AppLayout>
        }
      />

      <Route
        path="/startup/application"
        element={
          <AppLayout role="startup">
            <StartupApplication />
          </AppLayout>
        }
      />

      <Route
        path="/startup/application/:id"
        element={
          <AppLayout role="startup">
            <StartupApplication />
          </AppLayout>
        }
      />

      <Route
        path="/startup/applications"
        element={
          <AppLayout role="startup">
            <StartupApplication />
          </AppLayout>
        }
      />

      <Route
        path="/startup/applications/:id"
        element={
          <AppLayout role="startup">
            <StartupApplication />
          </AppLayout>
        }
      />

      <Route
        path="/startup/documents"
        element={
          <AppLayout role="startup">
            <StartupDocuments />
          </AppLayout>
        }
      />

      <Route
        path="/startup/payments"
        element={
          <AppLayout role="startup">
            <StartupPayments />
          </AppLayout>
        }
      />

      <Route
        path="/startup/profile"
        element={
          <AppLayout role="startup">
            <StartupProfile />
          </AppLayout>
        }
      />

      <Route
        path="/startup/pilot"
        element={
          <AppLayout role="startup">
            <StartupPilot />
          </AppLayout>
        }
      />

      <Route
        path="/startup/pilots"
        element={
          <AppLayout role="startup">
            <StartupPilot />
          </AppLayout>
        }
      />


      {/* =====================================================
          EVALUATOR
      ===================================================== */}

      <Route
        path="/evaluator/dashboard"
        element={
          <AppLayout role="evaluator">
            <EvaluatorDashboard />
          </AppLayout>
        }
      />

      <Route
        path="/evaluator/assignments"
        element={
          <AppLayout role="evaluator">
            <EvaluatorAssignments />
          </AppLayout>
        }
      />

      <Route
        path="/evaluator/evaluation"
        element={
          <AppLayout role="evaluator">
            <EvaluatorEvaluations />
          </AppLayout>
        }
      />

      <Route
        path="/evaluator/evaluations"
        element={
          <AppLayout role="evaluator">
            <EvaluatorEvaluations />
          </AppLayout>
        }
      />

      <Route
        path="/evaluator/evaluation/:id"
        element={
          <AppLayout role="evaluator">
            <EvaluationDetail />
          </AppLayout>
        }
      />

      <Route
        path="/evaluator/evaluations/:id"
        element={
          <AppLayout role="evaluator">
            <EvaluationDetail />
          </AppLayout>
        }
      />


      {/* =====================================================
          ADMIN
      ===================================================== */}

      <Route
        path="/admin"
        element={<Navigate to="/admin/dashboard" replace />}
      />

      <Route
        path="/admin/dashboard"
        element={
          <AppLayout role="admin">
            <AdminDashboard />
          </AppLayout>
        }
      />

      <Route
        path="/admin/users"
        element={
          <AppLayout role="admin">
            <AdminUsers />
          </AppLayout>
        }
      />

      <Route
        path="/admin/startups"
        element={
          <AppLayout role="admin">
            <AdminStartups />
          </AppLayout>
        }
      />

      <Route
        path="/admin/criteria"
        element={
          <AppLayout role="admin">
            <AdminCriteria />
          </AppLayout>
        }
      />

      <Route
        path="/admin/templates"
        element={
          <AppLayout role="admin">
            <AdminTemplates />
          </AppLayout>
        }
      />

      <Route
        path="/admin/audit"
        element={
          <AppLayout role="admin">
            <AdminAudit />
          </AppLayout>
        }
      />

      <Route
        path="/admin/settings"
        element={
          <AppLayout role="admin">
            <AdminSettings />
          </AppLayout>
        }
      />

      <Route
        path="/admin/seetings"
        element={<Navigate to="/admin/settings" replace />}
      />

      <Route
        path="/government/settings"
        element={
          <AppLayout role="government">
            <AdminSettings />
          </AppLayout>
        }
      />

      <Route
        path="/startup"
        element={<Navigate to="/startup/dashboard" replace />}
      />

      <Route
        path="/government"
        element={<Navigate to="/government/dashboard" replace />}
      />

      <Route
        path="/evaluator"
        element={<Navigate to="/evaluator/dashboard" replace />}
      />


      {/* =====================================================
          FALLBACK (404 NOT FOUND)
      ===================================================== */}

      <Route
        path="*"
        element={<NotFound />}
      />

    </Routes>
  );
}

export default AppRoutes;