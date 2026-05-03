import { getServerSession } from 'next-auth/next'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { signOut } from 'next-auth/react'
import HomeClient from '@/app/HomeClient'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  return <HomeClient userEmail={session?.user?.email ?? null} />
}
