'use client'

import CuesheetTable from '@/src/components/CuesheetTable'
import styles from '@/src/components/CuesheetTable.module.css'

const metaBadges = ['참가인원 200명 이상', '반나절 5~6시간', '개인전+팀전 혼합']

export default function CuesheetPage() {
  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <div className={styles.headerCopy}>
          <h1 className={styles.title}>명랑 운동회 큐시트</h1>
          <div className={styles.metaBadges}>
            {metaBadges.map((badge) => (
              <span key={badge} className={styles.metaBadge}>
                {badge}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          className={`${styles.printButton} ${styles.noPrint}`}
          onClick={() => window.print()}
        >
          인쇄하기
        </button>
      </section>
      <CuesheetTable />
    </main>
  )
}
