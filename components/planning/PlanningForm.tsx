'use client'

import { useState } from 'react'
import { EVENT_TYPE_GROUPS } from '@/lib/estimate/event-types'

export type PlanningFormValues = {
  eventName: string
  eventType: string
  eventDate: string
  eventDuration: string
  eventStartTime: string
  eventEndTime: string
  venue: string
  headcount: string
  budget: string
  clientName: string
  requirements: string
  companyName: string
}

const EMPTY: PlanningFormValues = {
  eventName: '',
  eventType: '세미나 / 컨퍼런스',
  eventDate: '',
  eventDuration: '',
  eventStartTime: '',
  eventEndTime: '',
  venue: '',
  headcount: '',
  budget: '',
  clientName: '',
  requirements: '',
  companyName: '',
}

type Props = {
  onSubmit: (values: PlanningFormValues) => void
  loading: boolean
  companyName?: string
}

export function PlanningForm({ onSubmit, loading, companyName }: Props) {
  const [form, setForm] = useState<PlanningFormValues>({
    ...EMPTY,
    companyName: companyName ?? '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof PlanningFormValues, string>>>({})

  function set<K extends keyof PlanningFormValues>(key: K, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof PlanningFormValues, string>> = {}
    if (!form.eventName.trim()) errs.eventName = '행사명을 입력해 주세요.'
    if (!form.eventType.trim()) errs.eventType = '행사 유형을 선택해 주세요.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* 필수 정보 */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          기본 정보
        </h3>
        <div className="space-y-3">
          <Field label="행사명" required error={errors.eventName}>
            <input
              value={form.eventName}
              onChange={e => set('eventName', e.target.value)}
              placeholder="예: 2025 ABC 워크숍"
              className={inputCls(!!errors.eventName)}
            />
          </Field>

          <Field label="행사 유형" required error={errors.eventType}>
            <select
              value={form.eventType}
              onChange={e => set('eventType', e.target.value)}
              className={inputCls(false)}
            >
              {EVENT_TYPE_GROUPS.map(group => (
                <optgroup key={group.group} label={group.group}>
                  {group.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {/* 일시 & 장소 */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          일시 & 장소
        </h3>
        <div className="space-y-3">
          <Field label="행사 일자">
            <input
              type="text"
              value={form.eventDate}
              onChange={e => set('eventDate', e.target.value)}
              placeholder="예: 2025년 9월 15일 (월)"
              className={inputCls(false)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="시작 시간">
              <input
                type="time"
                value={form.eventStartTime}
                onChange={e => set('eventStartTime', e.target.value)}
                className={inputCls(false)}
              />
            </Field>
            <Field label="종료 시간">
              <input
                type="time"
                value={form.eventEndTime}
                onChange={e => set('eventEndTime', e.target.value)}
                className={inputCls(false)}
              />
            </Field>
          </div>

          <Field label="장소">
            <input
              value={form.venue}
              onChange={e => set('venue', e.target.value)}
              placeholder="예: 코엑스 그랜드볼룸 (서울 강남구)"
              className={inputCls(false)}
            />
          </Field>
        </div>
      </section>

      {/* 규모 & 예산 */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          규모 & 예산
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="예상 인원">
            <input
              value={form.headcount}
              onChange={e => set('headcount', e.target.value)}
              placeholder="예: 100명"
              className={inputCls(false)}
            />
          </Field>
          <Field label="예산">
            <input
              value={form.budget}
              onChange={e => set('budget', e.target.value)}
              placeholder="예: 3,000만원"
              className={inputCls(false)}
            />
          </Field>
        </div>
      </section>

      {/* 업체 & 클라이언트 */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          업체 & 클라이언트
        </h3>
        <div className="space-y-3">
          <Field label="주최 / 클라이언트">
            <input
              value={form.clientName}
              onChange={e => set('clientName', e.target.value)}
              placeholder="예: (주)ABC 코퍼레이션"
              className={inputCls(false)}
            />
          </Field>
          <Field label="제안사 (회사명)">
            <input
              value={form.companyName}
              onChange={e => set('companyName', e.target.value)}
              placeholder="예: (주)플래닉"
              className={inputCls(false)}
            />
          </Field>
        </div>
      </section>

      {/* 요청 사항 */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          요청 사항
        </h3>
        <textarea
          value={form.requirements}
          onChange={e => set('requirements', e.target.value)}
          rows={4}
          placeholder="행사 목적, 특별 요청, 분위기 방향, 참가자 특성 등 자유롭게 입력해 주세요."
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none placeholder:text-gray-400"
        />
      </section>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? '생성 중...' : '기획 제안서 생성'}
      </button>
    </form>
  )
}

function inputCls(hasError: boolean) {
  return [
    'w-full px-3 py-2.5 text-sm border rounded-lg',
    'focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent',
    'placeholder:text-gray-400 bg-white',
    hasError ? 'border-red-400' : 'border-gray-200',
  ].join(' ')
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
