import { cookies } from 'next/headers'
import { parseAdminSessionFromValue, COOKIE_NAME } from '@/lib/admin-auth'
import { AdminLoginForm } from './AdminLoginForm'
import { AdminDashboard } from './AdminDashboard'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const c = await cookies()
  const token = c.get(COOKIE_NAME)?.value
  const session = parseAdminSessionFromValue(token)
  if (session) return <AdminDashboard />
  return <AdminLoginForm />
}
