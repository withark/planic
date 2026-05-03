'use client'
import { useState, useCallback } from 'react'
import { Input, Select, Textarea } from '@/components/ui'
import CalendarPicker from '@/components/ui/CalendarPicker'
import { EVENT_TYPE_GROUPS } from '@/lib/estimate/event-types'

export interface BaseFormData {
  clientName: string
  eventName: string
  eventDate: string
  eventStartTime: string
  eventEndTime: string
  venue: string
  headcount: string
  eventType: string
  requirements: string
}

const TIME_SLOTS_30: { value: string; label: string }[] = (() => {
  const out: { value: string; label: string }[] = []
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      const period = h < 12 ? '오전' : '오후'
      const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
      const label = `${period} ${displayH}:${String(m).padStart(2, '0')}`
      out.push({ value, label })
    }
  }
  return out
})()

const INITIAL: BaseFormData = {
  clientName: '',
  eventName: '',
  eventDate: '',
  eventStartTime: '09:00',
  eventEndTime: '18:00',
  venue: '',
  headcount: '',
  eventType: '',
  requirements: '',
}

interface Props {
  onChange: (data: BaseFormData) => void
  initialData?: Partial<BaseFormData>
}

export default function BaseInfoForm({ onChange, initialData }: Props) {
  const [data, setData] = useState<BaseFormData>({ ...INITIAL, ...initialData })

  const update = useCallback(
    <K extends keyof BaseFormData>(key: K, value: BaseFormData[K]) => {
      setData((prev) => {
        const next = { ...prev, [key]: value }
        onChange(next)
        return next
      })
    },
    [onChange],
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="고객명 / 주최사"
          value={data.clientName}
          onChange={(e) => update('clientName', e.target.value)}
          placeholder="(주)위드아크"
        />
        <Input
          label="행사명"
          showRequiredMark
          value={data.eventName}
          onChange={(e) => update('eventName', e.target.value)}
          placeholder="2025 하반기 워크숍"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-slate-700">행사일</label>
          <CalendarPicker
            value={data.eventDate ? new Date(data.eventDate) : null}
            onChange={(d: Date) => update('eventDate', d.toISOString().slice(0, 10))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-slate-700">시작 시간</label>
          <select
            value={data.eventStartTime}
            onChange={(e) => update('eventStartTime', e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100/70"
          >
            {TIME_SLOTS_30.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-slate-700">종료 시간</label>
          <select
            value={data.eventEndTime}
            onChange={(e) => update('eventEndTime', e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100/70"
          >
            {TIME_SLOTS_30.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="행사 장소"
          value={data.venue}
          onChange={(e) => update('venue', e.target.value)}
          placeholder="서울 그랜드 인터컨티넨탈"
        />
        <Input
          label="예상 인원"
          value={data.headcount}
          onChange={(e) => update('headcount', e.target.value)}
          placeholder="100명"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-slate-700">행사 유형</label>
        <select
          value={data.eventType}
          onChange={(e) => update('eventType', e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100/70"
        >
          <option value="">선택하세요</option>
          {EVENT_TYPE_GROUPS.map((g) => (
            <optgroup key={g.group} label={g.group}>
              {g.options.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <Textarea
        label="요청사항"
        value={data.requirements}
        onChange={(e) => update('requirements', e.target.value)}
        rows={4}
        placeholder="행사의 목적, 특별 요청사항, 참가자 특성 등을 자유롭게 입력해 주세요."
      />
    </div>
  )
}
