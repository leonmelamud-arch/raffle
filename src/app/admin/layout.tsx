'use client'

import { useUserProfile } from '@/hooks/use-user-profile'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, profile, isAdmin, loading } = useUserProfile()
    const router = useRouter()

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/')
            } else if (!isAdmin) {
                router.push('/')
            }
        }
    }, [user, isAdmin, loading, router])

    if (loading || !isAdmin) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        )
    }

    return <>{children}</>
}
