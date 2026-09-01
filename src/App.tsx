import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

import { LoginPage } from '@/pages/auth/LoginPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { VerifyMFAPage } from '@/pages/auth/VerifyMFAPage';
import { MFASetupPage } from '@/pages/auth/MFASetupPage';

import { DashboardPage } from '@/pages/DashboardPage';
import { ShopsListPage } from '@/pages/shops/ShopsListPage';
import { ShopCreatePage } from '@/pages/shops/ShopCreatePage';
import { ShopDetailPage } from '@/pages/shops/ShopDetailPage';
import { DesignsListPage } from '@/pages/designs/DesignsListPage';
import { DesignCreatePage } from '@/pages/designs/DesignCreatePage';
import { DesignDetailPage } from '@/pages/designs/DesignDetailPage';
import { InvitationsListPage } from '@/pages/invitations/InvitationsListPage';
import { InvitationDetailPage } from '@/pages/invitations/InvitationDetailPage';
import { AuditLogsPage } from '@/pages/AuditLogsPage';
import { SettingsPage } from '@/pages/SettingsPage';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Auth routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-2fa" element={<VerifyMFAPage />} />
            <Route
              path="/setup-2fa"
              element={
                <ProtectedRoute>
                  <MFASetupPage />
                </ProtectedRoute>
              }
            />

            {/* Protected routes */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route
                path="/shops"
                element={
                  <ProtectedRoute adminOnly>
                    <ShopsListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shops/new"
                element={
                  <ProtectedRoute adminOnly>
                    <ShopCreatePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shops/:shopId"
                element={
                  <ProtectedRoute adminOnly>
                    <ShopDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/designs" element={<DesignsListPage />} />
              <Route
                path="/designs/new"
                element={
                  <ProtectedRoute adminOnly>
                    <DesignCreatePage />
                  </ProtectedRoute>
                }
              />
              <Route path="/designs/:designId" element={<DesignDetailPage />} />
              <Route path="/invitations" element={<InvitationsListPage />} />
              <Route path="/invitations/:invitationId" element={<InvitationDetailPage />} />
              <Route
                path="/audit-logs"
                element={
                  <ProtectedRoute adminOnly>
                    <AuditLogsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
