import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { RefreshListProvider } from './contexts/RefreshListContext'
import { getSubscription } from './services/subscription'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import StatsPage from './pages/StatsPage'
import StrategyPage from './pages/StrategyPage'
import SettingsPage from './pages/SettingsPage'
import ProgramPage from './pages/ProgramPage'
import DiagnosticPage from './pages/DiagnosticPage'
import DashboardPage from './pages/DashboardPage'
import WeekPage from './pages/WeekPage'
import WrongNoteDetailPage from './pages/WrongNoteDetailPage'
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
import TermsPage from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'
import RefundPolicyPage from './pages/RefundPolicyPage'
import ContactPage from './pages/ContactPage'
import FaqPage from './pages/FaqPage'
import AboutPage from './pages/AboutPage'

/** "/" 진입 분기: 비로그인 → 랜딩, 로그인(trial/paid) → 앱 홈 */
function HomeOrLanding() {
  const { user, loading: authLoading } = useAuth()

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-gray-400 text-sm">로딩 중...</span>
      </div>
    )
  }

  if (!user) return <Navigate to="/landing" replace />
  return <HomePage />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RefreshListProvider>
        <Routes>
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/900-jump" element={<LandingDetailPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/refund-policy" element={<RefundPolicyPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/admin" element={<AdminPage />}>
            <Route element={<AdminLayout />}>
              <Route index element={<AdminReviewPanel />} />
              <Route path="reviews" element={<AdminReviewPanel />} />
              <Route path="kpi" element={<AdminKpiDashboard />} />
            </Route>
          </Route>
          <Route path="/diagnostic" element={<DiagnosticPage />} />
          <Route path="/payment/success" element={<PaymentSuccessPage />} />
          <Route path="/payment/fail" element={<PaymentFailPage />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<HomeOrLanding />} />
            <Route path="note/:id" element={<WrongNoteDetailPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="reviews" element={<ReviewsPage />} />
            <Route path="week/:weekNumber" element={<WeekPage />} />
            <Route path="report/:weekNumber" element={<ReportPage />} />
            <Route path="upgrade" element={<UpgradePage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="strategy" element={<StrategyPage />} />
            <Route path="program" element={<ProgramPage />} />
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
