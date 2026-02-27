/**
 * v4.04: 주간 리포트 PDF 다운로드 (브라우저 인쇄 → PDF로 저장)
 * 포함: 정확도 변화, 오답 감소율, Part7 시간 변화, 예측 점수, AI 피드백
 * @param {Object} report - weekly_report 한 건 (week, accuracy_change, wrong_reduction_rate, part7_time_change, estimated_score_end, ai_feedback 등)
 */
export function downloadWeeklyReportAsPdf(report) {
  if (!report) return

  const lines = []
  lines.push(`주간 리포트 - ${report.week}주차`)
  lines.push('')
  if (report.accuracy_change != null) lines.push(`정확도 변화: ${report.accuracy_change >= 0 ? '+' : ''}${report.accuracy_change}%`)
  if (report.wrong_reduction_rate != null) lines.push(`오답 감소율: ${report.wrong_reduction_rate}%`)
  if (report.part7_time_change != null) lines.push(`Part7 시간 변화: ${report.part7_time_change >= 0 ? '+' : ''}${report.part7_time_change}초`)
  if (report.estimated_score_end != null) lines.push(`예상 점수: ${report.estimated_score_end}점`)
  lines.push('')
  if (report.ai_feedback) lines.push('AI 코치 피드백:\n' + report.ai_feedback)

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>주간 리포트 ${report.week}주차</title>
  <style>
    body { font-family: sans-serif; padding: 24px; max-width: 600px; margin: 0 auto; }
    h1 { font-size: 1.25rem; margin-bottom: 1rem; }
    pre { white-space: pre-wrap; font-size: 14px; line-height: 1.5; }
  </style>
</head>
<body>
  <h1>토오AI 주간 리포트 - ${report.week}주차</h1>
  <pre>${lines.join('\n')}</pre>
</body>
</html>
  `.trim()

  const w = window.open('', '_blank')
  if (!w) {
    console.warn('팝업이 차단되었습니다. 브라우저에서 팝업을 허용해 주세요.')
    return
  }
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 250)
}
