'use client'

import clsx from 'clsx'

type Props = {
  /** 예: "기획 문서", "견적 초안" */
  headline: string
  /** 한 줄 안내 (선택) */
  hint?: string
  onScrollToInput: () => void
  onRegenerate: () => void
  onSave?: () => void | Promise<void>
  saveLabel?: string
  saving?: boolean
  className?: string
}

/**
 * 한글 단어 끝 글자의 받침(종성) 유무를 기준으로 "이/가" 같은 조사를 고른다.
 * 한글이 아닌 글자로 끝나면 받침이 없는 것으로 보고 기본 조사를 반환한다.
 */
function pickKoreanParticle(word: string, withBatchim: string, withoutBatchim: string): string {
  const last = word.trim().slice(-1)
  const code = last.charCodeAt(0)
  const isHangulSyllable = code >= 0xac00 && code <= 0xd7a3
  if (!isHangulSyllable) return withoutBatchim
  const jong = (code - 0xac00) % 28
  return jong === 0 ? withoutBatchim : withBatchim
}

/**
 * 생성 완료 후 결과 영역 상단에서 다음 행동을 안내하는 컴팩트 CTA 박스.
 */
export default function GenerationResultNextSteps({
  headline,
  hint,
  onScrollToInput,
  onRegenerate,
  onSave,
  saveLabel = '저장',
  saving,
  className,
}: Props) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-emerald-200/90 bg-emerald-50/80 px-3 py-2.5 shadow-sm sm:px-4 sm:py-3',
        className,
      )}
    >
      <p className="text-sm font-semibold text-emerald-950">
        {headline}
        {pickKoreanParticle(headline, '이', '가')} 준비됐어요.
      </p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-emerald-900/90">
        {hint ??
          '아래에서 편집한 뒤 저장하거나, 엑셀·PDF로 보낼 수 있어요. 입력을 바꾼 뒤 다시 생성할 수도 있어요.'}
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onScrollToInput}
          className="rounded-lg border border-emerald-300/80 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-emerald-900 shadow-sm hover:bg-emerald-50/90"
        >
          입력으로
        </button>
        <button
          type="button"
          onClick={onRegenerate}
          className="rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-[11.5px] font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          다시 생성
        </button>
        {onSave ? (
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={saving}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? '저장 중…' : saveLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}
