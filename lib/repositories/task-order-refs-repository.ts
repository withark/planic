import { readTaskOrderRefs, writeTaskOrderRefs } from '../storage'
import type { TaskOrderDoc } from '../types'
import type { TaskOrderRefsRepository } from './interfaces'
import { TaskOrderRefsSchema } from '../schemas/task-order-refs'

export const taskOrderRefsRepository: TaskOrderRefsRepository = {
  async getAll(): Promise<TaskOrderDoc[]> {
    return readTaskOrderRefs()
  },

  async saveAll(list: TaskOrderDoc[]): Promise<void> {
    const parsed = TaskOrderRefsSchema.parse(list) as TaskOrderDoc[]
    writeTaskOrderRefs(parsed)
  },
}
