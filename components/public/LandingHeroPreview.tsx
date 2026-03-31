/**
 * 랜딩 히어로용 장식용 UI 프리뷰(실제 앱 스크린샷 아님).
 */
export function LandingHeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[min(100%,440px)] lg:mx-0 lg:max-w-[480px]" aria-hidden>
      <div className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-primary-500/25 via-indigo-500/20 to-violet-400/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_80px_-12px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/[0.04]">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/90" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/90" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
          <span className="ml-2 flex-1 truncate text-center text-[11px] font-medium text-slate-400">planic.cloud · 문서 만들기</span>
        </div>
        <div className="space-y-4 p-5 sm:p-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-600">출력 미리보기</p>
            <p className="mt-1 text-sm font-bold text-slate-900">행사 기획안 · 완성본</p>
          </div>
          <div className="space-y-2.5">
            <div className="h-2.5 w-[42%] rounded-full bg-slate-800/90" />
            <div className="h-2 w-full rounded-full bg-slate-100" />
            <div className="h-2 w-[94%] rounded-full bg-slate-100" />
            <div className="h-2 w-[88%] rounded-full bg-slate-100" />
            <div className="h-2 w-[76%] rounded-full bg-slate-100" />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
              <p className="text-[10px] font-medium text-slate-500">구성</p>
              <p className="mt-1 text-xs font-semibold text-slate-800">본행사 · 부대 행사</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
              <p className="text-[10px] font-medium text-slate-500">일정</p>
              <p className="mt-1 text-xs font-semibold text-slate-800">리허설 · 본공</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <span className="rounded-lg bg-primary-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm shadow-primary-600/20">
              PDF 보내기
            </span>
            <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              엑셀 저장
            </span>
            <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              공유
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
