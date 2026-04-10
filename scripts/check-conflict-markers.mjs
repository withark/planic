#!/usr/bin/env node
/**
 * 추적 중인 소스에 merge 충돌 마커가 남아 있으면 실패(exit 1).
 */
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const globs = ['*.ts', '*.tsx', '*.js', '*.jsx', '*.mjs', '*.cjs', '*.css', '*.json', '*.md']

try {
  execSync(`git grep -n "^<<<<<<<" -- ${globs.map((g) => JSON.stringify(g)).join(' ')}`, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  console.error('[check-conflict-markers] 추적 파일에 <<<<<<< 마커가 있습니다. 해결 후 커밋하세요.')
  process.exit(1)
} catch (e) {
  const code = e?.status
  if (code === 1) {
    console.log('[check-conflict-markers] ok (충돌 마커 없음)')
    process.exit(0)
  }
  console.error('[check-conflict-markers] git grep 실패:', e?.message || e)
  process.exit(code ?? 2)
}
