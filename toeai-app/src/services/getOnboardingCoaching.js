/**
 * Onboarding (v1.1) — rule-based 임시 코칭 생성
 * 스펙: 4문항 inputs(현재점수/목표점수/남은기간/막히는파트)로
 * 약점TOP3 / 오늘할것3개 / 버릴것1개 반환 (API 호출 없음)
 */

export function getOnboardingCoaching(inputs) {
  const current = Number(inputs?.current_score)
  const weakPart = inputs?.weak_part

  if (!Number.isFinite(current) || !weakPart) {
    return getDefault()
  }

  const lowBand = current >= 700 && current <= 800
  const highBand = current >= 800 && current <= 900

  // 스펙 표 기준 (중복 구간: 800은 highBand로 취급)
  if (lowBand && weakPart === 'Part7') return getPart7Low()
  if (lowBand && weakPart === 'Part5') return getPart5Low()
  if (lowBand && weakPart === 'LC') return getLcLow()

  if (highBand && weakPart === 'Part7') return getPart7High()
  if (highBand && weakPart === 'Part5') return getPart5High()
  if (highBand && weakPart === 'RC') return getRcHigh()

  return getDefault()
}

function getPart7Low() {
  return {
    weaknessTop3: ['독해 속도', '장문 해석', '시간 부족'],
    today3: [
      'Part7 5문제 시간 재고 풀기',
      '틀린 문제 구조 분석',
      '오답 3개 기록',
    ],
    discard1: '무작정 문제 많이 풀기',
  }
}

function getPart5Low() {
  return {
    weaknessTop3: ['문법 기초', '어휘 혼동', '품사 실수'],
    today3: ['Part5 핵심 문법 10문제', '오답 원인 분류', '취약 품사 정리'],
    discard1: '전체 파트 고르게 풀기',
  }
}

function getLcLow() {
  return {
    weaknessTop3: ['받아쓰기', '연음 처리', '집중력'],
    today3: ['짧은 대화 섀도잉 10분', '틀린 문제 스크립트 분석', '오답 3개 기록'],
    discard1: '배속 듣기 반복',
  }
}

function getPart7High() {
  return {
    weaknessTop3: ['지문 스킵 기준 없음', '문장 구조 해석 오류', '함정 선택지'],
    today3: [
      '장문 지문 2개 시간 재고 풀기',
      '정답 근거 한 줄 적기',
      '오답 3개 기록',
    ],
    discard1: '모르는 단어 전부 찾기',
  }
}

function getPart5High() {
  return {
    weaknessTop3: ['문법 정확도', '함정 유형', '반복 실수'],
    today3: ['함정 유형 문제 10개 집중', '오답 패턴 분류', '오답 3개 기록'],
    discard1: '쉬운 문제 반복 풀기',
  }
}

function getRcHigh() {
  return {
    weaknessTop3: ['시간 배분 실패', 'Part7 지연', '속도 부족'],
    today3: ['섹션별 시간 제한 설정', 'Part7 먼저 풀기 연습', '오답 3개 기록'],
    discard1: '모든 문제 꼼꼼히 읽기',
  }
}

function getDefault() {
  return {
    weaknessTop3: ['오답 패턴 미분류', '약점 구간 불명확', '반복 실수'],
    today3: ['오답 3개 등록', '코칭 결과 확인', '오늘 할 것 1개 선택'],
    discard1: '목표 없이 공부하기',
  }
}

