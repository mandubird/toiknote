import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { RefreshListProvider } from './contexts/RefreshListContext'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import StatsPage from './pages/StatsPage'
import StrategyPage from './pages/StrategyPage'
import SettingsPage from './pages/SettingsPage'
import ProgramPage from './pages/ProgramPage'
import PaymentSuccessPage from './pages/PaymentSuccessPage'
import PaymentFailPage from './pages/PaymentFailPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RefreshListProvider>
        <Routes>
          <Route path="/payment/success" element={<PaymentSuccessPage />} />
          <Route path="/payment/fail" element={<PaymentFailPage />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
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
