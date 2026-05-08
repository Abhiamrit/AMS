import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSections from './pages/admin/AdminSections';
import AdminAssignments from './pages/admin/AdminAssignments';
import AdminClients from './pages/admin/AdminClients';
import AdminAuditLog from './pages/admin/AdminAuditLog';

import StaffDashboard from './pages/staff/StaffDashboard';
import StaffClients from './pages/staff/StaffClients';
import StaffAssignments from './pages/staff/StaffAssignments';
import CreateAssignment from './pages/staff/CreateAssignment';
import EditAssignment from './pages/staff/EditAssignment';

import MasDashboard from './pages/mas/MasDashboard';
import MasReview from './pages/mas/MasReview';

import Layout from './components/Layout';

function RequireAuth({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-navy-700">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return children;
}

function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user.role === 'STAFF') return <Navigate to="/staff" replace />;
  if (user.role === 'MAS') return <Navigate to="/mas" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3500, style: { fontSize: '0.875rem' } }} />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RoleRedirect />} />

          {/* ADMIN */}
          <Route path="/admin" element={<RequireAuth roles={['ADMIN']}><Layout /></RequireAuth>}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="sections" element={<AdminSections />} />
            <Route path="assignments" element={<AdminAssignments />} />
            <Route path="clients" element={<AdminClients />} />
            <Route path="audit" element={<AdminAuditLog />} />
          </Route>

          {/* STAFF */}
          <Route path="/staff" element={<RequireAuth roles={['STAFF']}><Layout /></RequireAuth>}>
            <Route index element={<StaffDashboard />} />
            <Route path="clients" element={<StaffClients />} />
            <Route path="assignments" element={<StaffAssignments />} />
            <Route path="assignments/new" element={<CreateAssignment />} />
            <Route path="assignments/:id/edit" element={<EditAssignment />} />
          </Route>

          {/* MAS */}
          <Route path="/mas" element={<RequireAuth roles={['MAS']}><Layout /></RequireAuth>}>
            <Route index element={<MasDashboard />} />
            <Route path="assignments/:id" element={<MasReview />} />
          </Route>

          <Route path="/unauthorized" element={
            <div className="flex items-center justify-center h-screen text-red-600 text-xl font-semibold">
              403 — Access Denied
            </div>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
