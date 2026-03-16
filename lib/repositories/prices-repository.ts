import { readPrices, writePrices } from '../storage'
import type { PriceCategory } from '../types'
import type { PricesRepository } from './interfaces'

export const pricesRepository: PricesRepository = {
  async getAll(): Promise<PriceCategory[]> {
    return readPrices()
  },

  async saveAll(prices: PriceCategory[]): Promise<void> {
    writePrices(prices)
  },
}

