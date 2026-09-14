import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './components/Toast';
import { Layout, Logo } from './components/Layout';
import { ListSkeleton, Spinner } from './components/ui';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { BirthdaysPage } from './pages/BirthdaysPage';
import { FinesPage } from './pages/FinesPage';
import { RankingsPage } from './pages/RankingsPage';
import { RulesPage } from './pages/RulesPage';
import { TeamPage } from './pages/TeamPage';
import { MemberPage } from './pages/MemberPage';
import { DinnersPage } from './pages/DinnersPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Admin screens are only downloaded by the admin profile.
const AssignFinePage = lazy(() => import('./pages/AssignFinePage'));
const AdminPage = lazy(() => import('./pages/admin/AdminPage'));
const MembersAdminPage = lazy(() => import('./pages/admin/MembersAdminPage'));
const MemberFormPage = lazy(() => import('./pages/admin/MemberFormPage'));
const RulesAdminPage = lazy(() => import('./pages/admin/RulesAdminPage'));
const AwardsAdminPage = lazy(() => import('./pages/admin/AwardsAdminPage'));
const StylishAdminPage = lazy(() => import('./pages/admin/StylishAdminPage'));
const DinnerAdminPage = lazy(() => import('./pages/admin/DinnerAdminPage'));
const HistoryPage = lazy(() => import('./pages/admin/HistoryPage'));
const BackupPage = lazy(() => import('./pages/admin/BackupPage'));

function Splash() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4" role="status">
      <Logo className="h-20 w-20" />
      <Spinner className="h-6 w-6 text-link" />
      <span className="sr-only">{t('common:states.loading')}</span>
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Splash />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return <Suspense fallback={<ListSkeleton />}>{children}</Suspense>;
}

function LoginRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Splash />;
  if (session) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from !== '/login' ? from : '/'} replace />;
  }
  return <LoginPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route
              element={
                <RequireAuth>
                  <Layout />
                </RequireAuth>
              }
            >
              <Route index element={<HomePage />} />
              <Route path="birthdays" element={<BirthdaysPage />} />
              <Route path="fines" element={<FinesPage />} />
              <Route path="fines/new" element={<RequireAdmin><AssignFinePage /></RequireAdmin>} />
              <Route path="rankings" element={<RankingsPage />} />
              <Route path="rules" element={<RulesPage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="team/:memberId" element={<MemberPage />} />
              <Route path="dinners" element={<DinnersPage />} />
              <Route path="admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
              <Route path="admin/members" element={<RequireAdmin><MembersAdminPage /></RequireAdmin>} />
              <Route path="admin/members/new" element={<RequireAdmin><MemberFormPage /></RequireAdmin>} />
              <Route path="admin/members/:memberId" element={<RequireAdmin><MemberFormPage /></RequireAdmin>} />
              <Route path="admin/rules" element={<RequireAdmin><RulesAdminPage /></RequireAdmin>} />
              <Route path="admin/awards" element={<RequireAdmin><AwardsAdminPage /></RequireAdmin>} />
              <Route path="admin/stylish" element={<RequireAdmin><StylishAdminPage /></RequireAdmin>} />
              <Route path="admin/dinner" element={<RequireAdmin><DinnerAdminPage /></RequireAdmin>} />
              <Route path="admin/history" element={<RequireAdmin><HistoryPage /></RequireAdmin>} />
              <Route path="admin/backup" element={<RequireAdmin><BackupPage /></RequireAdmin>} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
