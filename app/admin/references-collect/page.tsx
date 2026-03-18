'use client'

import Link from 'next/link'

/**
 * 외부 자료 수집 (웹 샘플 수집 / 레퍼런스 수집)
 * 흐름: 수집 → 검토 → 샘플 등록 (바로 생성에 쓰지 않음)
 */
export default function AdminReferencesCollectPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-gray-900">외부 자료 수집</h1>
        <p className="text-sm text-gray-600 mt-1 max-w-2xl">
          웹상의 견적서·제안서·과업지시서·기획서 등을 <strong>수집한 뒤 검토하고, 기준 양식으로 등록</strong>하는 메뉴입니다.
          수집된 자료는 바로 생성에 반영되지 않고, 운영자가 검토 후 「기준 양식 관리」로 넘겨야 합니다.
        </p>
      </div>

      {/* 예정 기능 */}
      <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">예정 기능</h2>
        <ul className="space-y-2 text-sm text-gray-600 list-disc list-inside">
          <li><strong>키워드 기반 자료 수집</strong> — 검색어로 문서 후보 수집</li>
          <li><strong>URL 등록 기반 수집</strong> — URL 입력 시 해당 페이지/문서를 후보로 추가</li>
          <li><strong>문서 후보 목록</strong> — 제목, URL, 유형, 수집일</li>
          <li><strong>문서 미리보기</strong> — 텍스트/구조 미리보기</li>
          <li><strong>문서 유형 지정</strong> — 견적서, 제안서, 과업지시서, 행사 기획서, 운영계획서, 큐시트, 타임테이블, 시나리오</li>
          <li><strong>샘플로 저장</strong> — 후보를 기준 양식으로 저장</li>
          <li><strong>기준 양식 관리로 넘기기</strong> — 등록 시 연결 탭·반영 방식 설정 후 기준 양식 테이블에 반영</li>
        </ul>
        <p className="text-xs text-gray-500 mt-4">
          수집 대상: 견적서, 제안서, 과업지시서, 행사 기획서, 운영계획서, 큐시트, 타임테이블, 시나리오
        </p>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
        <p className="text-sm text-amber-900">
          이 기능은 현재 준비 중입니다. 외부 자료를 활용하려면 먼저 파일을 다운로드한 뒤 사용자 「참고」 메뉴에서 업로드하거나,
          관리자 <Link href="/admin/samples" className="font-medium underline">기준 양식 관리</Link>에서 복제 기능을 사용해 등록할 수 있습니다.
        </p>
      </section>

      <p className="text-xs text-gray-400">
        설계 상세: <code className="bg-slate-100 px-1 rounded">docs/ADMIN_REDESIGN.md</code> — 외부 자료 수집 구조·DB 제안 참고
      </p>
    </div>
  )
}
