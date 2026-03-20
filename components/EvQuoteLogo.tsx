'use client'

import { PlanicMark } from '@/components/PlanicMark'

/** 플래닉 Planic 로고: 문서+견적 아이콘 + 텍스트(선택) */
interface EvQuoteLogoProps {
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function EvQuoteLogo({
  showText = true,
  size = 'md',
  className = '',
}: EvQuoteLogoProps) {
  const iconSize = size === 'sm' ? 24 : size === 'lg' ? 48 : 32
  const textSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-base'

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <PlanicMark size={iconSize} className="flex-shrink-0" />
      {showText && (
        <span className={`font-bold tracking-tight text-gray-800 ${textSize}`}>
          플래닉 <span className="font-normal text-primary-600">Planic</span>
        </span>
      )}
    </div>
  )
}
