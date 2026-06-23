import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider } from '@/context/AuthContext';
import { ErrorBoundary } from '@/components/utility/ErrorBoundary';
import { ProtectedRoute } from '@/components/utility/ProtectedRoute';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/nav/Footer';
import { LandingPage } from '@/pages/LandingPage';
import { SearchFormPage } from '@/pages/SearchFormPage';
import { TripResultsPage } from '@/pages/TripResultsPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DayDetailPage } from '@/pages/DayDetailPage';
import { HotelOptionsPage } from '@/pages/HotelOptionsPage';
import { RestaurantOptionsPage } from '@/pages/RestaurantOptionsPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PricingPage } from '@/pages/PricingPage';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
      >
        <Routes location={location}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/plan" element={<SearchFormPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route path="/trips/:tripId" element={<TripResultsPage />} />
          <Route path="/trips/:tripId/days/:dayNumber" element={<DayDetailPage />} />
          <Route path="/trips/:tripId/hotels" element={<HotelOptionsPage />} />
          <Route path="/trips/:tripId/restaurants" element={<RestaurantOptionsPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <div className="flex min-h-screen flex-col">
            <Header />

            <main className="flex-1">
              <AnimatedRoutes />
            </main>

            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
