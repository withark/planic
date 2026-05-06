// lib/docx/templates/proposalWithQuote.ts — 3단계: 견적 포함 제안서

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
  VerticalAlign,
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

export async function generateProposalWithQuote(data: any): Promise<Buffer> {
  const {
    // 기본 정보
    eventName      = '{{행사명}}',
    eventDate      = '{{행사일시}}',
    eventVenue     = '{{행사장소}}',
    organizer      = '{{주최기관}}',
    expectedPeople = '{{예상인원}}',
    eventType      = '{{행사유형}}',
    // 기획 방향
    background     = '{{행사 배경 및 목적}}',
    concept        = '{{행사 슬로건/컨셉}}',
    theme          = '{{행사 테마}}',
    keyPoints      = ['{{기획 포인트 1}}', '{{기획 포인트 2}}', '{{기획 포인트 3}}'],
    // 세부 프로그램
    programs = [
      { time: '{{시간}}', program: '등록 및 접수',  content: '참석자 등록, 네임택 배포, 자료집 제공', note: '' },
      { time: '{{시간}}', program: '개회식',         content: '개회사, VIP 인사말',                  note: '' },
      { time: '{{시간}}', program: '{{프로그램1}}',  content: '{{내용}}',                            note: '' },
      { time: '{{시간}}', program: '네트워킹/휴식',  content: '다과 및 네트워킹',                    note: '' },
      { time: '{{시간}}', program: '{{프로그램2}}',  content: '{{내용}}',                            note: '' },
      { time: '{{시간}}', program: '폐회',            content: '폐회사 및 기념촬영',                  note: '' },
    ],
    // 견적 정보
    quoteNumber    = `QUOTE-${new Date().getFullYear()}-001`,
    quoteDate      = new Date().toLocaleDateString('ko-KR'),
    validDays      = '30',
    quoteItems = [
      { category: '장소',      item: '행사장 대관',   spec: '',                qty: '1',  unit: '식', unitPrice: '',  amount: '', note: ''      },
      { category: '장소',      item: '주차장',        spec: '',                qty: '1',  unit: '식', unitPrice: '',  amount: '', note: ''      },
      { category: '장비/기술', item: '음향 시스템',   spec: '메인/모니터스피커', qty: '1', unit: '식', unitPrice: '',  amount: '', note: ''      },
      { category: '장비/기술', item: '영상 시스템',   spec: 'LED/빔/스크린',   qty: '1',  unit: '식', unitPrice: '',  amount: '', note: ''      },
      { category: '장비/기술', item: '조명 시스템',   spec: '무대/연출조명',   qty: '1',  unit: '식', unitPrice: '',  amount: '', note: ''      },
      { category: '무대/연출', item: '무대 설치',     spec: '',                qty: '1',  unit: '식', unitPrice: '',  amount: '', note: ''      },
      { category: '무대/연출', item: '백드롭/배너',   spec: '',                qty: '1',  unit: '식', unitPrice: '',  amount: '', note: ''      },
      { category: '인쇄물',    item: '자료집/책자',   spec: 'A4',              qty: '',   unit: '부', unitPrice: '',  amount: '', note: ''      },
      { category: '인쇄물',    item: '네임택/목걸이', spec: 'PVC카드',         qty: '',   unit: '개', unitPrice: '',  amount: '', note: ''      },
      { category: '케이터링',  item: '다과/음료',     spec: '',                qty: '1',  unit: '식', unitPrice: '',  amount: '', note: ''      },
      { category: '케이터링',  item: '기념품/답례품', spec: '',                qty: '',   unit: '개', unitPrice: '',  amount: '', note: ''      },
      { category: '운영 인력', item: '총괄 PM',       spec: '당일',            qty: '1',  unit: '명', unitPrice: '',  amount: '', note: ''      },
      { category: '운영 인력', item: '현장 스태프',   spec: '당일',            qty: '',   unit: '명', unitPrice: '',  amount: '', note: ''      },
      { category: '운영 인력', item: '포토그래퍼',    spec: '당일',            qty: '1',  unit: '명', unitPrice: '',  amount: '', note: ''      },
      { category: '운영 인력', item: '영상 촬영',     spec: '당일+편집',       qty: '1',  unit: '식', unitPrice: '',  amount: '', note: ''      },
      { category: '기획/관리', item: '행사 기획비',   spec: '사전준비 포함',   qty: '1',  unit: '식', unitPrice: '',  amount: '', note: ''      },
      { category: '기획/관리', item: '교통/출장비',   spec: '실비 정산',       qty: '1',  unit: '식', unitPrice: '',  amount: '', note: '실비'  },
    ],
    subtotal       = '{{소계금액}}',
    vat            = '{{VAT금액}}',
    totalAmount    = '{{총합계금액}}',
    // 결제 조건
    paymentDeposit = '30',
    paymentMid     = '40',
    paymentFinal   = '30',
    depositAmount  = '{{계약금액}}',
    midAmount      = '{{중도금액}}',
    finalAmount    = '{{잔금액}}',
    paymentTerms   = '계약금 30% / 중도금 40% / 잔금 30%',
    // 계좌 정보
    bankName       = '{{은행명}}',
    bankAccount    = '{{계좌번호}}',
    bankHolder     = '{{예금주}}',
    // 클라이언트 정보
    clientCompany  = '{{클라이언트 회사명}}',
    clientName     = '{{클라이언트 담당자명}}',
    clientTitle    = '{{직책}}',
    // 제안사 정보
    companyName    = '{{회사명}}',
    bizNumber      = '{{사업자번호}}',
    managerName    = '{{담당자명}}',
    managerTitle   = '{{직책}}',
    contact        = '{{연락처}}',
    email          = '{{이메일}}',
  } = data;

  const doc = new DocxDocument({
    numbering: NUMBERING_CONFIG,
    styles: BASE_STYLES,
    sections: [{
      properties: { page: PAGE_A4 },
      headers: { default: makeHeader(companyName, '행사 기획 견적 제안서') },
      footers: { default: makeFooter(companyName, contact, email) },
      children: [

        // ── 커버 ──────────────────────────────────────────────────
        new Paragraph({
          spacing: { before: 1200, after: 0 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '행사 기획', font: 'Arial', size: 52, color: COLORS.gray })],
        }),
        new Paragraph({
          spacing: { before: 40, after: 0 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '견적 제안서', font: 'Arial', size: 80, bold: true, color: COLORS.brandBlue })],
        }),
        new Paragraph({
          spacing: { before: 80, after: 0 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'PROPOSAL WITH QUOTATION', font: 'Arial', size: 32, color: COLORS.brandAccent })],
        }),
        ...spacer(3),
        // 수신/발신 박스
        new Table({
          width: { size: 8000, type: WidthType.DXA },
          columnWidths: [4000, 4000],
          rows: [new TableRow({ children: [
            new TableCell({
              borders: borders.solid(),
              width: { size: 4000, type: WidthType.DXA },
              shading: { fill: COLORS.lightBlue, type: ShadingType.CLEAR },
              margins: { top: 240, bottom: 240, left: 300, right: 300 },
              children: [
                new Paragraph({ children: [new TextRun({ text: '수  신', font: 'Arial', size: 18, color: COLORS.gray })] }),
                new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: clientCompany, font: 'Arial', size: 26, bold: true, color: COLORS.brandBlue })] }),
                new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: `${clientName} ${clientTitle}`, font: 'Arial', size: 20, color: '333333' })] }),
              ],
            }),
            new TableCell({
              borders: borders.solid(),
              width: { size: 4000, type: WidthType.DXA },
              shading: { fill: 'F8F9FA', type: ShadingType.CLEAR },
              margins: { top: 240, bottom: 240, left: 300, right: 300 },
              children: [
                new Paragraph({ children: [new TextRun({ text: '발  신', font: 'Arial', size: 18, color: COLORS.gray })] }),
                new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: companyName, font: 'Arial', size: 26, bold: true, color: COLORS.brandBlue })] }),
                new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: `${managerName} ${managerTitle}`, font: 'Arial', size: 20, color: '333333' })] }),
              ],
            }),
          ] })],
        }),
        ...spacer(2),
        // 기본 정보 4컬럼
        new Table({
          width: { size: 8000, type: WidthType.DXA },
          columnWidths: [2000, 2000, 2000, 2000],
          rows: [
            new TableRow({ children: ['행사명','행사 일시','행사 장소','제안 일자'].map((h,i)=>headerCell(h,2000)) }),
            new TableRow({ children: [eventName,eventDate,eventVenue,quoteDate].map(v=>cell(v,2000,{align:AlignmentType.CENTER})) }),
          ],
        }),
        ...spacer(2),
        // 총 견적 금액 하이라이트
        new Table({
          width: { size: 8000, type: WidthType.DXA },
          columnWidths: [8000],
          rows: [new TableRow({ children: [
            new TableCell({
              borders: {
                top:    { style: BorderStyle.SINGLE, size: 6, color: COLORS.brandAccent },
                bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.brandAccent },
                left:   { style: BorderStyle.SINGLE, size: 6, color: COLORS.brandAccent },
                right:  { style: BorderStyle.SINGLE, size: 6, color: COLORS.brandAccent },
              },
              width: { size: 8000, type: WidthType.DXA },
              shading: { fill: 'FFF9E6', type: ShadingType.CLEAR },
              margins: { top: 200, bottom: 200, left: 400, right: 400 },
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '총 견적 금액', font: 'Arial', size: 22, color: COLORS.gray })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${totalAmount} 원 (부가세 포함)`, font: 'Arial', size: 44, bold: true, color: COLORS.brandBlue })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `(VAT included)`, font: 'Arial', size: 18, color: COLORS.gray, italics: true })] }),
              ],
            }),
          ] })],
        }),
        new Paragraph({ children: [new PageBreak()] }),

        // ── 1. 제안 개요 ───────────────────────────────────────────
        heading1('1. 사업 제안 개요'),
        heading2('1-1. 제안 배경 및 목적'),
        new Paragraph({ spacing: { before: 80, after: 80 }, children: [new TextRun({ text: background, font: 'Arial', size: 22, color: '333333' })] }),
        ...spacer(1),
        heading2('1-2. 행사 개요'),
        new Table({
          width: { size: 9638, type: WidthType.DXA },
          columnWidths: [2520, 7118],
          rows: [
            infoRow('행사명',     eventName),
            infoRow('행사 성격',  eventType),
            infoRow('일시',       eventDate),
            infoRow('장소',       eventVenue),
            infoRow('예상 참석자', `${expectedPeople}명`),
          ],
        }),

        // ── 2. 세부 프로그램 ───────────────────────────────────────
        new Paragraph({ children: [new PageBreak()] }),
        heading1('2. 기획 방향 및 프로그램'),
        heading2('2-1. 행사 컨셉'),
        new Table({
          width: { size: 9638, type: WidthType.DXA },
          columnWidths: [4819, 4819],
          rows: [new TableRow({ children: [
            new TableCell({
              borders: borders.solid(), width: { size: 4819, type: WidthType.DXA },
              shading: { fill: COLORS.lightBlue, type: ShadingType.CLEAR },
              margins: { top: 200, bottom: 200, left: 240, right: 240 },
              children: [
                new Paragraph({ children: [new TextRun({ text: '슬로건', font: 'Arial', size: 20, bold: true, color: COLORS.brandBlue })] }),
                new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: concept, font: 'Arial', size: 22, bold: true, color: '333333' })] }),
              ],
            }),
            new TableCell({
              borders: borders.solid(), width: { size: 4819, type: WidthType.DXA },
              shading: { fill: COLORS.lightBlue, type: ShadingType.CLEAR },
              margins: { top: 200, bottom: 200, left: 240, right: 240 },
              children: [
                new Paragraph({ children: [new TextRun({ text: '테마', font: 'Arial', size: 20, bold: true, color: COLORS.brandBlue })] }),
                new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: theme, font: 'Arial', size: 22, bold: true, color: '333333' })] }),
              ],
            }),
          ] })],
        }),
        ...spacer(1),
        heading2('2-2. 세부 프로그램'),
        new Table({
          width: { size: 9638, type: WidthType.DXA },
          columnWidths: [1400, 2200, 4238, 1800],
          rows: [
            new TableRow({ children: ['시간','프로그램','내용','비고'].map((h,i)=>headerCell(h,[1400,2200,4238,1800][i])) }),
            ...programs.map((p: { time: string; program: string; content: string; note: string }) => new TableRow({ children: [
              cell(p.time,    1400, { align: AlignmentType.CENTER }),
              cell(p.program, 2200, { bold: true }),
              cell(p.content, 4238),
              cell(p.note,    1800, { align: AlignmentType.CENTER }),
            ] })),
          ],
        }),

        // ── 3. 견적서 ─────────────────────────────────────────────
        new Paragraph({ children: [new PageBreak()] }),
        heading1('3. 견적서'),
        new Table({
          width: { size: 9638, type: WidthType.DXA },
          columnWidths: [2520, 7118],
          rows: [
            infoRow('견적번호',  quoteNumber),
            infoRow('견적일자',  quoteDate),
            infoRow('유효기간',  `견적일로부터 ${validDays}일`),
            infoRow('공급자',    `${companyName} (사업자번호: ${bizNumber})`),
            infoRow('공급받는자', `${clientCompany} (담당: ${clientName})`),
            infoRow('결제조건',  paymentTerms),
          ],
        }),
        ...spacer(1),
        heading2('3-1. 항목별 견적 내역'),
        // 견적 테이블 — 직접 구성 (헬퍼 함수 인라인)
        new Table({
          width: { size: 9926, type: WidthType.DXA },
          columnWidths: [500, 1100, 2000, 1400, 560, 760, 1400, 1400, 806],
          rows: [
            // 헤더
            new TableRow({ children:
              ['No','대분류','항목','규격/사양','수량','단위','단가(원)','금액(원)','비고'].map((h,i) =>
                new TableCell({
                  borders: borders.solid(),
                  width: { size: [500,1100,2000,1400,560,760,1400,1400,806][i], type: WidthType.DXA },
                  shading: { fill: COLORS.brandBlue, type: ShadingType.CLEAR },
                  margins: { top: 80, bottom: 80, left: 90, right: 90 },
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, font: 'Arial', size: 18, bold: true, color: 'FFFFFF' })] })],
                })
              )
            }),
            // 데이터 행
            ...quoteItems.map((q: {
                category: string
                item: string
                spec: string
                qty: string | number
                unit: string
                unitPrice: string
                amount: string
                note: string
              }, idx: number) =>
              new TableRow({ children:
                [String(idx+1), q.category, q.item, q.spec, String(q.qty), q.unit, q.unitPrice, q.amount, q.note].map((v, i) =>
                  new TableCell({
                    borders: borders.solid(),
                    width: { size: [500,1100,2000,1400,560,760,1400,1400,806][i], type: WidthType.DXA },
                    shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
                    margins: { top: 60, bottom: 60, left: 90, right: 90 },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [new Paragraph({
                      alignment: i >= 4 ? AlignmentType.CENTER : AlignmentType.LEFT,
                      children: [new TextRun({ text: String(v ?? ''), font: 'Arial', size: 18, color: '333333' })],
                    })],
                  })
                )
              })
            ),
            // 소계 행
            new TableRow({ children: [
              new TableCell({ borders: borders.solid(), width: { size: 500,  type: WidthType.DXA }, shading: { fill: 'F0F4F8', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 90, right: 90 }, children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
              new TableCell({ borders: borders.solid(), width: { size: 1100, type: WidthType.DXA }, shading: { fill: 'F0F4F8', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 90, right: 90 }, children: [new Paragraph({ children: [new TextRun({ text: '소  계', font: 'Arial', size: 19, bold: true, color: COLORS.brandBlue })] })] }),
              new TableCell({ borders: borders.solid(), width: { size: 2000, type: WidthType.DXA }, shading: { fill: 'F0F4F8', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 90, right: 90 }, children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
              new TableCell({ borders: borders.solid(), width: { size: 1400, type: WidthType.DXA }, shading: { fill: 'F0F4F8', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 90, right: 90 }, children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
              new TableCell({ borders: borders.solid(), width: { size: 560,  type: WidthType.DXA }, shading: { fill: 'F0F4F8', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 90, right: 90 }, children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
              new TableCell({ borders: borders.solid(), width: { size: 760,  type: WidthType.DXA }, shading: { fill: 'F0F4F8', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 90, right: 90 }, children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
              new TableCell({ borders: borders.solid(), width: { size: 1400, type: WidthType.DXA }, shading: { fill: 'F0F4F8', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 90, right: 90 }, children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
              new TableCell({ borders: borders.solid(), width: { size: 1400, type: WidthType.DXA }, shading: { fill: 'F0F4F8', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 90, right: 90 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: subtotal, font: 'Arial', size: 19, bold: true, color: COLORS.brandBlue })] })] }),
              new TableCell({ borders: borders.solid(), width: { size: 806,  type: WidthType.DXA }, shading: { fill: 'F0F4F8', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 90, right: 90 }, children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
            ] }),
            // 부가세 행
            new TableRow({ children: [
              new TableCell({ borders: borders.solid(), width: { size: 500,  type: WidthType.DXA }, shading: { fill: 'F0F4F8', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 90, right: 90 }, children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
              new TableCell({ borders: borders.solid(), width: { size: 1100, type: WidthType.DXA }, shading: { fill: 'F0F4F8', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 90, right: 90 }, children: [new Paragraph({ children: [new TextRun({ text: '부가세 (10%)', font: 'Arial', size: 18, bold: true, color: COLORS.gray })] })] }),
              new TableCell({ borders: borders.solid(), width: { size: 2000, type: WidthType.DXA }, shading: { fill: 'F0F4F8', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 90, right: 90 }, children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
              new TableCell({ borders: borders.solid(), width: { size: 1400, type: WidthType.DXA }, shading: { fill: 'F0F4F8', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 90, right: 90 }, children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
              new TableCell({ borders: borders.solid(), width: { size: 560,  type: WidthType.DXA }, shading: { fill: 'F0F4F8', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 90, right: 90 }, children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
              new TableCell({ borders: borders.solid(), width: { size: 760,  type: WidthType.DXA }, shading: { fill: 'F0F4F8', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 90, right: 90 }, children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
              new TableCell({ borders: borders.solid(), width: { size: 1400, type: WidthType.DXA }, shading: { fill: 'F0F4F8', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 90, right: 90 }, children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
              new TableCell({ borders: borders.solid(), width: { size: 1400, type: WidthType.DXA }, shading: { fill: 'F0F4F8', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 90, right: 90 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: vat, font: 'Arial', size: 18, bold: true, color: COLORS.gray })] })] }),
              new TableCell({ borders: borders.solid(), width: { size: 806,  type: WidthType.DXA }, shading: { fill: 'F0F4F8', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 90, right: 90 }, children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
            ] }),
            // 총합계 행
            new TableRow({ children: [
              new TableCell({ borders: borders.solid(), width: { size: 500,  type: WidthType.DXA }, shading: { fill: 'FFF9E6', type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 90, right: 90 }, children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
              new TableCell({ borders: borders.solid(), width: { size: 1100, type: WidthType.DXA }, shading: { fill: 'FFF9E6', type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 90, right: 90 }, children: [new Paragraph({ children: [new TextRun({ text: '총  합  계', font: 'Arial', size: 20, bold: true, color: COLORS.brandBlue })] })] }),
              new TableCell({ borders: borders.solid(), width: { size: 2000, type: WidthType.DXA }, shading: { fill: 'FFF9E6', type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 90, right: 90 }, children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
              new TableCell({ borders: borders.solid(), width: { size: 1400, type: WidthType.DXA }, shading: { fill: 'FFF9E6', type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 90, right: 90 }, children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
              new TableCell({ borders: borders.solid(), width: { size: 560,  type: WidthType.DXA }, shading: { fill: 'FFF9E6', type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 90, right: 90 }, children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
              new TableCell({ borders: borders.solid(), width: { size: 760,  type: WidthType.DXA }, shading: { fill: 'FFF9E6', type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 90, right: 90 }, children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
              new TableCell({ borders: borders.solid(), width: { size: 1400, type: WidthType.DXA }, shading: { fill: 'FFF9E6', type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 90, right: 90 }, children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
              new TableCell({ borders: borders.solid(), width: { size: 1400, type: WidthType.DXA }, shading: { fill: 'FFF9E6', type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 90, right: 90 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: totalAmount, font: 'Arial', size: 21, bold: true, color: COLORS.brandBlue })] })] }),
              new TableCell({ borders: borders.solid(), width: { size: 806,  type: WidthType.DXA }, shading: { fill: 'FFF9E6', type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 90, right: 90 }, children: [new Paragraph({ children: [new TextRun({ text: '' })] })] }),
            ] }),
          ],
        }),
        ...spacer(1),
        heading2('3-2. 견적 안내 사항'),
        ...[
          `본 견적서는 발행일로부터 ${validDays}일간 유효합니다.`,
          '행사 규모 변경 시 견적 금액이 조정될 수 있습니다.',
          '장소 대관료는 별도 변동이 있을 수 있으며, 계약 시 확정됩니다.',
          '옵션 항목은 별도 협의 후 추가/제외 가능합니다.',
          '계약 취소 시 위약금이 발생할 수 있습니다 (계약서 별도 명시).',
        ].map(txt => new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          spacing: { before: 60, after: 60 },
          children: [new TextRun({ text: txt, font: 'Arial', size: 20, color: '333333' })],
        })),

        // ── 4. 결제 조건 ───────────────────────────────────────────
        new Paragraph({ children: [new PageBreak()] }),
        heading1('4. 계약 및 결제 조건'),
        new Table({
          width: { size: 9638, type: WidthType.DXA },
          columnWidths: [2520, 4059, 3059],
          rows: [
            new TableRow({ children: ['구분','시기','비율/금액'].map((h,i)=>headerCell(h,[2520,4059,3059][i])) }),
            new TableRow({ children: [
              cell('계약금', 2520, { fill: COLORS.lightBlue, bold: true, color: COLORS.brandBlue, align: AlignmentType.CENTER }),
              cell('계약 체결 후 3영업일 이내', 4059),
              cell(`총액의 ${paymentDeposit}% (${depositAmount})`, 3059, { align: AlignmentType.RIGHT, bold: true, color: COLORS.brandBlue }),
            ] }),
            new TableRow({ children: [
              cell('중도금', 2520, { fill: COLORS.lightBlue, bold: true, color: COLORS.brandBlue, align: AlignmentType.CENTER }),
              cell('행사 D-30일', 4059),
              cell(`총액의 ${paymentMid}% (${midAmount})`, 3059, { align: AlignmentType.RIGHT, bold: true, color: COLORS.brandBlue }),
            ] }),
            new TableRow({ children: [
              cell('잔금', 2520, { fill: COLORS.lightBlue, bold: true, color: COLORS.brandBlue, align: AlignmentType.CENTER }),
              cell('행사 종료 후 7영업일 이내', 4059),
              cell(`총액의 ${paymentFinal}% (${finalAmount})`, 3059, { align: AlignmentType.RIGHT, bold: true, color: COLORS.brandBlue }),
            ] }),
          ],
        }),
        ...spacer(1),
        heading2('4-1. 입금 계좌'),
        new Table({
          width: { size: 5000, type: WidthType.DXA },
          columnWidths: [1800, 3200],
          rows: [
            new TableRow({ children: [labelCell('은행', 1800), cell(bankName, 3200)] }),
            new TableRow({ children: [labelCell('계좌번호', 1800), cell(bankAccount, 3200)] }),
            new TableRow({ children: [labelCell('예금주', 1800), cell(bankHolder, 3200)] }),
          ],
        }),

        // ── 마무리 ────────────────────────────────────────────────
        new Paragraph({ children: [new PageBreak()] }),
        new Paragraph({
          spacing: { before: 1800, after: 0 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '본 제안서에 대해 궁금하신 사항은 언제든지 문의해 주세요.', font: 'Arial', size: 24, color: COLORS.gray })],
        }),
        ...spacer(2),
        new Table({
          width: { size: 7000, type: WidthType.DXA },
          columnWidths: [7000],
          rows: [new TableRow({ children: [
            new TableCell({
              borders: {
                top:    { style: BorderStyle.SINGLE, size: 6, color: COLORS.brandAccent },
                bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.brandAccent },
                left:   { style: BorderStyle.SINGLE, size: 6, color: COLORS.brandAccent },
                right:  { style: BorderStyle.SINGLE, size: 6, color: COLORS.brandAccent },
              },
              width: { size: 7000, type: WidthType.DXA },
              shading: { fill: COLORS.lightBlue, type: ShadingType.CLEAR },
              margins: { top: 300, bottom: 300, left: 400, right: 400 },
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: companyName, font: 'Arial', size: 32, bold: true, color: COLORS.brandBlue })] }),
                new Paragraph({ spacing: { before: 100 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: `담당: ${managerName} (${managerTitle})`, font: 'Arial', size: 22, color: '333333' })] }),
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
