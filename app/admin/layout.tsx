import { cookies } from 'next/headers'
import { parseAdminSessionFromValue, COOKIE_NAME } from '@/lib/admin-auth'
import { AdminShell } from '@/components/admin/AdminShell'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const c = await cookies()
  const token = c.get(COOKIE_NAME)?.value
  const session = parseAdminSessionFromValue(token)

  if (session) {
    return <AdminShell>{children}</AdminShell>
  }

  return <>{children}</>
}
