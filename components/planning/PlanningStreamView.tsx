'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

type Status = 'idle' | 'streaming' | 'done' | 'error'

type Props = {
  text: string
  status: Status
  error?: string
}

const mdComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-gray-900 mt-8 mb-4 pb-2 border-b border-gray-200 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3 pb-1.5 border-b border-gray-100">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-gray-900 mt-6 mb-2">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-sm leading-7 text-gray-700 mb-3">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-none space-y-1 mb-4 pl-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-1 mb-4 text-sm text-gray-700">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="flex gap-2 text-sm text-gray-700 leading-6">
      <span className="text-gray-400 mt-0.5 flex-shrink-0">•</span>
      <span>{children}</span>
    </li>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-6 rounded-lg border border-gray-200">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-gray-900 text-white">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2.5 text-left text-xs font-semibold">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5 text-gray-700 border-b border-gray-100 align-top">{children}</td>
  ),
  tr: ({ children }) => (
    <tr className="even:bg-gray-50">{children}</tr>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-4">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-gray-200 my-6" />,
  code: ({ children }) => (
    <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">
      {children}
    </code>
  ),
}

export function PlanningStreamView({ text, status, error }: Props) {
  if (status === 'idle') return null

  if (status === 'error') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error ?? '생성 중 오류가 발생했습니다. 다시 시도해 주세요.'}
      </div>
    )
  }

  return (
    <div className="relative">
      {/* 스트리밍 중 상단 펄스 인디케이터 */}
      {status === 'streaming' && (
        <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-600" />
          </span>
          기획 제안서 작성 중...
        </div>
      )}

      {status === 'done' && (
        <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          생성 완료
        </div>
      )}

      <div className="prose-sm max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={mdComponents}
        >
          {text}
        </ReactMarkdown>

        {/* 스트리밍 중 커서 깜빡임 */}
        {status === 'streaming' && (
          <span className="inline-block w-0.5 h-4 bg-gray-700 animate-pulse ml-0.5 align-middle" />
        )}
      </div>
    </div>
  )
}
