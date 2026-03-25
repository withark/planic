import localFont from 'next/font/local'

/** node_modules Pretendard 가변 웹폰트 — CDN 대신 self-host */
export const pretendard = localFont({
  src: '../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2',
  display: 'swap',
  variable: '--font-pretendard',
  weight: '45 920',
})
