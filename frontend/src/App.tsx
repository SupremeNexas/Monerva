import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import { Layout } from './components/Layout/Layout';
import { ToastProvider } from './components/UI/Toast';
import { SmoothScroll } from './components/UI/SmoothScroll';
import { initAnalytics } from './services/analytics';
import { useAnalyticsPageTracking } from './hooks/useAnalyticsPageTracking';

function RouteTracker() {
  useAnalyticsPageTracking();
  return null;
}

// Lazy-load all page components — each becomes its own JS chunk at build time
const LandingPage       = React.lazy(() => import('./pages/LandingPage'));
const AuthPage          = React.lazy(() => import('./pages/AuthPage'));
const DashboardPage     = React.lazy(() => import('./pages/DashboardPage'));
const IncomePage        = React.lazy(() => import('./pages/IncomePage'));
const TransfersPage     = React.lazy(() => import('./pages/TransfersPage'));
const ExpensesPage      = React.lazy(() => import('./pages/ExpensesPage'));
const CategoriesPage    = React.lazy(() => import('./pages/CategoriesPage'));
const BudgetsPage       = React.lazy(() => import('./pages/BudgetsPage'));
const AnalyticsPage     = React.lazy(() => import('./pages/AnalyticsPage'));
const SubscriptionsPage = React.lazy(() => import('./pages/SubscriptionsPage'));
const CreditCardsPage   = React.lazy(() => import('./pages/CreditCardsPage'));
const BillsPage         = React.lazy(() => import('./pages/BillsPage'));
const GroupsPage        = React.lazy(() => import('./pages/GroupsPage'));
const FriendsPage       = React.lazy(() => import('./pages/FriendsPage'));
const GoalsPage         = React.lazy(() => import('./pages/GoalsPage'));
const DocumentsPage     = React.lazy(() => import('./pages/DocumentsPage'));
const CopilotPage       = React.lazy(() => import('./pages/CopilotPage'));
const AIAssistantPage   = React.lazy(() => import('./pages/AIAssistantPage'));
const WorkspaceSettings = React.lazy(() => import('./pages/WorkspaceSettings'));
const ProfileSetupPage  = React.lazy(() => import('./pages/ProfileSetupPage'));
const ProfilePage       = React.lazy(() => import('./pages/ProfilePage'));
const Nexova404Page     = React.lazy(() => import('./pages/Nexova404Page'));
const ThankYouPage      = React.lazy(() => import('./pages/ThankYouPage'));
const PrivacyPage       = React.lazy(() => import('./pages/PrivacyPage'));
const TermsPage         = React.lazy(() => import('./pages/TermsPage'));
const AIDisclaimerPage  = React.lazy(() => import('./pages/AIDisclaimerPage'));
const AcceptableUsePage = React.lazy(() => import('./pages/AcceptableUsePage'));
const CookiePage        = React.lazy(() => import('./pages/CookiePage'));

/** Full-screen spinner shown while a lazy page chunk loads */
function PageLoader() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-[#0C0C0C]">
      <div className="animate-pulse text-sm text-gray-500 font-medium">Loading…</div>
    </div>
  );
}

const OnboardingProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, authLoading } = useAuthStore();

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-[#0C0C0C]">
        <div className="animate-pulse text-sm text-gray-500 font-medium">Loading Workspace...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" />;

  // If onboarding is already finished, go straight to dashboard
  if (user.onboardingComplete) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, authLoading } = useAuthStore();

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-[#0C0C0C]">
        <div className="animate-pulse text-sm text-gray-500 font-medium">Loading Workspace...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" />;

  // Force onboarding setup first
  if (!user.onboardingComplete) {
    return <Navigate to="/profile-setup" replace />;
  }

  return <Layout>{children}</Layout>;
};

function AppRoutes() {
  const { authLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-[#0C0C0C]">
        <div className="animate-pulse text-sm text-gray-500 font-medium">Initializing Finance Workspace...</div>
      </div>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* SaaS Landing Page is public at root */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth page */}
        <Route path="/auth" element={<AuthPage />} />

        {/* First-Time Profile Onboarding */}
        <Route path="/profile-setup" element={
          <OnboardingProtectedRoute>
            <ProfileSetupPage />
          </OnboardingProtectedRoute>
        } />

        {/* Protected Dashboard and sub-views */}
        <Route path="/dashboard"          element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/income"             element={<ProtectedRoute><IncomePage /></ProtectedRoute>} />
        <Route path="/transfers"          element={<ProtectedRoute><TransfersPage /></ProtectedRoute>} />
        <Route path="/expenses"           element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
        <Route path="/categories"         element={<ProtectedRoute><CategoriesPage /></ProtectedRoute>} />
        <Route path="/budgets"            element={<ProtectedRoute><BudgetsPage /></ProtectedRoute>} />
        <Route path="/analytics"          element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/subscriptions"      element={<ProtectedRoute><SubscriptionsPage /></ProtectedRoute>} />
        <Route path="/credit-cards"       element={<ProtectedRoute><CreditCardsPage /></ProtectedRoute>} />
        <Route path="/bills"              element={<ProtectedRoute><BillsPage /></ProtectedRoute>} />
        <Route path="/groups"             element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
        <Route path="/friends"            element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
        <Route path="/goals"              element={<ProtectedRoute><GoalsPage /></ProtectedRoute>} />
        <Route path="/documents"          element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />
        <Route path="/copilot"            element={<ProtectedRoute><CopilotPage /></ProtectedRoute>} />
        <Route path="/assistant"          element={<ProtectedRoute><AIAssistantPage /></ProtectedRoute>} />
        <Route path="/workspace-settings" element={<ProtectedRoute><WorkspaceSettings /></ProtectedRoute>} />
        <Route path="/profile"            element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

        {/* Privacy & Legal */}
        <Route path="/privacy"            element={<PrivacyPage />} />
        <Route path="/terms"              element={<TermsPage />} />
        <Route path="/ai-disclaimer"      element={<AIDisclaimerPage />} />
        <Route path="/acceptable-use"     element={<AcceptableUsePage />} />
        <Route path="/cookies"            element={<CookiePage />} />
        <Route path="/thank-you"          element={<ThankYouPage />} />

        {/* 404 */}
        <Route path="/404" element={<Nexova404Page />} />
        <Route path="*"    element={<Nexova404Page />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <Router>
      <RouteTracker />
      <ToastProvider>
        <SmoothScroll>
          <AppRoutes />
        </SmoothScroll>
      </ToastProvider>
    </Router>
  );
}

export default App;
