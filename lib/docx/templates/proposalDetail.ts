// lib/docx/templates/proposalDetail.ts — 2단계: 세부 프로그램 포함 제안서

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

export async function generateProposalDetail(data: any): Promise<Buffer> {
  const {
    // 기본 정보
    eventName       = '{{행사명}}',
    eventDate       = '{{행사일시}}',
    eventVenue      = '{{행사장소}}',
    organizer       = '{{주최기관}}',
    expectedPeople  = '{{예상인원}}',
    eventType       = '{{행사유형}}',
    // 기획 방향
    background      = '{{행사 배경 및 목적}}',
    concept         = '{{행사 슬로건/컨셉}}',
    theme           = '{{행사 테마}}',
    keyPoints       = ['{{기획 포인트 1}}', '{{기획 포인트 2}}', '{{기획 포인트 3}}'],
    targetAudience  = '{{타겟 참석자}}',
    // 세부 프로그램
    programs = [
      { time: '{{시간}}', program: '등록 및 접수',  content: '참석자 등록, 네임택 배포, 자료집 제공', note: '' },
      { time: '{{시간}}', program: '개회식',         content: '개회사, VIP 인사말',                  note: '' },
      { time: '{{시간}}', program: '{{프로그램1}}',  content: '{{내용}}',                            note: '' },
      { time: '{{시간}}', program: '네트워킹/휴식',  content: '다과 및 네트워킹',                    note: '' },
      { time: '{{시간}}', program: '{{프로그램2}}',  content: '{{내용}}',                            note: '' },
      { time: '{{시간}}', program: '폐회',            content: '폐회사 및 기념촬영',                  note: '' },
    ],
    // 준비 일정
    schedule = [
      { dday: 'D-60',  task: '행사 기획 확정, 장소 계약',        person: '{{담당}}' },
      { dday: 'D-45',  task: '초청장 발송, 연사 섭외 확정',      person: '{{담당}}' },
      { dday: 'D-30',  task: '홍보물 제작, 참가 등록 오픈',      person: '{{담당}}' },
      { dday: 'D-14',  task: '최종 인원 확인, 운영 매뉴얼 작성', person: '{{담당}}' },
      { dday: 'D-7',   task: '현장 답사, 리허설 일정 확인',      person: '{{담당}}' },
      { dday: 'D-1',   task: '현장 셋업, 장비 테스트',           person: '{{담당}}' },
      { dday: 'D-Day', task: '행사 진행',                        person: '전 팀'    },
      { dday: 'D+1',   task: '결과 보고서 작성, 정산',           person: '{{담당}}' },
    ],
    // 운영팀 구성
    team = [
      { role: '총괄 PD',      name: '{{이름}}', tasks: '행사 총괄, 의사결정, 클라이언트 커뮤니케이션' },
      { role: '현장 매니저',  name: '{{이름}}', tasks: '현장 운영 총괄, 스태프 관리, 돌발상황 대응' },
      { role: '등록/안내',    name: '{{이름}}', tasks: '참석자 등록, 안내 데스크 운영' },
      { role: '무대/기술',    name: '{{이름}}', tasks: '음향, 영상, 조명 운영' },
      { role: '포토/영상',    name: '{{이름}}', tasks: '현장 촬영 및 SNS 실시간 업로드' },
    ],
    // 리스크 관리
    risks = [
      { risk: '기상 악화 (야외 행사)', prevention: '실내 대체 장소 사전 확보',   response: '우천 시 즉시 실내 이동 공지' },
      { risk: '연사 지각/불참',        prevention: '대체 연사 사전 섭외',        response: '사전 녹화 영상 활용' },
      { risk: '기술 장비 오류',        prevention: '예비 장비 현장 준비',        response: '기술팀 즉각 대응' },
      { risk: '예상 초과 인원',        prevention: '여유 좌석 10% 확보',         response: '입장 통제 및 대기 시스템 운영' },
    ],
    // 회사 소개
    companyName    = '{{회사명}}',
    foundedYear    = '{{설립연도}}',
    representative = '{{대표자명}}',
    address        = '{{회사 주소}}',
    mainBusiness   = '행사 기획 / 운영 / 공연 / 전시 / 컨퍼런스',
    portfolios = [
      { year: '2024', name: '{{행사명}}', client: '{{클라이언트}}', scale: '{{규모}}명' },
      { year: '2024', name: '{{행사명}}', client: '{{클라이언트}}', scale: '{{규모}}명' },
      { year: '2023', name: '{{행사명}}', client: '{{클라이언트}}', scale: '{{규모}}명' },
      { year: '2023', name: '{{행사명}}', client: '{{클라이언트}}', scale: '{{규모}}명' },
    ],
    managerName    = '{{담당자명}}',
    contact        = '{{연락처}}',
    email          = '{{이메일}}',
    proposalDate   = new Date().toLocaleDateString('ko-KR'),
  } = data;

  const doc = new DocxDocument({
    numbering: NUMBERING_CONFIG,
    styles: BASE_STYLES,
    sections: [{
      properties: { page: PAGE_A4 },
      headers: { default: makeHeader(companyName, '행사 기획 제안서 (세부)') },
      footers: { default: makeFooter(companyName, contact, email) },
      children: [

        // ── 커버 ──────────────────────────────────────────────────
        new Paragraph({
          spacing: { before: 1400, after: 0 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '행사 기획', font: 'Arial', size: 52, color: COLORS.gray })],
        }),
        new Paragraph({
          spacing: { before: 40, after: 0 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '세부 제안서', font: 'Arial', size: 80, bold: true, color: COLORS.brandBlue })],
        }),
        new Paragraph({
          spacing: { before: 80, after: 0 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'DETAILED EVENT PROPOSAL', font: 'Arial', size: 32, color: COLORS.brandAccent })],
        }),
        ...spacer(4),
        new Table({
          width: { size: 7638, type: WidthType.DXA },
          columnWidths: [2520, 5118],
          rows: [
            infoRow('행사명',   eventName),
            infoRow('행사 일시', eventDate),
            infoRow('행사 장소', eventVenue),
            infoRow('주최',      organizer),
            infoRow('참석 인원', `${expectedPeople}명`),
            infoRow('제안 일자', proposalDate),
            infoRow('제안사',    companyName),
            infoRow('담당자',    `${managerName}  |  ${contact}`),
          ],
        }),
        ...spacer(3),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '본 제안서의 모든 내용은 대외비로 취급됩니다.', font: 'Arial', size: 18, color: COLORS.gray, italics: true })],
        }),
        new Paragraph({ children: [new PageBreak()] }),

        // ── 1. 제안 개요 ───────────────────────────────────────────
        heading1('1. 제안 개요'),
        heading2('1-1. 행사 배경 및 목적'),
        new Paragraph({ spacing: { before: 80, after: 80 }, children: [new TextRun({ text: background, font: 'Arial', size: 22, color: '333333' })] }),
        ...spacer(1),
        heading2('1-2. 행사 기본 정보'),
        new Table({
          width: { size: 9638, type: WidthType.DXA },
          columnWidths: [2409, 2409, 2411, 2409],
          rows: [
            new TableRow({ children: ['구분','일시','장소','참석 인원'].map((h,i)=>headerCell(h,[2409,2409,2411,2409][i])) }),
            new TableRow({ children: [
              cell(eventType,          2409, { align: AlignmentType.CENTER }),
              cell(eventDate,          2409, { align: AlignmentType.CENTER }),
              cell(eventVenue,         2411, { align: AlignmentType.CENTER }),
              cell(`${expectedPeople}명`, 2409, { align: AlignmentType.CENTER }),
            ] }),
          ],
        }),
        ...spacer(1),

        // ── 2. 기획 방향 ───────────────────────────────────────────
        heading1('2. 행사 기획 방향'),
        heading2('2-1. 핵심 컨셉'),
        new Table({
          width: { size: 9638, type: WidthType.DXA },
          columnWidths: [4819, 4819],
          rows: [
            new TableRow({ children: [
              new TableCell({
                borders: borders.solid(), width: { size: 4819, type: WidthType.DXA },
                shading: { fill: COLORS.lightBlue, type: ShadingType.CLEAR },
                margins: { top: 200, bottom: 200, left: 240, right: 240 },
                children: [
                  new Paragraph({ children: [new TextRun({ text: '행사 슬로건', font: 'Arial', size: 20, bold: true, color: COLORS.brandBlue })] }),
                  new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: concept, font: 'Arial', size: 24, bold: true, color: '333333' })] }),
                ],
              }),
              new TableCell({
                borders: borders.solid(), width: { size: 4819, type: WidthType.DXA },
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
        ...keyPoints.map((pt: string) => new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          spacing: { before: 60, after: 60 },
          children: [new TextRun({ text: pt, font: 'Arial', size: 22, color: '333333' })],
        })),
        ...spacer(1),
        heading2('2-3. 타겟 참석자'),
        new Paragraph({ spacing: { before: 80, after: 80 }, children: [new TextRun({ text: targetAudience, font: 'Arial', size: 22, color: '333333' })] }),

        // ── 3. 세부 프로그램 ───────────────────────────────────────
        new Paragraph({ children: [new PageBreak()] }),
        heading1('3. 세부 진행 계획'),
        heading2('3-1. 행사 프로그램 타임테이블'),
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
        ...spacer(1),
        heading2('3-2. 준비 일정'),
        new Table({
          width: { size: 9638, type: WidthType.DXA },
          columnWidths: [1800, 5638, 2200],
          rows: [
            new TableRow({ children: ['일정','업무 내용','담당'].map((h,i)=>headerCell(h,[1800,5638,2200][i])) }),
            ...schedule.map((s: { dday: string; task: string; person: string }) => new TableRow({ children: [
              cell(s.dday,   1800, { fill: COLORS.lightBlue, bold: true, color: COLORS.brandBlue, align: AlignmentType.CENTER }),
              cell(s.task,   5638),
              cell(s.person, 2200, { align: AlignmentType.CENTER }),
            ] })),
          ],
        }),

        // ── 4. 운영 방안 ───────────────────────────────────────────
        new Paragraph({ children: [new PageBreak()] }),
        heading1('4. 운영 방안'),
        heading2('4-1. 운영팀 구성'),
        new Table({
          width: { size: 9638, type: WidthType.DXA },
          columnWidths: [2000, 2638, 5000],
          rows: [
            new TableRow({ children: ['구분','담당자','주요 역할'].map((h,i)=>headerCell(h,[2000,2638,5000][i])) }),
            ...team.map((t: { role: string; name: string; tasks: string }) => new TableRow({ children: [
              cell(t.role,  2000, { fill: COLORS.lightBlue, bold: true, color: COLORS.brandBlue }),
              cell(t.name,  2638, { align: AlignmentType.CENTER }),
              cell(t.tasks, 5000),
            ] })),
          ],
        }),
        ...spacer(1),
        heading2('4-2. 리스크 관리'),
        new Table({
          width: { size: 9638, type: WidthType.DXA },
          columnWidths: [2500, 3569, 3569],
          rows: [
            new TableRow({ children: ['리스크 항목','예방 조치','비상 대응책'].map((h,i)=>headerCell(h,[2500,3569,3569][i])) }),
            ...risks.map((r: { risk: string; prevention: string; response: string }) => new TableRow({ children: [
              cell(r.risk,       2500, { bold: true }),
              cell(r.prevention, 3569),
              cell(r.response,   3569),
            ] })),
          ],
        }),

        // ── 5. 제안사 소개 ─────────────────────────────────────────
        new Paragraph({ children: [new PageBreak()] }),
        heading1('5. 제안사 소개'),
        heading2('5-1. 회사 개요'),
        new Table({
          width: { size: 9638, type: WidthType.DXA },
          columnWidths: [2520, 7118],
          rows: [
            infoRow('회사명',     companyName),
            infoRow('설립연도',   foundedYear),
            infoRow('주요 서비스', mainBusiness),
            infoRow('대표자',     representative),
            infoRow('주소',       address),
            infoRow('연락처',     `${contact}  |  ${email}`),
          ],
        }),
        ...spacer(1),
        heading2('5-2. 주요 행사 실적'),
        new Table({
          width: { size: 9638, type: WidthType.DXA },
          columnWidths: [1800, 3638, 2400, 1800],
          rows: [
            new TableRow({ children: ['연도','행사명','클라이언트','규모'].map((h,i)=>headerCell(h,[1800,3638,2400,1800][i])) }),
            ...portfolios.map((p: { year: string; name: string; client: string; scale: string }) => new TableRow({ children: [
              cell(p.year,   1800, { align: AlignmentType.CENTER }),
              cell(p.name,   3638),
              cell(p.client, 2400, { align: AlignmentType.CENTER }),
              cell(p.scale,  1800, { align: AlignmentType.CENTER }),
            ] })),
          ],
        }),

        // ── 마무리 ────────────────────────────────────────────────
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
