#!/usr/bin/env node
/**
 * origin/main 과 다른 브랜치를 병합할 때 양쪽에서 같이 수정된 경로를 출력한다.
 * (git merge-tree 기준 — 실제 merge 전 리스크 점검용)
 */
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
function run(cmd) {
  return execSync(cmd, { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }).trimEnd()
}

const target = process.argv[2] || 'origin/codex/pipeline-v2-realtime'
let base
try {
  base = run(`git merge-base origin/main ${target}`)
} catch {
  console.error(`[report-merge-risk] merge-base 실패: origin/main vs ${target}`)
  process.exit(2)
}

let out
try {
  out = run(`git merge-tree ${base} origin/main ${target}`)
} catch (e) {
  console.error('[report-merge-risk] merge-tree 실패:', e.message)
  process.exit(2)
}

const paths = []
const lines = out.split('\n')
for (let i = 0; i < lines.length; i++) {
  if (lines[i] !== 'changed in both') continue
  for (let j = i + 1; j < lines.length; j++) {
    const line = lines[j]
    if (!line.startsWith('  ')) break
    if (line.startsWith('  their')) {
      const parts = line.trim().split(/\s+/)
      paths.push(parts[parts.length - 1])
    }
  }
}

const uniq = [...new Set(paths)].sort()
console.log(`[report-merge-risk] origin/main ← ${target}`)
console.log(`[report-merge-risk] merge-base ${base.slice(0, 7)}…`)
console.log(`[report-merge-risk] 양쪽 수정(병합 시 충돌 가능): ${uniq.length}개`)
for (const p of uniq) console.log(`  ${p}`)
