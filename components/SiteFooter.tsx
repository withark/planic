import Link from 'next/link'

type SiteFooterProps = {
  /** 랜딩 등에서 여백·부가 카피 축소 */
  compact?: boolean
}

/**
 * 공통 사업자·약관 푸터 (랜딩, 약관 페이지 등)
 */
export function SiteFooter({ compact = false }: SiteFooterProps) {
  const pad = compact ? 'py-5 sm:py-6' : 'py-8 sm:py-9'
  const gap = compact ? 'gap-4 sm:gap-8' : 'gap-6 sm:gap-10'
  const titleSpace = compact ? 'space-y-2' : 'space-y-4'
  const tagline = !compact

  return (
    <footer className="flex-shrink-0 border-t border-slate-100 bg-white">
      <div className={`mx-auto max-w-5xl px-4 sm:px-6 ${pad}`}>
        <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between ${gap}`}>
          <div className={`min-w-0 ${titleSpace} text-left`}>
            <div>
              <p className="text-sm font-semibold text-slate-900 tracking-tight">플래닉 Planic</p>
              {tagline && (
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  행사 문서를 함께 기획하는 파트너
                </p>
              )}
            </div>
            <address className="not-italic space-y-1.5 text-[11px] sm:text-xs text-slate-600 leading-relaxed">
              <p className="text-slate-700 font-medium">(주)시냇가에심은나무</p>
              <p>
                사업자등록번호 438-81-01028
                <span className="text-slate-300 mx-1.5" aria-hidden>
                  ·
                </span>
                대표자 이다윗
              </p>
              <p>주소 광릉수목원로 600 A동</p>
              <p>
                대표 연락처{' '}
                <a href="tel:07086661112" className="text-primary-700 hover:underline font-medium">
                  070-8666-1112
                </a>
              </p>
              <p>고객센터 운영시간 오전 10:00 ~ 16:00</p>
              <p>통신판매업 신고번호 제2017-경기포천-0319호</p>
            </address>
          </div>
          <nav
            className={`flex flex-row sm:flex-col flex-wrap gap-x-5 gap-y-2 sm:items-end sm:gap-2 shrink-0 ${compact ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'}`}
            aria-label="약관 및 정책"
          >
            <Link href="/terms" className="font-medium text-slate-700 hover:text-primary-600 transition-colors">
              이용약관
            </Link>
            <Link href="/privacy" className="font-medium text-slate-700 hover:text-primary-600 transition-colors">
              개인정보처리방침
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}
