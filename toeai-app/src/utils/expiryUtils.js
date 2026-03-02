/**
 * v4.22: 만료 D-Day 계산 및 경고 레벨
 */

/**
 * @param {string} programEndDate - ISO date string
 * @returns {number} 남은 일수 (음수면 이미 만료)
 */
export function getDaysUntilExpiry(programEndDate) {
  if (!programEndDate) return 999
  const end = new Date(programEndDate)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * @typedef {'none'|'warning'|'urgent'|'critical'} ExpiryWarningLevel
 * @param {number} daysLeft
 * @returns {ExpiryWarningLevel}
 */
export function getExpiryWarningLevel(daysLeft) {
  if (daysLeft > 7) return 'none'
  if (daysLeft >= 4) return 'warning'   // D-7 ~ D-4
  if (daysLeft >= 2) return 'urgent'    // D-3 ~ D-2
  if (daysLeft >= 0) return 'critical'  // D-1 ~ D-0
  return 'none'
}
