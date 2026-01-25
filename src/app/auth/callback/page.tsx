'use client'

import { useEffect } from 'react'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function AuthCallback() {
    const router = useRouter()
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const handleCallback = async () => {
            const { searchParams } = new URL(window.location.href)
            const code = searchParams.get('code')

            if (code) {
                try {
                    await supabase.auth.exchangeCodeForSession(code)
                } catch (error) {
                    console.error('Error exchanging code:', error)
                }
            }

            // Redirect to admin page after processing (or if no code found)
            router.push('/admin')
            router.refresh()
        }

        handleCallback()
    }, [supabase.auth, router])

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                <p className="text-lg text-muted-foreground">Authenticating...</p>
            </div>
        </div>
    )
}
