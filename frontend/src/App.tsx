import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ErrorBoundary } from '@/components/utility/ErrorBoundary';
import { ProtectedRoute } from '@/components/utility/ProtectedRoute';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/nav/Footer';
import { LandingPage } from '@/pages/LandingPage';
import { SearchFormPage } from '@/pages/SearchFormPage';
import { TripResultsPage } from '@/pages/TripResultsPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PrivacyPage } from '@/pages/legal/PrivacyPage';
import { TermsPage } from '@/pages/legal/TermsPage';
import { PricingPage } from '@/pages/PricingPage';
import { DestinationsPage } from '@/pages/DestinationsPage';
import { DestinationDetailPage } from '@/pages/DestinationDetailPage';
import { CommunityPage } from '@/pages/community/CommunityPage';
import { PostPhotoPage } from '@/pages/community/PostPhotoPage';
import { SuggestGemPage } from '@/pages/community/SuggestGemPage';
import { ModeratePage } from '@/pages/community/ModeratePage';

// Pages change without a transition: Ribbon keeps motion for state, not navigation.
function AnimatedRoutes() {
  const location = useLocation();
  return (
        <Routes location={location}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/plan" element={<SearchFormPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route path="/destinations" element={<DestinationsPage />} />
          <Route path="/destinations/:slug" element={<DestinationDetailPage />} />

          <Route path="/community" element={<CommunityPage />} />

          <Route path="/trips/:tripId" element={<TripResultsPage />} />

          <Route element={<ProtectedRoute adminOnly />}>
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/community/post" element={<PostPhotoPage />} />
            <Route path="/community/suggest" element={<SuggestGemPage />} />
            <Route path="/community/moderate" element={<ModeratePage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
  );
}

function AppShell() {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink-2">
      <Header />
      <main id="main" className="flex-1">
        <AnimatedRoutes />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
