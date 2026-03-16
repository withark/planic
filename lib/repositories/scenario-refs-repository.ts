import { readScenarioRefs, writeScenarioRefs } from '../storage'
import type { ScenarioRefDoc } from '../types'
import type { ScenarioRefsRepository } from './interfaces'
import { ScenarioRefsSchema } from '../schemas/scenario-refs'

export const scenarioRefsRepository: ScenarioRefsRepository = {
  async getAll(): Promise<ScenarioRefDoc[]> {
    return readScenarioRefs()
  },

  async saveAll(list: ScenarioRefDoc[]): Promise<void> {
    const parsed = ScenarioRefsSchema.parse(list) as ScenarioRefDoc[]
    writeScenarioRefs(parsed)
  },
}
