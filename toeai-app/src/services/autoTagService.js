/**
 * v4.24: 1차 룰 기반 태깅 (2차 LLM은 별도 연동 시 추가)
 */

const KEYWORD_RULES = {
  'G-001': ['subject-verb', '수일치', 'singular', 'plural'],
  'G-033': ['although', 'even though', '양보'],
  'G-034': ['because', 'since', 'as', '원인'],
  'G-035': ['if', 'unless', '조건'],
  'P7-091': ['similar', '유사어', '혼동'],
  'P7-097': ['paraphrase', '바꿔 표현'],
  'LC-031': ['indirect', '우회답변'],
  'M-001': ['time over', '시간 초과'],
}

/**
 * 문제/해설 텍스트에서 키워드 매칭으로 tag_code 목록 반환
 * @param {string} questionText
 * @param {string} explanation
 * @returns {string[]} tag_code 배열
 */
export function ruleBasedTag(questionText, explanation) {
  const text = ((questionText || '') + ' ' + (explanation || '')).toLowerCase()
  const matchedCodes = []
  for (const [tagCode, keywords] of Object.entries(KEYWORD_RULES)) {
    if (keywords.some((kw) => text.includes(kw.toLowerCase()))) {
      matchedCodes.push(tagCode)
    }
  }
  return matchedCodes
}
