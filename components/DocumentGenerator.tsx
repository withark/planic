'use client'

/**
 * planic — 템플릿 기반 DOCX 생성 입력 폼 (docx-js, 서버 API 연동)
 * @see lib/docx/templates/*
 */

import { type CSSProperties, type ReactElement, type ReactNode, cloneElement, isValidElement, useState } from 'react'

const STAGES = [
  {
    id: 'proposal',
    step: 1,
    label: '기획 제안서',
    desc: '행사 개요 + 기획 방향',
    endpoint: '/api/generate/proposal',
    color: '#1E3A5F',
  },
  {
    id: 'proposal-detail',
    step: 2,
    label: '세부 프로그램 제안서',
    desc: '1단계 + 세부 프로그램',
    endpoint: '/api/generate/proposal-detail',
    color: '#0F6E56',
  },
  {
    id: 'proposal-quote',
    step: 3,
    label: '견적 포함 제안서',
    desc: '2단계 + 항목별 견적',
    endpoint: '/api/generate/proposal-quote',
    color: '#854F0B',
  },
] as const

type QuoteItem = {
  category: string
  item: string
  spec: string
  qty: string | number
  unit: string
  unitPrice: string
  amount: string
  note: string
}

type ProgramRow = { time: string; program: string; content: string; note: string }

type FormState = {
  eventName: string
  eventDate: string
  eventVenue: string
  organizer: string
  expectedPeople: string
  eventType: string
  background: string
  concept: string
  theme: string
  keyPoints: [string, string, string]
  targetAudience: string
  companyName: string
  managerName: string
  managerTitle: string
  contact: string
  email: string
  programs: ProgramRow[]
  quoteItems: QuoteItem[]
  totalAmount: string
  subtotal: string
  vat: string
  paymentTerms: string
  bankName: string
  bankAccount: string
  bankHolder: string
  clientCompany: string
  clientName: string
  clientTitle: string
  bizNumber: string
}

const DEFAULT_FORM: FormState = {
  eventName: '',
  eventDate: '',
  eventVenue: '',
  organizer: '',
  expectedPeople: '',
  eventType: '컨퍼런스',
  background: '',
  concept: '',
  theme: '',
  keyPoints: ['', '', ''],
  targetAudience: '',
  companyName: '',
  managerName: '',
  managerTitle: '대표',
  contact: '',
  email: '',
  programs: [
    { time: '', program: '등록 및 접수', content: '참석자 등록, 네임택 배포, 자료집 제공', note: '' },
    { time: '', program: '개회식', content: '개회사, VIP 인사말', note: '' },
    { time: '', program: '', content: '', note: '' },
    { time: '', program: '네트워킹', content: '다과 및 네트워킹', note: '' },
    { time: '', program: '', content: '', note: '' },
    { time: '', program: '폐회', content: '폐회사 및 기념촬영', note: '' },
  ],
  quoteItems: [
    {
      category: '장소',
      item: '행사장 대관',
      spec: '',
      qty: 1,
      unit: '식',
      unitPrice: '',
      amount: '',
      note: '',
    },
    {
      category: '장비/기술',
      item: '음향 시스템',
      spec: '메인/모니터스피커',
      qty: 1,
      unit: '식',
      unitPrice: '',
      amount: '',
      note: '',
    },
    {
      category: '장비/기술',
      item: '영상 시스템',
      spec: 'LED/빔/스크린',
      qty: 1,
      unit: '식',
      unitPrice: '',
      amount: '',
      note: '',
    },
    {
      category: '무대/연출',
      item: '무대 설치',
      spec: '',
      qty: 1,
      unit: '식',
      unitPrice: '',
      amount: '',
      note: '',
    },
    {
      category: '인쇄물',
      item: '자료집',
      spec: 'A4',
      qty: '',
      unit: '부',
      unitPrice: '',
      amount: '',
      note: '',
    },
    {
      category: '케이터링',
      item: '다과/음료',
      spec: '',
      qty: 1,
      unit: '식',
      unitPrice: '',
      amount: '',
      note: '',
    },
    {
      category: '운영 인력',
      item: '총괄 PM',
      spec: '당일',
      qty: 1,
      unit: '명',
      unitPrice: '',
      amount: '',
      note: '',
    },
    {
      category: '기획/관리',
      item: '행사 기획비',
      spec: '사전준비 포함',
      qty: 1,
      unit: '식',
      unitPrice: '',
      amount: '',
      note: '',
    },
  ],
  totalAmount: '',
  subtotal: '',
  vat: '',
  paymentTerms: '계약금 30% / 중도금 40% / 잔금 30%',
  bankName: '',
  bankAccount: '',
  bankHolder: '',
  clientCompany: '',
  clientName: '',
  clientTitle: '',
  bizNumber: '',
}

