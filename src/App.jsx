import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';

// Public Pages
import PortalHub from './pages/public/PortalHub';
import Register from './pages/public/Register';
import CheckStatus from './pages/public/CheckStatus';
import TeamCreate from './pages/public/TeamCreate';
import TeamJoin from './pages/public/TeamJoin';
import QrPassVerify from './pages/public/QrPassVerify';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRegistrations from './pages/admin/AdminRegistrations';
import AdminPayments from './pages/admin/AdminPayments';
import AdminEvents from './pages/admin/AdminEvents';
import AdminCoordinators from './pages/admin/AdminCoordinators';
import AdminTeams from './pages/admin/AdminTeams';
import AdminAttendance from './pages/admin/AdminAttendance';
import AdminMainAttendance from './pages/admin/AdminMainAttendance';
import AdminFoodTokens from './pages/admin/AdminFoodTokens';
import AdminAnnouncements from './pages/admin/AdminAnnouncements';
import AdminEmails from './pages/admin/AdminEmails';
import AdminReports from './pages/admin/AdminReports';
import AdminSettings from './pages/admin/AdminSettings';

// Coordinator Pages
import CoordinatorLayout from './pages/coordinator/CoordinatorLayout';
import CoordinatorLogin from './pages/coordinator/CoordinatorLogin';
import CoordinatorDashboard from './pages/coordinator/CoordinatorDashboard';
import CoordinatorParticipants from './pages/coordinator/CoordinatorParticipants';
import CoordinatorPayments from './pages/coordinator/CoordinatorPayments';
import CoordinatorTeams from './pages/coordinator/CoordinatorTeams';
import CoordinatorAttendance from './pages/coordinator/CoordinatorAttendance';
import CoordinatorAnnouncements from './pages/coordinator/CoordinatorAnnouncements';
import CoordinatorEmails from './pages/coordinator/CoordinatorEmails';
import CoordinatorReports from './pages/coordinator/CoordinatorReports';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          {/* Public Portal Routes */}
          <Route path="/" element={<PortalHub />} />
          <Route path="/register" element={<Register />} />
          <Route path="/check" element={<CheckStatus />} />
          <Route path="/team/create" element={<TeamCreate />} />
          <Route path="/team/join" element={<TeamJoin />} />
          <Route path="/verify/qr" element={<QrPassVerify />} />
          <Route path="/verify/qr/:token" element={<QrPassVerify />} />

          {/* Legacy Static Redirections */}
          <Route path="/register2/registration/*" element={<Navigate to="/register" replace />} />
          <Route path="/register2/team/create*" element={<Navigate to="/team/create" replace />} />
          <Route path="/register2/team/join*" element={<Navigate to="/team/join" replace />} />
          <Route path="/register2/checking/*" element={<Navigate to="/check" replace />} />
          <Route path="/Admins/admin/login*" element={<Navigate to="/admin/login" replace />} />
          <Route path="/Admins/admin/*" element={<Navigate to="/admin" replace />} />
          <Route path="/CoOrd/coordinator/login*" element={<Navigate to="/coordinator/login" replace />} />
          <Route path="/CoOrd/coordinator/*" element={<Navigate to="/coordinator" replace />} />

          {/* Admin Protected Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="registrations" element={<AdminRegistrations />} />
            <Route path="participants" element={<AdminRegistrations />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="events" element={<AdminEvents />} />
            <Route path="coordinators" element={<AdminCoordinators />} />
            <Route path="teams" element={<AdminTeams />} />
            <Route path="attendance" element={<AdminAttendance />} />
            <Route path="main-attendance" element={<AdminMainAttendance />} />
            <Route path="food-tokens" element={<AdminFoodTokens />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="emails" element={<AdminEmails />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Coordinator Protected Routes */}
          <Route path="/coordinator/login" element={<CoordinatorLogin />} />
          <Route path="/coordinator" element={<CoordinatorLayout />}>
            <Route index element={<CoordinatorDashboard />} />
            <Route path="dashboard" element={<CoordinatorDashboard />} />
            <Route path="participants" element={<CoordinatorParticipants />} />
            <Route path="payments" element={<CoordinatorPayments />} />
            <Route path="teams" element={<CoordinatorTeams />} />
            <Route path="attendance" element={<CoordinatorAttendance />} />
            <Route path="announcements" element={<CoordinatorAnnouncements />} />
            <Route path="emails" element={<CoordinatorEmails />} />
            <Route path="reports" element={<CoordinatorReports />} />
          </Route>

          {/* Catch-all 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
