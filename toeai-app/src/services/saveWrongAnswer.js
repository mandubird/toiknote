import { saveWrongNoteWithStats, getPendingWrongAnswers as getPending } from './saveWrongNoteWithStats'

const PENDING_STORAGE_KEY = 'toeai_pending_wrong_answers'

/**
 * 오답 1건 저장 (트랜잭션 + 통계 반영). 하위 호환용.
 * @param {string} userId
 * @param {{ imageUrl?: string, part?: string, question?: string, answer?: string, explanation?: string, tags?: string[], lcOrRc?: string, difficulty?: number, partNumber?: number }} data
 */
export async function saveWrongAnswer(userId, data) {
  return saveWrongNoteWithStats(userId, data)
}

export function getPendingWrongAnswers() {
  return getPending()
}

export function clearPendingWrongAnswers() {
  try {
    localStorage.removeItem('toeai_pending_wrong_answers')
  } catch (e) {
    console.error(e)
  }
}

/**
 * 로컬에 쌓인 임시 저장 목록을 Firestore에 재시도 (호출부에서 userId 필요)
 */
export async function retryPendingWrongAnswers(userId) {
  const pending = getPendingWrongAnswers()
  const results = []
  for (const item of pending) {
    const { userId: _u, failedAt, ...data } = item
    const result = await saveWrongAnswer(userId, data)
    results.push(result)
    if (result.success) {
      const next = getPendingWrongAnswers().filter(
        (p) => p.imageUrl !== item.imageUrl || p.failedAt !== item.failedAt
      )
      try {
        localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(next))
      } catch (e) {
        console.error(e)
      }
    }
  }
  return results
}
