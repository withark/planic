import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { EvQuoteLogo } from '@/components/EvQuoteLogo'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { AuthErrorAlert } from '@/components/auth/AuthErrorAlert'
import { isDevAuthEnabled } from '@/lib/auth-dev'
import { sanitizeCallbackUrl } from '@/lib/auth-callback'
import { authOptions } from '@/lib/auth'

type SearchParams = { error?: string; errorDescription?: string; callbackUrl?: string; reason?: string }

function resolveCallbackUrl(searchParams: SearchParams): string {
  const raw = typeof searchParams?.callbackUrl === 'string' ? searchParams.callbackUrl.trim() : ''
  const hasParam = raw.length > 0
  const fallback = '/generate'
  if (!hasParam) return fallback
  const sanitized = sanitizeCallbackUrl(raw)
  if (sanitized === '/' && raw !== '/') return fallback
  return sanitized || fallback
}

export default async function AuthPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const session = await getServerSession(authOptions)
  const callbackUrl = resolveCallbackUrl(searchParams)
  const reason = typeof searchParams?.reason === 'string' ? searchParams.reason : ''
  const isSignupInduction = reason === 'signup_required'
  const devEnabled = isDevAuthEnabled()

  if (session) {
    redirect(callbackUrl)
  }

  return (
    <div
      className={`min-h-screen flex flex-col ${
        isSignupInduction
          ? 'bg-gradient-to-b from-primary-50/80 via-white to-slate-50'
          : 'bg-gradient-to-b from-slate-50 via-white to-primary-50/30'
      }`}
    >
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100/80 bg-white/60 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-2 text-gray-800 hover:text-primary-600 transition-colors">
          <EvQuoteLogo showText size="md" />
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 sm:py-16">
        {isSignupInduction ? (
          <div className="w-full max-w-md space-y-6">
            <div className="text-center space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">바로 시작하기</p>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">로그인하고 이어서 진행할게요</h1>
              <p className="text-sm text-slate-500 pt-1">방금 누르신 기능은 계정이 있어야 이용할 수 있어요.</p>
            </div>

            <div className="rounded-2xl border-2 border-primary-200 bg-white p-5 shadow-sm shadow-primary-900/5 space-y-4">
              <div className="flex gap-3">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center text-lg font-semibold"
                  aria-hidden
                >
                  !
                </div>
                <div className="space-y-3 min-w-0">
                  <p className="text-sm font-medium text-gray-900 leading-relaxed">
                    바로 시작하기를 이용하려면 회원가입(로그인)이 필요해요. 가입/로그인 후 원래 가려던 페이지로
                    이어서 이동합니다.
                  </p>
                  <ul className="text-xs text-slate-600 space-y-2 border-t border-slate-100 pt-3">
                    <li className="flex gap-2">
                      <span className="text-primary-500 font-bold">·</span>
                      <span>견적·문서 만들기 등은 작업 내역을 저장하려면 로그인이 필요합니다.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary-500 font-bold">·</span>
                      <span>
                        로그인(또는 가입)이 끝나면 <strong className="text-gray-800">견적 만들기 화면</strong>으로
                        바로 돌아갑니다.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <AuthErrorAlert error={searchParams?.error} errorDescription={searchParams?.errorDescription} />

            <div className="space-y-3">
              <GoogleSignInButton callbackUrl={callbackUrl} className="btn-primary w-full py-3.5 rounded-xl text-sm font-semibold" />
              {devEnabled && (
                <Link
                  href={`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                  className="w-full inline-flex items-center justify-center py-3 rounded-xl text-sm font-semibold border border-slate-200 text-gray-700 hover:bg-slate-50"
                >
                  개발용 로그인(자격 증명)
                </Link>
              )}
            </div>

            <p className="text-center text-xs text-slate-400">
              로그인하면 서비스 이용약관 및 개인정보 처리방침에 동의한 것으로 봅니다.
            </p>
          </div>
        ) : (
          <div className="w-full max-w-sm space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-xl font-semibold text-gray-900">로그인</h1>
              <p className="text-sm text-gray-500">소셜 계정으로 계속하기</p>
            </div>

            {reason === 'login_required' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                해당 기능은 로그인 후 이용할 수 있어요. 로그인하면 원래 가려던 페이지로 이어서 이동합니다.
              </div>
            )}

            <AuthErrorAlert error={searchParams?.error} errorDescription={searchParams?.errorDescription} />

            <div className="space-y-3">
              <GoogleSignInButton callbackUrl={callbackUrl} className="btn-primary w-full" />
              {devEnabled && (
                <Link
                  href={`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                  className="w-full inline-flex items-center justify-center py-3 rounded-xl text-sm font-semibold border border-slate-200 text-gray-700 hover:bg-slate-50"
                >
                  개발용 로그인(자격 증명)
                </Link>
              )}
            </div>

            <p className="text-center text-xs text-gray-400">
              로그인하면 서비스 이용약관 및 개인정보 처리방침에 동의한 것으로 봅니다.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