const inputSm: CSSProperties = {
  padding: '5px 6px',
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  fontSize: 12,
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  color: '#333',
  outline: 'none',
}

export default function DocumentGenerator() {
  const [activeStage, setActiveStage] = useState(0)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [loading, setLoading] = useState<'docx' | 'pdf' | null>(null)
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})

  const stage = STAGES[activeStage]

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field as string]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  function updateKeyPoint(index: 0 | 1 | 2, value: string) {
    const next: [string, string, string] = [...form.keyPoints]
    next[index] = value
    update('keyPoints', next)
  }

  function updateProgram(index: number, field: keyof ProgramRow, value: string) {
    const next = [...form.programs]
    next[index] = { ...next[index], [field]: value }
    update('programs', next)
  }

  function updateQuoteItem(index: number, field: keyof QuoteItem, value: string | number) {
    const next = [...form.quoteItems]
    next[index] = { ...next[index], [field]: value }
    update('quoteItems', next)
  }

  function validate() {
    const errs: Partial<Record<string, string>> = {}
    const required: [keyof FormState, string][] = [
      ['eventName', '행사명'],
      ['eventDate', '행사 일시'],
      ['eventVenue', '행사 장소'],
      ['companyName', '회사명'],
      ['managerName', '담당자명'],
      ['contact', '연락처'],
    ]
    for (const [key, label] of required) {
      const v = form[key]
      if (typeof v === 'string' && !v.trim()) errs[key] = `${label}을(를) 입력해주세요.`
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function download(format: 'docx' | 'pdf') {
    if (!validate()) return

    setLoading(format)
    try {
      const endpoint = format === 'pdf' ? '/api/generate/pdf' : stage.endpoint
      const payload = format === 'pdf' ? { type: stage.id, ...form } : form

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const ct = res.headers.get('content-type') ?? ''

      if (!res.ok) {
        if (ct.includes('application/json')) {
          const err = (await res.json()) as { error?: string }
          alert(err.error ?? '문서 생성에 실패했습니다.')
          return
        }
        alert('문서 생성에 실패했습니다.')
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `[${stage.label}] ${form.eventName}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      alert('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div
      style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '24px 20px',
        fontFamily: 'Pretendard, -apple-system, sans-serif',
      }}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        {STAGES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveStage(i)}
            style={{
              flex: 1,
              padding: '12px 8px',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              background: i === activeStage ? s.color : '#f0f2f5',
              color: i === activeStage ? '#fff' : '#555',
              transition: 'all 0.2s',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 2 }}>STEP {s.step}</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{s.label}</div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{s.desc}</div>
          </button>
        ))}
      </div>

      <Section title="기본 정보" color={stage.color}>
        <Grid>
          <Field label="행사명 *" error={errors.eventName}>
            <input
              value={form.eventName}
              onChange={(e) => update('eventName', e.target.value)}
              placeholder="예: 2025 ABC 컨퍼런스"
            />
          </Field>
          <Field label="행사 유형">
            <select
              value={form.eventType}
              onChange={(e) => update('eventType', e.target.value)}
            >
              {['컨퍼런스', '세미나', '포럼', '론칭행사', '시상식', '공연', '전시', '기업행사', '기타'].map(
                (t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ),
              )}
            </select>
          </Field>
          <Field label="행사 일시 *" error={errors.eventDate}>
            <input
              value={form.eventDate}
              onChange={(e) => update('eventDate', e.target.value)}
              placeholder="예: 2025년 9월 15일(월) 13:00~18:00"
            />
          </Field>
          <Field label="예상 참석 인원">
            <input
              value={form.expectedPeople}
              onChange={(e) => update('expectedPeople', e.target.value)}
              placeholder="예: 200"
            />
          </Field>
          <Field label="행사 장소 *" error={errors.eventVenue} span={2}>
            <input
              value={form.eventVenue}
              onChange={(e) => update('eventVenue', e.target.value)}
              placeholder="예: 코엑스 그랜드볼룸 (서울 강남구)"
            />
          </Field>
          <Field label="주최 기관">
            <input
              value={form.organizer}
              onChange={(e) => update('organizer', e.target.value)}
              placeholder="예: ABC 주식회사"
            />
          </Field>
        </Grid>
      </Section>

      <Section title="기획 방향" color={stage.color}>
        <Grid>
          <Field label="행사 배경 및 목적" span={2}>
            <textarea
              rows={3}
              value={form.background}
              onChange={(e) => update('background', e.target.value)}
              placeholder="행사를 기획하게 된 배경과 달성하고자 하는 목표를 입력해주세요."
            />
          </Field>
          <Field label="행사 슬로건/컨셉">
            <input
              value={form.concept}
              onChange={(e) => update('concept', e.target.value)}
              placeholder="예: Connect, Grow, Inspire"
            />
          </Field>
          <Field label="행사 테마">
            <input
              value={form.theme}
              onChange={(e) => update('theme', e.target.value)}
              placeholder="예: 지속가능한 미래, 디지털 전환"
            />
          </Field>
          <Field label="타겟 참석자" span={2}>
            <input
              value={form.targetAudience}
              onChange={(e) => update('targetAudience', e.target.value)}
              placeholder="예: IT 업계 종사자, C-Level 임원, 스타트업 대표"
            />
          </Field>
          {([0, 1, 2] as const).map((i) => (
            <Field key={i} label={`기획 포인트 ${i + 1}`}>
              <input
                value={form.keyPoints[i]}
                onChange={(e) => updateKeyPoint(i, e.target.value)}
                placeholder={`기획 핵심 포인트 ${i + 1}`}
              />
            </Field>
          ))}
        </Grid>
      </Section>

      {activeStage >= 1 && (
        <Section title="세부 프로그램" color={stage.color}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f0f2f5' }}>
                {['시간', '프로그램명', '내용', '비고'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '8px 10px',
                      textAlign: 'left',
                      borderBottom: '2px solid #e0e3e8',
                      fontWeight: 600,
                      color: '#444',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {form.programs.map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f2f5' }}>
                  <td style={{ padding: '4px' }}>
                    <input
                      value={p.time}
                      onChange={(e) => updateProgram(i, 'time', e.target.value)}
                      placeholder="13:00"
                      style={inputSm}
                    />
                  </td>
                  <td style={{ padding: '4px' }}>
                    <input
                      value={p.program}
                      onChange={(e) => updateProgram(i, 'program', e.target.value)}
                      placeholder="프로그램명"
                      style={inputSm}
                    />
                  </td>
                  <td style={{ padding: '4px' }}>
                    <input
                      value={p.content}
                      onChange={(e) => updateProgram(i, 'content', e.target.value)}
                      placeholder="내용"
                      style={{ ...inputSm, width: '100%' }}
                    />
                  </td>
                  <td style={{ padding: '4px' }}>
                    <input
                      value={p.note}
                      onChange={(e) => updateProgram(i, 'note', e.target.value)}
                      placeholder="비고"
                      style={inputSm}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                programs: [...prev.programs, { time: '', program: '', content: '', note: '' }],
              }))
            }
            style={{
              marginTop: 8,
              padding: '6px 14px',
              background: 'none',
              border: `1px dashed ${stage.color}`,
              borderRadius: 6,
              color: stage.color,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            + 행 추가
          </button>
        </Section>
      )}

      {activeStage >= 2 && (
        <Section title="견적 내역" color={stage.color}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f0f2f5' }}>
                {['대분류', '항목', '규격', '수량', '단위', '단가', '금액', '비고'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '6px 6px',
                      textAlign: 'left',
                      borderBottom: '2px solid #e0e3e8',
                      fontWeight: 600,
                      color: '#444',
                      fontSize: 12,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {form.quoteItems.map((q, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f2f5' }}>
                  {(
                    ['category', 'item', 'spec', 'qty', 'unit', 'unitPrice', 'amount', 'note'] as const
                  ).map((f) => (
                    <td key={f} style={{ padding: '3px' }}>
                      <input
                        value={q[f] as string | number}
                        onChange={(e) =>
                          updateQuoteItem(
                            i,
                            f,
                            f === 'qty' && e.target.value !== '' && !Number.isNaN(Number(e.target.value))
                              ? Number(e.target.value)
                              : e.target.value,
                          )
                        }
                        style={inputSm}
                        placeholder={f === 'qty' ? '1' : ''}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                quoteItems: [
                  ...prev.quoteItems,
                  {
                    category: '',
                    item: '',
                    spec: '',
                    qty: 1,
                    unit: '식',
                    unitPrice: '',
                    amount: '',
                    note: '',
                  },
                ],
              }))
            }
            style={{
              marginTop: 8,
              padding: '6px 14px',
              background: 'none',
              border: `1px dashed ${stage.color}`,
              borderRadius: 6,
              color: stage.color,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            + 항목 추가
          </button>
          <Grid style={{ marginTop: 16 }}>
            <Field label="소계 (공급가액)">
              <input
                value={form.subtotal}
                onChange={(e) => update('subtotal', e.target.value)}
                placeholder="예: 13,636,364"
              />
            </Field>
            <Field label="부가세 (10%)">
              <input
                value={form.vat}
                onChange={(e) => update('vat', e.target.value)}
                placeholder="예: 1,363,636"
              />
            </Field>
            <Field label="총 합계 금액 (부가세 포함)">
              <input
                value={form.totalAmount}
                onChange={(e) => update('totalAmount', e.target.value)}
                placeholder="예: 15,000,000"
              />
            </Field>
            <Field label="결제 조건">
              <input value={form.paymentTerms} onChange={(e) => update('paymentTerms', e.target.value)} />
            </Field>
            <Field label="은행명">
              <input
                value={form.bankName}
                onChange={(e) => update('bankName', e.target.value)}
                placeholder="예: 신한은행"
              />
            </Field>
            <Field label="계좌번호">
              <input
                value={form.bankAccount}
                onChange={(e) => update('bankAccount', e.target.value)}
                placeholder="예: 110-123-456789"
              />
            </Field>
            <Field label="예금주">
              <input value={form.bankHolder} onChange={(e) => update('bankHolder', e.target.value)} />
            </Field>
          </Grid>
        </Section>
      )}

      {activeStage >= 2 && (
        <Section title="발주처 · 세금계산" color={stage.color}>
          <Grid>
            <Field label="발주처(클라이언트) 회사명">
              <input
                value={form.clientCompany}
                onChange={(e) => update('clientCompany', e.target.value)}
                placeholder="예: ABC 주식회사"
              />
            </Field>
            <Field label="클라이언트 담당자">
              <input
                value={form.clientName}
                onChange={(e) => update('clientName', e.target.value)}
                placeholder="이름"
              />
            </Field>
            <Field label="직함">
              <input value={form.clientTitle} onChange={(e) => update('clientTitle', e.target.value)} />
            </Field>
            <Field label="사업자등록번호 (제안사)">
              <input
                value={form.bizNumber}
                onChange={(e) => update('bizNumber', e.target.value)}
                placeholder="000-00-00000"
              />
            </Field>
          </Grid>
        </Section>
      )}

      <Section title="제안사 정보" color={stage.color}>
        <Grid>
          <Field label="회사명 *" error={errors.companyName}>
            <input
              value={form.companyName}
              onChange={(e) => update('companyName', e.target.value)}
              placeholder="예: (주)플래닉"
            />
          </Field>
          <Field label="담당자명 *" error={errors.managerName}>
            <input
              value={form.managerName}
              onChange={(e) => update('managerName', e.target.value)}
              placeholder="예: 홍길동"
            />
          </Field>
          <Field label="담당자 직함 (견적서 표기)">
            <input
              value={form.managerTitle}
              onChange={(e) => update('managerTitle', e.target.value)}
              placeholder="예: 대표"
            />
          </Field>
          <Field label="연락처 *" error={errors.contact}>
            <input
              value={form.contact}
              onChange={(e) => update('contact', e.target.value)}
              placeholder="예: 010-1234-5678"
            />
          </Field>
          <Field label="이메일">
            <input
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="예: hello@planic.cloud"
            />
          </Field>
        </Grid>
      </Section>

      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button
          type="button"
          onClick={() => download('docx')}
          disabled={!!loading}
          style={{
            flex: 1,
            padding: '16px',
            border: 'none',
            borderRadius: 10,
            cursor: loading ? 'not-allowed' : 'pointer',
            background: loading === 'docx' ? '#ccc' : stage.color,
            color: '#fff',
            fontSize: 16,
            fontWeight: 700,
            transition: 'all 0.2s',
          }}
        >
          {loading === 'docx' ? '⏳ 생성 중...' : '📄 Word(.docx) 다운로드'}
        </button>
        <button
          type="button"
          onClick={() => download('pdf')}
          disabled={!!loading}
          style={{
            flex: 1,
            padding: '16px',
            border: `2px solid ${stage.color}`,
            borderRadius: 10,
            cursor: loading ? 'not-allowed' : 'pointer',
            background: '#fff',
            color: stage.color,
            fontSize: 16,
            fontWeight: 700,
            transition: 'all 0.2s',
          }}
        >
          {loading === 'pdf' ? '⏳ 확인 중...' : '🖨 PDF 다운로드'}
        </button>
      </div>
      <p style={{ textAlign: 'center', fontSize: 12, color: '#999', marginTop: 8 }}>
        서버에서 문서를 생성합니다. PDF는 별도 변환 연동 전까지 안내만 표시됩니다.
      </p>
    </div>
  )
}

function Section({
  title,
  color,
  children,
}: {
  title: string
  color: string
  children: ReactNode
}) {
  return (
    <div style={{ marginBottom: 24, border: '1px solid #e8eaed', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px', background: color, color: '#fff', fontWeight: 700, fontSize: 14 }}>
        {title}
      </div>
      <div style={{ padding: 20, background: '#fff' }}>{children}</div>
    </div>
  )
}

function Grid({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px 16px',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

const fieldInputStyle = (hasError: boolean): CSSProperties => ({
  width: '100%',
  boxSizing: 'border-box',
  padding: '9px 12px',
  border: `1px solid ${hasError ? '#e53e3e' : '#d1d5db'}`,
  borderRadius: 8,
  fontSize: 14,
  color: '#333',
  background: '#fff',
  outline: 'none',
  fontFamily: 'inherit',
})

function Field({
  label,
  children,
  error,
  span = 1,
}: {
  label: string
  children: ReactNode
  error?: string
  span?: number
}) {
  const hasError = Boolean(error)
  const styled =
    isValidElement(children) && (children.type === 'input' || children.type === 'textarea' || children.type === 'select')
      ? cloneElement(children as ReactElement<{ style?: CSSProperties }>, {
          style: {
            ...fieldInputStyle(hasError),
            ...(children.props as { style?: CSSProperties }).style,
          },
        })
      : children

  return (
    <div style={{ gridColumn: span > 1 ? `span ${span}` : undefined }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>{styled}</div>
      {error && <p style={{ fontSize: 11, color: '#e53e3e', marginTop: 3 }}>{error}</p>}
    </div>
  )
}
