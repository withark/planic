import { readReferences, writeReferences } from '../storage'
import type { ReferenceDoc } from '../types'
import type { ReferencesRepository } from './interfaces'

export const referencesRepository: ReferencesRepository = {
  async getAll(): Promise<ReferenceDoc[]> {
    return readReferences()
  },

  async saveAll(list: ReferenceDoc[]): Promise<void> {
    writeReferences(list)
  },
}

