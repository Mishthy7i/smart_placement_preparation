import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import PracticePage from "./pages/PracticePage";
import TestsPage from "./pages/TestsPage";
import MockTestPage from "./pages/MockTestPage";
import TestResultPage from "./pages/TestResultPage";
import ResumePage from "./pages/ResumePage";
import CodingProfilesPage from "./pages/CodingProfilesPage";
import CoachPage from "./pages/CoachPage";
import RecommendationsPage from "./pages/RecommendationsPage";
import TestHistoryPage from "./pages/TestHistoryPage";
import PerformancePage from "./pages/PerformancePage";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("token");

  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/practice/:topicId"
        element={
          <ProtectedRoute>
            <PracticePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tests"
        element={
          <ProtectedRoute>
            <TestsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tests/:testId"
        element={
          <ProtectedRoute>
            <MockTestPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tests/:testId/result"
        element={<ProtectedRoute><TestResultPage /></ProtectedRoute>}
      />
      <Route
        path="/resume"
        element={
          <ProtectedRoute>
            <ResumePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coding-profiles"
        element={
          <ProtectedRoute>
            <CodingProfilesPage />
          </ProtectedRoute>
        }
      />
      <Route path="/coach" element={<ProtectedRoute><CoachPage /></ProtectedRoute>} />
      <Route path="/recommendations" element={<ProtectedRoute><RecommendationsPage /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><TestHistoryPage /></ProtectedRoute>} />
      <Route path="/performance" element={<ProtectedRoute><PerformancePage /></ProtectedRoute>} />
      <Route path="/dashboard/performance" element={<ProtectedRoute><PerformancePage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
