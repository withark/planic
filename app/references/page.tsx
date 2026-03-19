import { redirect } from 'next/navigation'

// Legacy route (kept for backward compatibility).
// 실제 UX는 /reference-estimate 에서 "참고 견적서 학습(스타일 모드)"만 수행합니다.
export default function ReferencesLegacyPage() {
  redirect('/reference-estimate')
}

