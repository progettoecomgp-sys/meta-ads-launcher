import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import ProtectedRoute from './components/ProtectedRoute';
import OnboardingGuard from './components/OnboardingGuard';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import TokenExpiryBanner from './components/TokenExpiryBanner';
import ImpersonateWrapper from './components/ImpersonateWrapper';
import FeatureGate from './components/FeatureGate';

// Core app pages — imported eagerly for instant navigation
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import History from './pages/History';
import Metrics from './pages/Metrics';
import Settings from './pages/Settings';
import Account from './pages/Account';
import AdminDashboard from './pages/AdminDashboard';
import Campaigns from './pages/Campaigns';

// Public/rare pages — lazy loaded (separate chunks)
const HomePage = lazy(() => import('./pages/HomePage'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const StatusPage = lazy(() => import('./pages/StatusPage'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Login = lazy(() => import('./pages/Login'));
const Onboarding = lazy(() => import('./pages/Onboarding'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public: marketing homepage */}
          <Route path="/" element={<HomePage />} />

          {/* Public: legal & info pages */}
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/faq" element={<FAQ />} />

          {/* Public: login page */}
          <Route path="/login" element={<Login />} />

          {/* Legacy routes redirect to login */}
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route path="/forgot-password" element={<Navigate to="/login" replace />} />
          <Route path="/reset-password" element={<Navigate to="/login" replace />} />
          <Route path="/auth/callback" element={<Navigate to="/login" replace />} />

          {/* Protected full-screen: onboarding wizard */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <AppProvider>
                  <Onboarding />
                  <Toast />
                </AppProvider>
              </ProtectedRoute>
            }
          />

          {/* Protected routes with sidebar + onboarding guard */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppProvider>
                  <OnboardingGuard>
                    <ImpersonateWrapper>
                    <div className="flex min-h-screen">
                      <Sidebar />
                      <main className="flex-1 ml-[244px] min-h-screen">
                        <TokenExpiryBanner />
                        <Routes>
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/upload" element={<Upload />} />
                          <Route path="/history" element={<History />} />
                          <Route path="/metrics" element={<Metrics />} />
                          <Route path="/campaigns" element={<FeatureGate flag="campaigns-page" fallback={<Navigate to="/dashboard" replace />}><Campaigns /></FeatureGate>} />
                          <Route path="/settings" element={<Settings />} />
                          <Route path="/billing" element={<Navigate to="/account" replace />} />
                          <Route path="/account" element={<Account />} />
                          <Route path="/admin" element={<AdminDashboard />} />
                        </Routes>
                      </main>
                      <Toast />
                    </div>
                    </ImpersonateWrapper>
                  </OnboardingGuard>
                </AppProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
