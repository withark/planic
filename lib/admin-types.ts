/** 관리자용 플랜 정의 (app_kv plans) */
export interface AdminPlan {
  id: string
  name: string
  priceMonth: number
  generationLimit: number
  features: string[]
  active: boolean
  sortOrder: number
}

/** 관리자용 구독 (app_kv subscriptions) */
export interface AdminSubscription {
  userId: string
  planId: string
  status: 'trial' | 'active' | 'cancelled'
  startedAt: string
  expiresAt: string | null
}

/** 엔진 설정 오버레이 (app_kv engine_config). env보다 우선. */
export interface EngineConfigOverlay {
  provider?: 'anthropic' | 'openai'
  model?: string
  maxTokens?: number
}
