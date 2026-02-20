"use client"

/**
 * Auth context — provides Firebase auth state + active channel selection.
 *
 * Wraps the app in layout.tsx.
 * Exposes: user, loading, token, activeChannelId, setActiveChannelId, channels, logout
 */

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react"
import {
    onAuthStateChanged,
    signOut,
    type User as FirebaseUser,
} from "firebase/auth"
import { auth } from "@/lib/firebase"

interface Channel {
    id: string
    youtube_channel_id: string
    channel_name: string
    channel_avatar_url: string
    is_active: boolean
}

interface AuthContextValue {
    user: FirebaseUser | null
    loading: boolean
    token: string | null
    activeChannelId: string | null
    setActiveChannelId: (id: string) => void
    channels: Channel[]
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    loading: true,
    token: null,
    activeChannelId: null,
    setActiveChannelId: () => { },
    channels: [],
    logout: async () => { },
})

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<FirebaseUser | null>(null)
    const [loading, setLoading] = useState(true)
    const [token, setToken] = useState<string | null>(null)
    const [channels, setChannels] = useState<Channel[]>([])
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null)

    // Listen for Firebase auth state changes
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser)
            if (firebaseUser) {
                const idToken = await firebaseUser.getIdToken()
                setToken(idToken)
            } else {
                setToken(null)
                setChannels([])
                setActiveChannelId(null)
            }
            setLoading(false)
        })
        return unsub
    }, [])

    // When token is available, fetch connected channels
    useEffect(() => {
        if (!token) return

        const fetchChannels = async () => {
            try {
                const res = await fetch("http://localhost:8000/auth/channels", {
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (res.ok) {
                    const data: Channel[] = await res.json()
                    setChannels(data)
                    // Auto-select first channel if none active
                    if (data.length > 0 && !activeChannelId) {
                        setActiveChannelId(data[0].youtube_channel_id)
                    }
                }
            } catch (err) {
                console.error("Failed to fetch channels:", err)
            }
        }

        fetchChannels()
    }, [token])

    const logout = async () => {
        await signOut(auth)
        setUser(null)
        setToken(null)
        setChannels([])
        setActiveChannelId(null)
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                token,
                activeChannelId,
                setActiveChannelId,
                channels,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}
