import { redirect } from 'next/navigation'

export default function GenerateLegacyPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(searchParams || {})) {
    if (typeof v === 'string') sp.set(k, v)
  }
  const qs = sp.toString()
  redirect(`/estimate-generator${qs ? `?${qs}` : ''}`)
}

