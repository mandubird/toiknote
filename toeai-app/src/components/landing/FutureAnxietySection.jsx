/**
 * v4.23: 미래 불안 트리거 — 솔루션과 결과 증거 사이
 */
export default function FutureAnxietySection() {
  return (
    <section className="border-t border-gray-100 bg-white px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <p className="text-center text-lg font-medium text-gray-900">
          토익은 점수가 아니라 <strong>기회</strong>입니다
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
            <span className="text-2xl">💼</span>
            <p className="mt-2 font-medium text-gray-800">취업 서류 탈락</p>
            <p className="text-sm text-gray-600">900 미만은 서류에서 걸러지는 회사들</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
            <span className="text-2xl">📈</span>
            <p className="mt-2 font-medium text-gray-800">이직 기회 박탈</p>
            <p className="text-sm text-gray-600">스펙 점검 시 토익 점수가 발목을 잡는 상황</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
            <span className="text-2xl">🏆</span>
            <p className="mt-2 font-medium text-gray-800">스펙 경쟁 뒤처짐</p>
            <p className="text-sm text-gray-600">같은 조건에서 토익 점수 하나로 결정되는 현실</p>
          </div>
        </div>
        <p className="mt-6 text-center text-sm font-medium text-gray-700">
          지금 전략을 바꾸지 않으면, 6개월 후도 같은 점수입니다.
        </p>
      </div>
    </section>
  )
}
