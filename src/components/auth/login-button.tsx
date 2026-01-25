'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, User } from 'lucide-react'

export function LoginButton() {
    const [loading, setLoading] = useState(false)

    const handleLogin = async () => {
        // Auth disabled - just show a message or auto-login as mock user
        setLoading(true)
        // Simulate a brief delay then reload to trigger mock user
        setTimeout(() => {
            window.location.reload()
        }, 500)
    }

    return (
        <Button onClick={handleLogin} disabled={loading} variant="outline" className="gap-2">
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <User className="h-4 w-4" />
            )}
            Continue as Admin
        </Button>
    )
}
