import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { getLatestDiagnostic, saveDiagnosticResult } from '../services/diagnosticService'

const DiagnosticPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [diagnostic, setDiagnostic] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    getLatestDiagnostic(user.id)
      .then(setDiagnostic)
      .catch(() => setDiagnostic(null))
      .finally(() => setLoading(false))
  }, [user?.id])

  const handleRunDiagnostic = async () => {
    if (!user) return
    setError(null)
    setSaving(true)
    try {
      const result = await saveDiagnosticResult(user.id)
      setDiagnostic(result)
    } catch (e) {
      setError(e?.message || '진단 저장에 실패했어요.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-4">
        <p className="text-gray-600">진단을 하려면 로그인해 주세요.</p>
      </div>
    )
  }

  const barData = diagnostic
    ? [
        { name: 'LC', score: diagnostic.lc_score ?? 0 },
        { name: 'RC', score: diagnostic.rc_score ?? 0 },
        { name: 'Part 5', score: diagnostic.part5_score ?? 0 },
        { name: 'Part 6', score: diagnostic.part6_score ?? 0 },
        { name: 'Part 7', score: diagnostic.part7_score ?? 0 },
      ]
    : []

  return (
    <div className="p-4 pb-8">
      <h2 className="text-lg font-bold text-gray-800 mb-1">정밀 진단 (Week 0)</h2>
      <p className="text-sm text-gray-500 mb-4">
        오답 데이터 기준으로 점수·파트별 약점을 산출해요. 진단 완료 후 Week1을 시작할 수 있어요.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
      )}

      {!diagnostic ? (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-gray-700 mb-4">
            오답 노트가 있으면 자동으로 LC/RC·Part 5·6·7 점수를 추정해요. 지금 진단할까요?
          </p>
          <button
            type="button"
            onClick={handleRunDiagnostic}
            disabled={saving}
            className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg disabled:opacity-50"
          >
            {saving ? '진단 중…' : '진단 실행하기'}
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-gray-500">종합 예상 점수</span>
              <span className="text-xl font-bold text-primary-600">{diagnostic.overall_score ?? 0}점</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">가장 약한 RC 파트: Part {diagnostic.weakest_part ?? 7}</p>
            {barData.length > 0 && (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 495]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-gray-700 mb-4">진단이 완료되었어요. 8주 프로그램은 결제 후 Week1이 시작돼요. 프로그램 화면에서 결제하고 시작할 수 있어요.</p>
            <button
              type="button"
              onClick={() => navigate('/program')}
              className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg"
            >
              8주 프로그램 보기
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default DiagnosticPage
