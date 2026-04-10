#!/usr/bin/env node
/**
 * 품질 휴리스틱 테스트를 여러 번 연속 실행(결정론적 회귀·플레이크 조기 발견).
 * 사용: node scripts/repeat-ai-quality.mjs [횟수, 기본 5]
 */
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const n = Math.max(1, Number.parseInt(process.argv[2] || '5', 10))

for (let i = 1; i <= n; i++) {
  console.log(`[repeat-ai-quality] ${i}/${n}`)
  execSync('npm run test:ai-quality', { cwd: root, stdio: 'inherit' })
}
console.log(`[repeat-ai-quality] ${n}회 모두 통과`)
