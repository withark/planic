import type { MarketingDocHubIcon } from '@/lib/marketing-documents'

type Props = {
  id: MarketingDocHubIcon
  className?: string
}

/** 문서 생성 허브용 단순 라인 아이콘 (24×24) */
export function HubDocIcon({ id, className }: Props) {
  const common = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true as const,
  }

  switch (id) {
    case 'estimate':
      return (
        <svg {...common}>
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" />
          <path d="M9 12h6M9 16h4" />
        </svg>
      )
    case 'planning':
      return (
        <svg {...common}>
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M12 2a4 4 0 0 1 4 4c0 3-2 4.5-2 8H10c0-3.5-2-5-2-8a4 4 0 0 1 4-4z" />
        </svg>
      )
    case 'program':
      return (
        <svg {...common}>
          <path d="M8 6h13M8 12h13M8 18h9" />
          <path d="M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      )
    case 'scenario':
      return (
        <svg {...common}>
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M6 8h12M6 12h8" />
        </svg>
      )
    case 'emcee':
      return (
        <svg {...common}>
          <path d="M12 3a4 4 0 0 0-4 4v5a4 4 0 0 0 8 0V7a4 4 0 0 0-4-4z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <path d="M12 17v3M9 22h6" />
        </svg>
      )
    case 'cue':
      return (
        <svg {...common}>
          <path d="M4 6h16M4 10h16M4 14h16M4 18h10" />
          <path d="M4 4v16" />
        </svg>
      )
    case 'task-summary':
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6M9 13h6M9 17h4" />
        </svg>
      )
    default: {
      const _exhaustive: never = id
      return _exhaustive
    }
  }
}
