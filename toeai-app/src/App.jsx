import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { RefreshListProvider } from './contexts/RefreshListContext'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import StatsPage from './pages/StatsPage'
import StrategyPage from './pages/StrategyPage'
import SettingsPage from './pages/SettingsPage'
import ProgramPage from './pages/ProgramPage'
import DiagnosticPage from './pages/DiagnosticPage'
import DashboardPage from './pages/DashboardPage'
import WeekPage from './pages/WeekPage'
import ReportPage from './pages/ReportPage'
import UpgradePage from './pages/UpgradePage'
import PaymentSuccessPage from './pages/PaymentSuccessPage'
import PaymentFailPage from './pages/PaymentFailPage'
import LandingPage from './pages/LandingPage'
import LandingDetailPage from './pages/LandingDetailPage'
import ReviewsPage from './pages/ReviewsPage'
import AdminPage from './pages/AdminPage'
import AdminLayout from './pages/AdminLayout'
import AdminReviewPanel from './components/AdminReviewPanel'
import AdminKpiDashboard from './pages/AdminKpiDashboard'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RefreshListProvider>
        <Routes>
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/900-jump" element={<LandingDetailPage />} />
          <Route path="/admin" element={<AdminPage />}>
            <Route element={<AdminLayout />}>
              <Route index element={<AdminReviewPanel />} />
              <Route path="reviews" element={<AdminReviewPanel />} />
              <Route path="kpi" element={<AdminKpiDashboard />} />
            </Route>
          </Route>
          <Route path="/payment/success" element={<PaymentSuccessPage />} />
          <Route path="/payment/fail" element={<PaymentFailPage />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="reviews" element={<ReviewsPage />} />
            <Route path="week/:weekNumber" element={<WeekPage />} />
            <Route path="report/:weekNumber" element={<ReportPage />} />
            <Route path="upgrade" element={<UpgradePage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="strategy" element={<StrategyPage />} />
            <Route path="program" element={<ProgramPage />} />
            <Route path="diagnostic" element={<DiagnosticPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        </RefreshListProvider>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
