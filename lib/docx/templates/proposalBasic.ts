// lib/docx/templates/proposalBasic.ts — 1단계: 기획 제안서

import {
  AlignmentType,
  BorderStyle,
  Document as DocxDocument,
  PageBreak,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import {
  BASE_STYLES,
  COLORS,
  NUMBERING_CONFIG,
  PAGE_A4,
  borders,
  cell,
  heading1,
  heading2,
  headerCell,
  infoRow,
  labelCell,
  makeFooter,
  makeHeader,
  spacer,
} from '@/lib/docx/utils'

/** 1단계 기획 제안서 → DOCX Buffer */
export async function generateProposalBasic(data: Record<string, unknown> = {}): Promise<Buffer> {
  const d = data as any
  const {
    // 기본 정보
    eventName       = '{{행사명}}',
    eventDate       = '{{행사일시}}',
    eventVenue      = '{{행사장소}}',
    organizer       = '{{주최기관}}',
    expectedPeople  = '{{예상인원}}',
    eventType       = '{{행사유형}}',
    // 기획 방향
    background      = '{{행사 배경 및 목적을 작성합니다.}}',
    concept         = '{{행사 슬로건/컨셉}}',
    theme           = '{{행사 테마}}',
    keyPoints       = ['{{기획 포인트 1}}', '{{기획 포인트 2}}', '{{기획 포인트 3}}'],
    targetAudience  = '{{주요 타겟 참석자 특성 및 규모를 작성합니다.}}',
    // 프로그램 (1단계는 간략하게)
    programs        = [
      { time: '{{시작시간}}', program: '등록 및 접수', content: '참석자 등록, 네임택 배포, 자료집 제공', note: '' },
      { time: '{{시간}}',     program: '개회식',       content: '개회사, VIP 인사말',                  note: '' },
      { time: '{{시간}}',     program: '{{프로그램1}}', content: '{{내용}}',                            note: '' },
      { time: '{{시간}}',     program: '네트워킹/휴식', content: '다과 및 네트워킹',                    note: '' },
      { time: '{{시간}}',     program: '{{프로그램2}}', content: '{{내용}}',                            note: '' },
      { time: '{{종료시간}}', program: '폐회',          content: '폐회사 및 기념촬영',                  note: '' },
    ],
    // 준비 일정
    schedule = [
      { dday: 'D-60', task: '행사 기획 확정, 장소 계약',       person: '{{담당}}' },
      { dday: 'D-45', task: '초청장 발송, 연사 섭외 확정',     person: '{{담당}}' },
      { dday: 'D-30', task: '홍보물 제작, 참가 등록 오픈',     person: '{{담당}}' },
      { dday: 'D-14', task: '최종 인원 확인, 운영 매뉴얼 작성', person: '{{담당}}' },
      { dday: 'D-7',  task: '현장 답사, 리허설 일정 확인',     person: '{{담당}}' },
      { dday: 'D-1',  task: '현장 셋업, 장비 테스트',          person: '{{담당}}' },
      { dday: 'D-Day', task: '행사 진행',                      person: '전 팀'   },
      { dday: 'D+1',  task: '결과 보고서 작성, 정산',          person: '{{담당}}' },
    ],
    // 제안사 정보
    companyName     = '{{회사명}}',
    managerName     = '{{담당자명}}',
    contact         = '{{연락처}}',
    email           = '{{이메일}}',
    proposalDate    = new Date().toLocaleDateString('ko-KR'),
  } = d;

  const doc = new DocxDocument({
    numbering: NUMBERING_CONFIG,
    styles: BASE_STYLES,
    sections: [{
      properties: { page: PAGE_A4 },
      headers: { default: makeHeader(companyName, '행사 기획 제안서') },
      footers: { default: makeFooter(companyName, contact, email) },
      children: [
        // ── 커버 ────────────────────────────────────────────────
        new Paragraph({
          spacing: { before: 1600, after: 0 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '행사 기획 제안서', font: 'Arial', size: 72, bold: true, color: COLORS.brandBlue })],
        }),
        new Paragraph({
          spacing: { before: 120, after: 0 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'EVENT PROPOSAL', font: 'Arial', size: 36, color: COLORS.brandAccent })],
        }),
        ...spacer(4),
        new Table({
          width: { size: 7638, type: WidthType.DXA },
          columnWidths: [2520, 5118],
          rows: [
            infoRow('행사명', eventName),
            infoRow('행사 일시', eventDate),
            infoRow('행사 장소', eventVenue),
            infoRow('주최', organizer),
            infoRow('참석 인원', `${expectedPeople}명`),
            infoRow('제안 일자', proposalDate),
            infoRow('제안사', companyName),
            infoRow('담당자', `${managerName}  |  ${contact}`),
          ],
        }),
        ...spacer(3),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '본 제안서의 모든 내용은 대외비로 취급됩니다.', font: 'Arial', size: 18, color: COLORS.gray, italics: true })],
        }),
        new Paragraph({ children: [new PageBreak()] }),

        // ── 1. 제안 개요 ─────────────────────────────────────────
        heading1('1. 제안 개요'),
        heading2('1-1. 행사 배경 및 목적'),
        new Paragraph({ spacing: { before: 80, after: 80 }, children: [new TextRun({ text: background, font: 'Arial', size: 22, color: '333333' })] }),
        ...spacer(1),
        heading2('1-2. 행사 기본 정보'),
        new Table({
          width: { size: 9638, type: WidthType.DXA },
          columnWidths: [2409, 2409, 2411, 2409],
          rows: [
            new TableRow({ children: ['구분', '일시', '장소', '참석 인원'].map((h, i) => headerCell(h, [2409,2409,2411,2409][i])) }),
            new TableRow({ children: [
              cell(eventType, 2409, { align: AlignmentType.CENTER }),
              cell(eventDate, 2409, { align: AlignmentType.CENTER }),
              cell(eventVenue, 2411, { align: AlignmentType.CENTER }),
              cell(`${expectedPeople}명`, 2409, { align: AlignmentType.CENTER }),
            ] }),
          ],
        }),
        ...spacer(1),

        // ── 2. 기획 방향 ─────────────────────────────────────────
        heading1('2. 행사 기획 방향'),
        heading2('2-1. 핵심 컨셉'),
        new Table({
          width: { size: 9638, type: WidthType.DXA },
          columnWidths: [4819, 4819],
          rows: [
            new TableRow({ children: [
              new TableCell({
                borders: borders.solid(),
                width: { size: 4819, type: WidthType.DXA },
                shading: { fill: COLORS.lightBlue, type: ShadingType.CLEAR },
                margins: { top: 200, bottom: 200, left: 240, right: 240 },
                children: [
                  new Paragraph({ children: [new TextRun({ text: '행사 슬로건', font: 'Arial', size: 20, bold: true, color: COLORS.brandBlue })] }),
                  new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: concept, font: 'Arial', size: 24, bold: true, color: '333333' })] }),
                ],
              }),
              new TableCell({
                borders: borders.solid(),
                width: { size: 4819, type: WidthType.DXA },
                shading: { fill: COLORS.lightBlue, type: ShadingType.CLEAR },
                margins: { top: 200, bottom: 200, left: 240, right: 240 },
                children: [
                  new Paragraph({ children: [new TextRun({ text: '행사 테마', font: 'Arial', size: 20, bold: true, color: COLORS.brandBlue })] }),
                  new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: theme, font: 'Arial', size: 24, bold: true, color: '333333' })] }),
                ],
              }),
            ] }),
          ],
        }),
        ...spacer(1),
        heading2('2-2. 기획 포인트'),
        ...keyPoints.map((point: string) => new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          spacing: { before: 60, after: 60 },
          children: [new TextRun({ text: point, font: 'Arial', size: 22, color: '333333' })],
        })),
        ...spacer(1),
        heading2('2-3. 타겟 참석자'),
        new Paragraph({ spacing: { before: 80, after: 80 }, children: [new TextRun({ text: targetAudience, font: 'Arial', size: 22, color: '333333' })] }),

        // ── 3. 프로그램 구성 ─────────────────────────────────────
        new Paragraph({ children: [new PageBreak()] }),
        heading1('3. 행사 프로그램 구성'),
        new Table({
          width: { size: 9638, type: WidthType.DXA },
          columnWidths: [1400, 2000, 4238, 2000],
          rows: [
            new TableRow({ children: ['시간', '프로그램', '내용', '비고'].map((h, i) => headerCell(h, [1400,2000,4238,2000][i])) }),
            ...programs.map((p: { time: string; program: string; content: string; note: string }) => new TableRow({ children: [
              cell(p.time,    1400, { align: AlignmentType.CENTER }),
              cell(p.program, 2000, { bold: true }),
              cell(p.content, 4238),
              cell(p.note,    2000, { align: AlignmentType.CENTER }),
            ] })),
          ],
        }),
        ...spacer(1),

        // ── 4. 준비 일정 ─────────────────────────────────────────
        heading1('4. 준비 일정'),
        new Table({
          width: { size: 9638, type: WidthType.DXA },
          columnWidths: [1800, 5638, 2200],
          rows: [
            new TableRow({ children: ['일정', '업무 내용', '담당'].map((h, i) => headerCell(h, [1800,5638,2200][i])) }),
            ...schedule.map((s: { dday: string; task: string; person: string }) => new TableRow({ children: [
              cell(s.dday,   1800, { fill: COLORS.lightBlue, bold: true, color: COLORS.brandBlue, align: AlignmentType.CENTER }),
              cell(s.task,   5638),
              cell(s.person, 2200, { align: AlignmentType.CENTER }),
            ] })),
          ],
        }),

        // ── 마무리 ───────────────────────────────────────────────
        new Paragraph({ children: [new PageBreak()] }),
        new Paragraph({
          spacing: { before: 2000, after: 0 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '감사합니다', font: 'Arial', size: 64, bold: true, color: COLORS.brandBlue })],
        }),
        new Paragraph({
          spacing: { before: 200, after: 0 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '최선을 다해 성공적인 행사를 만들겠습니다.', font: 'Arial', size: 28, color: COLORS.gray })],
        }),
        ...spacer(4),
        new Table({
          width: { size: 6000, type: WidthType.DXA },
          columnWidths: [6000],
          rows: [new TableRow({ children: [
            new TableCell({
              borders: borders.solid(),
              width: { size: 6000, type: WidthType.DXA },
              shading: { fill: COLORS.lightBlue, type: ShadingType.CLEAR },
              margins: { top: 300, bottom: 300, left: 400, right: 400 },
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: companyName, font: 'Arial', size: 28, bold: true, color: COLORS.brandBlue })] }),
                new Paragraph({ spacing: { before: 100 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: `담당자: ${managerName}`, font: 'Arial', size: 22, color: '333333' })] }),
                new Paragraph({ spacing: { before: 60 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Tel: ${contact}  |  Email: ${email}`, font: 'Arial', size: 22, color: '333333' })] }),
              ],
            }),
          ] })],
        }),
      ],
    }],
  });

  return Buffer.from(await Packer.toBuffer(doc))
}
