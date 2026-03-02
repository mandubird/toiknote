/**
 * v4.22: 관리자 레이아웃 (탭: 후기 승인 / KPI 대시보드)
 */
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AdminLayout() {
  const navigate = useNavigate()
  const pathname = useLocation().pathname
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">관리자</h1>
          <button type="button" onClick={() => navigate('/')} className="text-sm text-primary-600">
            홈으로
          </button>
        </div>
      </header>
      <nav className="bg-white border-b border-gray-200 px-4">
        <div className="max-w-4xl mx-auto flex gap-2 py-2">
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              pathname === '/admin' || pathname === '/admin/reviews' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            📝 후기 승인
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/kpi')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              pathname === '/admin/kpi' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            📊 KPI 대시보드
          </button>
        </div>
      </nav>
      <div className="admin-content max-w-4xl mx-auto">
        <Outlet context={{ adminId: user?.id }} />
      </div>
    </div>
  )
}
