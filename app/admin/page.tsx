import { cookies } from 'next/headers'
import { parseAdminSessionFromValue, COOKIE_NAME } from '@/lib/admin-auth'
import { AdminLoginForm } from './AdminLoginForm'
import { AdminDashboard } from './AdminDashboard'

export const dynamic = 'force-dynamic'

type SearchParams = { returnTo?: string }

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  const c = await cookies()
  const token = c.get(COOKIE_NAME)?.value
  const session = parseAdminSessionFromValue(token)
  if (session) return <AdminDashboard />
  const returnTo = typeof searchParams?.returnTo === 'string' ? searchParams.returnTo : undefined
  return <AdminLoginForm returnTo={returnTo} />
}
