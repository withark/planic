'use client'
import Link from 'next/link'
import { signOut } from 'next-auth/react'

const DOCS = [
  {
    href: '/create/proposal',
    title: '제안서',
    description: '행사 개요·프로그램·견적을 포함한 완성형 제안서',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    color: 'bg-blue-50 border-blue-200 hover:border-blue-400',
    iconColor: 'bg-blue-100 text-blue-700',
    btnColor: 'bg-blue-600 hover:bg-blue-700',
  },
  {
    href: '/create/cuesheet',
    title: '큐시트',
    description: '시간·순서·담당자 기준 행사 진행 운영표',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
      </svg>
    ),
    color: 'bg-green-50 border-green-200 hover:border-green-400',
    iconColor: 'bg-green-100 text-green-700',
    btnColor: 'bg-green-600 hover:bg-green-700',
  },
  {
    href: '/create/emcee',
    title: '사회자 멘트',
    description: '구간별 사회자 멘트 및 큐 사인 원고',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
      </svg>
    ),
    color: 'bg-purple-50 border-purple-200 hover:border-purple-400',
    iconColor: 'bg-purple-100 text-purple-700',
    btnColor: 'bg-purple-600 hover:bg-purple-700',
  },
  {
    href: '/create/task-summary',
    title: '과업지시서 요약',
    description: 'PDF·DOCX 파일을 AI로 핵심만 구조화 요약',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
      </svg>
    ),
    color: 'bg-orange-50 border-orange-200 hover:border-orange-400',
    iconColor: 'bg-orange-100 text-orange-700',
    btnColor: 'bg-orange-600 hover:bg-orange-700',
  },
] as const

interface Props {
  userEmail: string | null
}

export default function HomeClient({ userEmail }: Props) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <header className="border-b border-slate-200 bg-white px-4 py-0 sm:px-6">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between">
          <div>
            <span className="text-lg font-bold text-slate-900">플래닉</span>
            <span className="ml-2 text-sm text-slate-500">행사 문서를 빠르게</span>
          </div>
          <div className="flex items-center gap-3">
            {userEmail ? (
              <>
                <span className="hidden text-sm text-slate-600 sm:block">{userEmail}</span>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <Link
                href="/auth"
                className="rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-700"
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 메인 */}
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">어떤 문서를 생성할까요?</h1>
          <p className="mt-2 text-sm text-slate-500">문서 종류를 선택하고 정보를 입력하면 AI가 완성본을 만들어 드립니다.</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {DOCS.map((doc) => (
            <article
              key={doc.href}
              className={`rounded-2xl border-2 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${doc.color}`}
            >
              <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${doc.iconColor}`}>
                {doc.icon}
              </div>
              <h2 className="text-lg font-bold text-slate-900">{doc.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{doc.description}</p>
              <Link
                href={doc.href}
                className={`mt-5 inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors ${doc.btnColor}`}
              >
                문서 생성
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                  <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                </svg>
              </Link>
            </article>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-slate-400">
          위드아크 플래닉 · 행사 문서 AI 생성 도구
        </p>
      </main>
    </div>
  )
}
