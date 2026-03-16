import { readSettings, writeSettings } from '../storage'
import type { CompanySettings } from '../types'
import type { SettingsRepository } from './interfaces'

export const settingsRepository: SettingsRepository = {
  async get(): Promise<CompanySettings> {
    return readSettings()
  },

  async save(settings: CompanySettings): Promise<void> {
    writeSettings(settings)
  },
}

