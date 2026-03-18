import { supabase } from '../lib/supabase'

const DEFAULT_PART_COUNTS = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 }

/**
 * @param {string} userId
 * @returns {Promise<{ tagCounts: Record<string,number>, partCounts: Record<string,number>, lcWrong: number, rcWrong: number, totalWrong: number }>}
 */
export async function fetchTagStats(userId) {
  if (!userId) {
    return {
      tagCounts: {},
      partCounts: { ...DEFAULT_PART_COUNTS },
      lcWrong: 0,
      rcWrong: 0,
      totalWrong: 0,
    }
  }
  const { data, error } = await supabase
    .from('tag_stats')
    .select('tag_counts, part_counts, lc_wrong, rc_wrong, total_wrong')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('fetchTagStats', error)
    return { tagCounts: {}, partCounts: { ...DEFAULT_PART_COUNTS }, lcWrong: 0, rcWrong: 0, totalWrong: 0 }
  }

  // tag_stats가 아직 생성되지 않은(혹은 레거시 데이터로 인해 비어있는) 경우:
  // wrong_answers를 기준으로 즉시 통계를 재계산해 UX 상 "데이터 없음" 오해를 막는다.
  if (!data) {
    const { data: wrongRows, error: wrongErr } = await supabase
      .from('wrong_answers')
      .select('part_number, lc_or_rc, tags')
      .eq('user_id', userId)

    if (wrongErr) {
      console.error('fetchTagStats fallback(wrong_answers)', wrongErr)
      return { tagCounts: {}, partCounts: { ...DEFAULT_PART_COUNTS }, lcWrong: 0, rcWrong: 0, totalWrong: 0 }
    }

    const partCounts = { ...DEFAULT_PART_COUNTS }
    const tagCounts = {}
    let lcWrong = 0
    let rcWrong = 0
    let totalWrong = 0

    for (const row of wrongRows ?? []) {
      const pn = row.part_number >= 1 && row.part_number <= 7 ? row.part_number : 5
      partCounts[pn] = (partCounts[pn] || 0) + 1

      const lr = row.lc_or_rc === 'LC' ? 'LC' : row.lc_or_rc === 'RC' ? 'RC' : pn <= 4 ? 'LC' : 'RC'
      if (lr === 'LC') lcWrong += 1
      else rcWrong += 1

      const tags = Array.isArray(row.tags) ? row.tags : []
      for (const t of tags) {
        const key = String(t || '').trim()
        if (!key) continue
        tagCounts[key] = (tagCounts[key] || 0) + 1
      }

      totalWrong += 1
    }

    // 가능하면 tag_stats도 생성(백필)해 다음 페이지 로딩부터는 바로 읽히게 한다.
    // 실패해도 UX엔 영향 없도록 무시.
    await supabase
      .from('tag_stats')
      .upsert(
        {
          user_id: userId,
          tag_counts: tagCounts,
          part_counts: partCounts,
          lc_wrong: lcWrong,
          rc_wrong: rcWrong,
          total_wrong: totalWrong,
          last_updated: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .catch(() => {})

    return { tagCounts, partCounts, lcWrong, rcWrong, totalWrong }
  }

  const partCounts = { ...DEFAULT_PART_COUNTS }
  if (data?.part_counts && typeof data.part_counts === 'object') {
    Object.entries(data.part_counts).forEach(([k, v]) => {
      const n = parseInt(k, 10)
      if (n >= 1 && n <= 7) partCounts[n] = Number(v) || 0
    })
  }

  return {
    tagCounts: data?.tag_counts && typeof data.tag_counts === 'object' ? data.tag_counts : {},
    partCounts,
    lcWrong: Number(data?.lc_wrong) || 0,
    rcWrong: Number(data?.rc_wrong) || 0,
    totalWrong: Number(data?.total_wrong) || 0,
  }
}

/**
 * @param {{ lcWrong: number, rcWrong: number }} stats
 * @param {number} lcTotal
 * @param {number} rcTotal
 */
export function calculateEstimatedScore(stats, lcTotal = 100, rcTotal = 100) {
  const lcAccuracy = 1 - (stats.lcWrong / lcTotal)
  const rcAccuracy = 1 - (stats.rcWrong / rcTotal)
  const lcScore = Math.round(Math.max(0, Math.min(1, lcAccuracy)) * 495)
  const rcScore = Math.round(Math.max(0, Math.min(1, rcAccuracy)) * 495)
  return lcScore + rcScore
}
