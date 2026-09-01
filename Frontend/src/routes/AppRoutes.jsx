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


      {/* =====================================================
          STARTUP
      ===================================================== */}

      <Route
        path="/startup/dashboard"
        element={<StartupDashboard />}
      />

      <Route
        path="/startup/challenges"
        element={<StartupChallenges />}
      />

      <Route
        path="/startup/challenges/:id"
        element={<StartupChallenges />}
      />

      <Route
        path="/startup/application"
        element={<StartupApplication />}
      />

      <Route
        path="/startup/application/:id"
        element={<StartupApplication />}
      />

      <Route
        path="/startup/applications"
        element={<StartupApplication />}
      />

      <Route
        path="/startup/applications/:id"
        element={<StartupApplication />}
      />

      <Route
        path="/startup/documents"
        element={<StartupDocuments />}
      />

      <Route
        path="/startup/payments"
        element={<StartupPayments />}
      />

      <Route
        path="/startup/profile"
        element={<StartupProfile />}
      />

      <Route
        path="/startup/pilot"
        element={<StartupPilot />}
      />


      {/* =====================================================
          EVALUATOR
      ===================================================== */}

      <Route
        path="/evaluator/dashboard"
        element={<EvaluatorDashboard />}
      />

      <Route
        path="/evaluator/assignments"
        element={<EvaluatorAssignments />}
      />

      <Route
        path="/evaluator/evaluations/:id"
        element={<EvaluationDetail />}
      />


      <Route
        path="/admin"
        element={<Navigate to="/admin/dashboard" replace />}
      />

      <Route
        path="/admin/dashboard"
        element={<AdminDashboard />}
      />

      <Route
        path="/admin/users"
        element={<AdminUsers />}
      />

      <Route
        path="/admin/startups"
        element={<AdminStartups />}
      />

      <Route
        path="/admin/criteria"
        element={<AdminCriteria />}
      />

      <Route
        path="/admin/templates"
        element={<AdminTemplates />}
      />

      <Route
        path="/admin/audit"
        element={<AdminAudit />}
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
          FALLBACK
      ===================================================== */}

      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />

    </Routes>
  );
}

export default AppRoutes;