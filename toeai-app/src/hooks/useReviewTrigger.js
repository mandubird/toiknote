import { useState, useEffect, useCallback } from 'react'
import { rpcCheckReviewTrigger, fetchMyProofReview } from '../services/proofReviewService'

/**
 * 후기 1단계 자동 팝업 트리거 (스펙 3.3)
 * @param {string | undefined} userId
 */
export function useReviewTrigger(userId) {
  const [shouldShowReview, setShouldShowReview] = useState(false)
  const [checking, setChecking] = useState(true)

  const recheck = useCallback(async () => {
    if (!userId) {
      setShouldShowReview(false)
      setChecking(false)
      return
    }
    setChecking(true)
    try {
      const existing = await fetchMyProofReview(userId)
      if (existing) {
        setShouldShowReview(false)
        return
      }
      const { should_show: shouldShow } = await rpcCheckReviewTrigger()
      setShouldShowReview(shouldShow)
    } catch {
      setShouldShowReview(false)
    } finally {
      setChecking(false)
    }
  }, [userId])

  useEffect(() => {
    recheck()
  }, [recheck])

  const dismissForSession = useCallback(() => {
    setShouldShowReview(false)
  }, [])

  return { shouldShowReview, checking, dismissForSession, recheck }
}
