'use client'

import { useUserProfile } from '@/hooks/use-user-profile'
import { LoginButton } from './login-button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Link from 'next/link'
import { LogOut, User as UserIcon, Shield } from 'lucide-react'

export function UserProfile() {
    const { user, profile, isAdmin, loading } = useUserProfile()

    if (loading) {
        return <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
    }

    if (!user) {
        return <LoginButton />
    }

    const handleLogout = async () => {
        // Auth disabled - just reload page
        window.location.reload()
    }

    const initials = profile?.full_name
        ?.split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || '?'

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={profile?.avatar_url} alt={profile?.full_name || 'User'} />
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{profile?.full_name || 'User'}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {profile?.email || 'admin@local'}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/qr-ref" className="cursor-pointer">
                        <UserIcon className="mr-2 h-4 w-4" />
                        <span>QR Reference</span>
                    </Link>
                </DropdownMenuItem>

                {isAdmin && (
                    <DropdownMenuItem asChild>
                        <Link href="/admin" className="cursor-pointer font-medium text-purple-600">
                            <Shield className="mr-2 h-4 w-4" />
                            <span>Admin Dashboard</span>
                        </Link>
                    </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
