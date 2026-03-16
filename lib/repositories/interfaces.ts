import type {
  HistoryRecord,
  PriceCategory,
  CompanySettings,
  ReferenceDoc,
} from '../types'

export interface HistoryRepository {
  getAll(): Promise<HistoryRecord[]>
  getById(id: string): Promise<HistoryRecord | undefined>
  append(record: HistoryRecord): Promise<void>
  delete(id: string): Promise<void>
  clear(): Promise<void>
}

export interface PricesRepository {
  getAll(): Promise<PriceCategory[]>
  saveAll(prices: PriceCategory[]): Promise<void>
}

export interface SettingsRepository {
  get(): Promise<CompanySettings>
  save(settings: CompanySettings): Promise<void>
}

export interface ReferencesRepository {
  getAll(): Promise<ReferenceDoc[]>
  saveAll(list: ReferenceDoc[]): Promise<void>
}

