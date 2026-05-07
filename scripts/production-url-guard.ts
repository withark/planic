/**
 * 운영 배포 URL 검증 — 로컬 호스트를 실수로 지정하는 경우 차단
 */

export function assertProductionBaseUrl(rawBaseUrl: string): void {
  try {
    const u = new URL(rawBaseUrl)
    const host = u.hostname.toLowerCase()
    const blocked =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '[::1]' ||
      host.endsWith('.localhost')
    if (blocked && process.env.PLANIC_ALLOW_LOCALHOST !== '1') {
      throw new Error(
        '운영 검증은 프로덕션 호스트만 허용합니다. PLANIC_BASE_URL을 배포 URL로 설정하세요. (로컬만 테스트할 때는 PLANIC_ALLOW_LOCALHOST=1)',
      )
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('운영 검증')) throw e
    throw new Error(`PLANIC_BASE_URL이 올바른 URL이 아닙니다: ${rawBaseUrl}`)
  }
}
