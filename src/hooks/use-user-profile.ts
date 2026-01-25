import { useEffect, useState } from 'react'

// Mock user type for when auth is disabled
type MockUser = {
    id: string
    email: string
}

export type Profile = {
    id: string
    email: string
    full_name: string
    avatar_url: string
    role: 'user' | 'admin'
}

export function useUserProfile() {
    const [user, setUser] = useState<MockUser | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
        // Auth disabled - return mock admin user for local development
        const mockUser: MockUser = {
            id: 'local-admin',
            email: 'admin@local'
        }
        
        const mockProfile: Profile = {
            id: 'local-admin',
            email: 'admin@local',
            full_name: 'Local Admin',
            avatar_url: '',
            role: 'admin'
        }

        setUser(mockUser)
        setProfile(mockProfile)
        setIsAdmin(true)
        setLoading(false)
    }, [])

    return {
        user,
        profile,
        isAdmin,
        loading
    }
}
