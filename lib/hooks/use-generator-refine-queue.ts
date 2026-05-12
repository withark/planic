import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react'

/**
 * 생성이 진행 중일 때 보강 메모를 큐에 넣고, 생성이 끝나면 `setNotes`로 한꺼번에 합칩니다.
 * (다음 "생성" 클릭 시 이미 notes에 포함되어 반영됩니다.)
 */
export function useGeneratorRefineQueue(showToast: (message: string) => void) {
  const queueRef = useRef<string[]>([])
  const [queuedCount, setQueuedCount] = useState(0)

  const enqueue = useCallback(
    (note: string) => {
      const t = note.trim()
      if (t.length < 2) return
      queueRef.current.push(t)
      setQueuedCount(queueRef.current.length)
      showToast('생성이 끝나면 요청사항에 합쳐 드릴게요. 끝난 뒤 다시 생성하면 반영돼요.')
    },
    [showToast],
  )

  const flushQueuedIntoNotes = useCallback(
    (setNotes: Dispatch<SetStateAction<string>>, options?: { success?: boolean }) => {
      const drained = [...queueRef.current]
      queueRef.current = []
      setQueuedCount(0)
      if (!drained.length) return
      setNotes((prev) => {
        const base = (prev || '').trim()
        const block = drained.map((n) => `[보강 메모] ${n}`).join('\n\n')
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
  }, [])

  return { enqueue, flushQueuedIntoNotes, queuedCount, resetQueue }
}
