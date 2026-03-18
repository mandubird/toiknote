/**
 * v4.21 + v4.22: 관리자 페이지 (인증 후 Outlet으로 후기/KPI 서브라우트)
 */
import { useState, useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isAdminUser } from '../services/reviewService'

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const [allowed, setAllowed] = useState(null)

  useEffect(() => {
    if (authLoading) {
      return
    }
    if (!user) {
      setAllowed(false)
      return
    }
    isAdminUser(user.id).then(setAllowed).catch(() => setAllowed(false))
  }, [user, authLoading])

  if (allowed === null) {
    return (
      <div className="p-4 flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    )
  }

  if (!user || !allowed) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
