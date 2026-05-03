import cuesheet from '@/src/data/cuesheet'
import styles from '@/src/components/CuesheetTable.module.css'

const badgeClassByType = {
  개인전: styles.typeIndividual,
  팀전: styles.typeTeam,
  전체: styles.typeAll,
  운영: styles.typeOps,
}

export default function CuesheetTable() {
  const rows = []
  let previousSection = ''

  for (const item of cuesheet) {
    if (item.section !== previousSection) {
      rows.push(
        <tr key={`section-${item.section}`} className={styles.sectionRow}>
          <td colSpan={7} className={styles.sectionCell}>
            {item.section}
          </td>
        </tr>,
      )
      previousSection = item.section
    }

    rows.push(
      <tr key={item.id} className={styles.dataRow}>
        <td className={styles.timeCell}>{item.time}</td>
        <td>{item.duration}</td>
        <td className={styles.programCell}>{item.program}</td>
        <td className={styles.detailCell}>{item.detail}</td>
        <td>
          <span className={`${styles.typeBadge} ${badgeClassByType[item.type] ?? ''}`}>
            {item.type}
          </span>
        </td>
        <td>{item.manager ? item.manager : null}</td>
        <td>{item.note ? item.note : null}</td>
      </tr>,
    )
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>시간</th>
            <th>소요</th>
            <th>프로그램</th>
            <th>세부내용</th>
            <th>형태</th>
            <th>담당</th>
            <th>비고</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  )
}
