/** 과업지시서(RFP) 업로드 요약 API 공통 타입 */
export interface TaskSummary {
  projectTitle: string
  orderingOrganization: string
  purpose: string
  mainScope: string
  eventRange: string
  deliverables: string
  requiredStaffing: string
  budget: string
  specialNotes: string
  oneLineSummary: string
}
