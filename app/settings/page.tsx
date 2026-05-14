'use client'
import { Suspense, useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { GNB, GNB_MOBILE_MAIN_COLUMN_PADDING } from '@/components/GNB'
import { Button, Input, Field, Toast } from '@/components/ui'
import type { CompanySettings } from '@/lib/types'
import { DEFAULT_SETTINGS } from '@/lib/defaults'
import Link from 'next/link'
import { apiFetch } from '@/lib/api/client'
import { toUserMessage } from '@/lib/errors/toUserMessage'
import { sanitizeCallbackUrl } from '@/lib/auth-callback'
import type { PlanType } from '@/lib/plans'

const DAUM_POSTCODE_SCRIPT = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'

/** 다음(카카오) 우편번호 API 로드 후 주소 검색 팝업 열기 */
function openDaumPostcode(onComplete: (address: string) => void, onError: (message: string) => void) {
  const run = () => {
    const w = window as unknown as {
      kakao?: {
        Postcode: new (opts: { oncomplete: (data: DaumPostcodeData) => void }) => { open: () => void }
      }
    }
    const kakao = w.kakao
    if (!kakao?.Postcode) {
      onError('주소 검색 서비스를 불러올 수 없습니다. 직접 입력해 주세요.')
      return
    }
    new kakao.Postcode({
      oncomplete(data: DaumPostcodeData) {
        let addr = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress
        let extra = ''
        if (data.userSelectedType === 'R') {
          if (data.bname && /[동로가]$/.test(data.bname)) extra += data.bname
          if (data.buildingName && data.apartment === 'Y') extra += (extra ? ', ' + data.buildingName : data.buildingName)
          if (extra) extra = ' (' + extra + ')'
        }
        const full = (addr || '') + extra
        onComplete(full.trim())
      },
    }).open()
  }
  const hasPostcode = (window as any)?.kakao?.Postcode
  if (hasPostcode) {
    run()
    return
  }
  const script = document.createElement('script')
  script.src = DAUM_POSTCODE_SCRIPT
  script.async = true
  script.onload = run
  script.onerror = () => onError('주소 검색 서비스를 불러올 수 없습니다. 직접 입력해 주세요.')
  document.head.appendChild(script)
}

interface DaumPostcodeData {
  userSelectedType: 'R' | 'J'
  roadAddress: string
  jibunAddress: string
  bname?: string
  buildingName?: string
  apartment?: string
}

/** 사업자번호 숫자만 추출 후 자동 하이픈 (000-00-00000) */
function formatBizNo(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
}

/** 전화번호 숫자만 추출 후 자동 하이픈 (한국 형식) */
function formatPhoneDisplay(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.startsWith('02')) {
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`
    return digits.length === 9
      ? `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`
      : `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  if (digits.startsWith('01')) {
    if (digits.length <= 3) return digits
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen overflow-hidden bg-gray-50/50">
          <GNB />
          <div className={`flex-1 flex items-center justify-center ${GNB_MOBILE_MAIN_COLUMN_PADDING}`}>
            <p className="text-sm text-gray-500">로딩 중…</p>
          </div>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  )
}

function SettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const onboardingMode = searchParams?.get('onboarding') === '1'
  const rawFrom = searchParams?.get('from') ?? ''
  const fromTarget = useMemo(() => {
    const sanitized = sanitizeCallbackUrl(rawFrom)
    if (!sanitized || sanitized === '/') return '/dashboard'
    return sanitized
  }, [rawFrom])

  const [cfg,  setCfg]  = useState<CompanySettings>(DEFAULT_SETTINGS)
  const [toast, setToast] = useState('')
  const [postcodeError, setPostcodeError] = useState('')
  const [me, setMe] = useState<{ subscription: { planType: PlanType }; usage: { companyProfileCount: number }; limits: { companyProfileLimit: number } } | null>(null)

  const showToast = useCallback((m: string) => {
    setToast(m); setTimeout(() => setToast(''), 2500)
  }, [])

  useEffect(() => {
    apiFetch<CompanySettings>('/api/settings')
      .then(setCfg)
      .catch(() => {})
  }, [])

  const skipOnboarding = useCallback(() => {
    try {
      window.sessionStorage.setItem('planic_company_onboarding_skipped', '1')
    } catch {
      // sessionStorage 사용 불가 환경 무시
    }
    router.replace(fromTarget)
  }, [router, fromTarget])

  useEffect(() => {
    apiFetch<{ subscription: { planType: PlanType }; usage: { companyProfileCount: number }; limits: { companyProfileLimit: number } }>('/api/me')
      .then(setMe)
      .catch(() => {})
  }, [])

  async function saveCfg() {
    try {
      await apiFetch<null>('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      })
      showToast('설정 저장 완료!')
      apiFetch<{ subscription: { planType: PlanType }; usage: { companyProfileCount: number }; limits: { companyProfileLimit: number } }>('/api/me')
        .then(setMe)
        .catch(() => {})
      if (onboardingMode && (cfg.name ?? '').trim().length > 0) {
        try {
          window.sessionStorage.removeItem('planic_company_onboarding_skipped')
        } catch {
          // ignore
        }
        window.setTimeout(() => router.replace(fromTarget), 800)
      }
    } catch (e) {
      showToast(toUserMessage(e, '설정 저장에 실패했습니다.'))
    }
  }

  const set = (k: keyof CompanySettings) => (v: string | number) =>
    setCfg(c => ({ ...c, [k]: v }))

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/50">
      <GNB />
      <div className={`flex-1 flex flex-col overflow-hidden ${GNB_MOBILE_MAIN_COLUMN_PADDING}`}>
        <header className="flex items-center justify-between px-6 h-14 border-b border-gray-100 bg-white/90 flex-shrink-0">
          <div>
            <h1 className="text-base font-semibold text-gray-900">설정</h1>
            <p className="text-xs text-gray-500 mt-0.5">회사 정보와 견적 기본값</p>
          </div>
          <Button size="sm" variant="primary" onClick={saveCfg}>저장</Button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl">
          {onboardingMode && (
            <div className="rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3.5 text-sm text-primary-900">
              <p className="font-semibold">먼저 회사 정보를 한 번 채워 주세요.</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-primary-900/85">
                상호명·담당자·연락처는 워드(.docx) 헤더·푸터와 견적서 상단에 자동으로 들어갑니다. 처음 한 번만 채우면 이후 모든 문서에 반영돼요.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={skipOnboarding}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  나중에 채우기
                </button>
                <span className="text-[11.5px] text-primary-900/70 self-center">
                  저장하면 방금 보시던 화면으로 자동 이동해요.
                </span>
              </div>
            </div>
          )}
          {me?.subscription?.planType === 'FREE' && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              무료 플랜은 기업정보를 {me.limits.companyProfileLimit}개까지 저장할 수 있어요. (현재 {me.usage.companyProfileCount}개)
              <Link href="/plans" className="ml-2 font-semibold underline">업그레이드 →</Link>
            </div>
          )}

          <section className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-card">
            <div className="px-4 py-3 bg-primary-50/50 border-b border-gray-100">
              <h2 className="text-sm font-medium text-gray-900">회사 정보</h2>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              <Field label="상호명">
                <Input value={cfg.name} onChange={e => set('name')(e.target.value)} placeholder="(주)이벤트플러스" />
              </Field>
              <Field label="사업자번호">
                <Input value={cfg.biz} onChange={e => set('biz')(formatBizNo(e.target.value))} placeholder="000-00-00000" />
              </Field>
              <Field label="대표자">
                <Input value={cfg.ceo} onChange={e => set('ceo')(e.target.value)} placeholder="홍길동" />
              </Field>
              <Field label="담당자">
                <Input value={cfg.contact} onChange={e => set('contact')(e.target.value)} placeholder="김담당" />
              </Field>
              <Field label="담당자 연락처">
                <Input value={cfg.tel} onChange={e => set('tel')(formatPhoneDisplay(e.target.value))} placeholder="010-0000-0000" />
              </Field>
              <Field label="주소">
                <div className="flex gap-2">
                  <Input
                    value={cfg.addr}
                    onChange={e => set('addr')(e.target.value)}
                    placeholder="주소 찾기로 검색하세요"
                    className="flex-1 min-w-0"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="flex-shrink-0 whitespace-nowrap"
                    onClick={() =>
                      openDaumPostcode(
                        (addr) => {
                          setPostcodeError('')
                          set('addr')(addr)
                        },
                        (message) => setPostcodeError(message),
                      )
                    }
                  >
                    주소 찾기
                  </Button>
                </div>
                {postcodeError && <p className="mt-2 text-xs text-red-600">{postcodeError}</p>}
              </Field>
            </div>
          </section>

          <section className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-card">
            <div className="px-4 py-3 bg-primary-50/50 border-b border-gray-100">
              <h2 className="text-sm font-medium text-gray-900">기본 견적 설정</h2>
            </div>
            <div className="p-4 grid grid-cols-3 gap-4">
              <Field label="제경비율 (%)">
                <Input type="number" value={cfg.expenseRate} min={0} max={100}
                  onChange={e => set('expenseRate')(+e.target.value)} />
              </Field>
              <Field label="이윤율 (%)">
                <Input type="number" value={cfg.profitRate} min={0} max={100}
                  onChange={e => set('profitRate')(+e.target.value)} />
              </Field>
              <Field label="유효기간 (일)">
                <Input type="number" value={cfg.validDays} min={1}
                  onChange={e => set('validDays')(+e.target.value)} />
              </Field>
              <div className="col-span-3">
                <Field label="결제 조건 기본값">
                  <textarea
                    value={cfg.paymentTerms}
                    onChange={e => set('paymentTerms')(e.target.value)}
                    rows={3}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 resize-none focus:outline-none focus:border-gray-400"
                  />
                </Field>
              </div>
            </div>
          </section>

        </div>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  )
}
