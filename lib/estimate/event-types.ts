/** 견적·문서 생성에서 쓰는 행사 유형 옵션 (InputForm·견적 생성기 공통) */
export const EVENT_TYPE_GROUPS = [
  { group: '기념·의식', options: ['기념식 / 개교기념', '시상식 / 수료식', '창립기념'] },
  { group: '교육·강연', options: ['강연 / 강의', '세미나 / 컨퍼런스', '워크숍'] },
  { group: '야외·체험', options: ['체육대회 / 운동회', '레크레이션', '팀빌딩', '야유회 / MT'] },
  { group: '공연·축제', options: ['축제 / 페스티벌', '콘서트 / 공연', '기업 행사'] },
] as const

/**
 * 업체 원문·채팅 한 줄에서 행사 유형 옵션을 추정합니다. (직접 일치 또는 키워드)
 */
export function inferEventTypeFromBriefText(raw: string): string | null {
  const s = raw.trim()
  if (s.length < 2) return null

  for (const group of EVENT_TYPE_GROUPS) {
    for (const opt of group.options) {
      if (s.includes(opt)) return opt
      const parts = opt
        .split('/')
        .map((p) => p.trim())
        .filter((p) => p.length >= 2)
      if (parts.some((p) => s.includes(p))) return opt
    }
  }

  const patterns: ReadonlyArray<{ re: RegExp; value: string }> = [
    { re: /체육대회|운동회|스포츠데이|체육대/i, value: '체육대회 / 운동회' },
    { re: /팀\s*빌딩|teambuilding|\btb\b/i, value: '팀빌딩' },
    { re: /워크\s*숍|work\s*shop/i, value: '워크숍' },
    { re: /세미나|컨퍼런스|symposium/i, value: '세미나 / 컨퍼런스' },
    { re: /강연|강\s*의|토크\b/i, value: '강연 / 강의' },
    { re: /레크레|recreation/i, value: '레크레이션' },
    { re: /야유회|\bMT\b|엠\s*티/i, value: '야유회 / MT' },
    { re: /축제|페스티발|페스트|festival/i, value: '축제 / 페스티벌' },
    { re: /콘서트|\b공연\b/i, value: '콘서트 / 공연' },
    { re: /기업\s*행사|컨벤션|임직원\s*행사/i, value: '기업 행사' },
    { re: /기념식|개교\s*기념/i, value: '기념식 / 개교기념' },
    { re: /시상식|수료식|졸업식/i, value: '시상식 / 수료식' },
    { re: /창립\s*기념/i, value: '창립기념' },
  ]
  for (const { re, value } of patterns) {
    if (re.test(s)) return value
  }
  return null
}
