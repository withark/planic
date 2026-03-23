import path from 'path'
import { getEnv } from '@/lib/env'
import { readJson, writeJson } from '@/lib/utils/json-file'

const env = getEnv()
const DATA_DIR = env.DATA_DIR || path.join(process.cwd(), 'data')

export function readDataJson<T>(filename: string, fallback: T): T {
  return readJson<T>(DATA_DIR, filename, fallback)
}

export function writeDataJson<T>(filename: string, data: T): void {
  writeJson<T>(DATA_DIR, filename, data)
}

