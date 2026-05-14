import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react'

const MAX_QUEUE_LENGTH = 12
const MAX_NOTE_LENGTH = 600

/**
 * 생성이 진행 중일 때 보강 메모를 큐에 넣고, 생성이 끝나면 `setNotes`로 한꺼번에 합칩니다.
 * (다음 "생성" 클릭 시 이미 notes에 포함되어 반영됩니다.)
 */
export function useGeneratorRefineQueue(showToast: (message: string) => void) {
  const queueRef = useRef<string[]>([])
  const announcedRef = useRef(false)
  const [queuedCount, setQueuedCount] = useState(0)

  const enqueue = useCallback(
    (note: string) => {
      const t = note.trim().slice(0, MAX_NOTE_LENGTH)
      if (t.length < 2) return
      if (queueRef.current.length >= MAX_QUEUE_LENGTH) {
        showToast('대기 중인 보강 메모가 많아요. 먼저 생성이 끝난 뒤 다시 적어 주세요.')
        return
      }
      if (queueRef.current.some((existing) => existing === t)) {
        showToast('같은 보강 메모가 이미 대기 중이에요.')
        return
      }
      queueRef.current.push(t)
      const nextCount = queueRef.current.length
      setQueuedCount(nextCount)
      if (!announcedRef.current) {
        announcedRef.current = true
        showToast('생성이 끝나면 요청사항에 합쳐 드릴게요. 끝난 뒤 다시 생성하면 반영돼요.')
      } else {
        showToast(`보강 메모를 대기열에 담았어요. (대기 ${nextCount})`)
      }
    },
    [showToast],
  )

  const flushQueuedIntoNotes = useCallback(
    (setNotes: Dispatch<SetStateAction<string>>, options?: { success?: boolean }) => {
      const drained = [...queueRef.current]
      queueRef.current = []
      setQueuedCount(0)
      announcedRef.current = false
      if (!drained.length) return
      setNotes((prev) => {
        const base = (prev || '').trim()
        const fresh = drained.filter((note) => {
          const marker = `[보강 메모] ${note}`
          return !base.includes(marker)
        })
        if (!fresh.length) return base
        const block = fresh.map((n) => `[보강 메모] ${n}`).join('\n\n')
        return base ? `${base}\n\n${block}` : block
      })
      if (options?.success === false) {
        showToast('생성이 끝나지 않았지만, 대기 중이던 보강 메모는 요청사항에 합쳐 두었어요.')
      } else {
        showToast('생성 중 적어 둔 보강 메모를 요청사항에 합쳤어요. 확인 후 필요하면 다시 생성해 주세요.')
      }
    },
    [showToast],
  )

  const resetQueue = useCallback(() => {
    queueRef.current = []
    setQueuedCount(0)
    announcedRef.current = false
  }, [])

  return { enqueue, flushQueuedIntoNotes, queuedCount, resetQueue }
}
