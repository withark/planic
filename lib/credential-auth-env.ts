/**
 * 아이디·비밀번호 로그인/가입(임시 테스트) 활성 여부.
 * - 서버 전용: ENABLE_EMAIL_PASSWORD_AUTH=1
 * - 클라이언트 번들에도 노출: NEXT_PUBLIC_ENABLE_CREDENTIAL_AUTH=1 (next start / Vercel 등 production 빌드에서 필요)
 * - 로컬: NODE_ENV=development 이면 기본 켜짐
 */
export function isCredentialAuthEnabled(): boolean {
  if ((process.env.ENABLE_EMAIL_PASSWORD_AUTH || '').trim() === '1') return true
  if ((process.env.NEXT_PUBLIC_ENABLE_CREDENTIAL_AUTH || '').trim() === '1') return true
  if (process.env.NODE_ENV === 'development') return true
  return false
}
