import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import ToursPage from './pages/ToursPage';
import TourDetailPage from './pages/TourDetailPage';
import AttractionsPage from './pages/AttractionsPage';
import BookingPage from './pages/BookingPage';
import BookingsPage from './pages/BookingsPage';
import ContactPage from './pages/ContactPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminRegisterPage from './pages/AdminRegisterPage';
import AdminCustomersPage from './pages/AdminCustomersPage';
import AdminToursPage from './pages/AdminToursPage';
import AdminTripsPage from './pages/AdminTripsPage';
import AdminBookingsPage from './pages/AdminBookingsPage';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import AdminHomeEditorPage from './pages/AdminHomeEditorPage';
import AdminReviewsPage from './pages/AdminReviewsPage';
import AdminAttractionsPage from './pages/AdminAttractionsPage';
import AdminTipsPage from './pages/AdminTipsPage';
import AdminMessagesPage from './pages/AdminMessagesPage';
import AdminTravelPage from './pages/AdminTravelPage';
import AdminWorkSpacePage from './pages/AdminWorkSpacePage';
import AdminTourPlanPage from './pages/AdminTourPlanPage';
import AdminPricingPage from './pages/AdminPricingPage';
import ViewWorkspacePage from './pages/ViewWorkspacePage';
import ViewWorkspaceListPage from './pages/ViewWorkspaceListPage';
import TripsPage from './pages/TripsPage';
import ProfilePage from './pages/ProfilePage';
import { VisitorTracker } from './components/VisitorTracker';

export default function App() {
  return (
    <div className="app-layout">
      <VisitorTracker />
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tour/:id" element={<TourDetailPage />} />
          <Route path="/tours/:category" element={<ToursPage />} />
          <Route path="/tours" element={<ToursPage />} />
          <Route path="/attractions" element={<AttractionsPage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/booking/:tourId" element={<BookingPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/trips" element={<TripsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/settings" element={<ProfilePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/register" element={<AdminRegisterPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/customers" element={<AdminCustomersPage />} />
          <Route path="/admin/tours" element={<AdminToursPage />} />
          <Route path="/admin/trips" element={<AdminTripsPage />} />
          <Route path="/admin/bookings" element={<AdminBookingsPage />} />
          <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
          <Route path="/admin/home-editor" element={<AdminHomeEditorPage />} />
          <Route path="/admin/reviews" element={<AdminReviewsPage />} />
          <Route path="/admin/attractions" element={<AdminAttractionsPage />} />
          <Route path="/admin/messages" element={<AdminMessagesPage />} />
          <Route path="/admin/tips" element={<AdminTipsPage />} />
          <Route path="/admin/travel" element={<AdminTravelPage />} />
          <Route path="/admin/work-space" element={<AdminWorkSpacePage />} />
          <Route path="/admin/work-space/tour-plan/:id" element={<AdminTourPlanPage />} />
          <Route path="/admin/work-space/pricing/:id" element={<AdminPricingPage />} />
          <Route path="/view-workspace" element={<ViewWorkspaceListPage />} />
          <Route path="/view-workspace/:id" element={<ViewWorkspacePage />} />
        </Routes>
      </main>
    </div>
  );
}
