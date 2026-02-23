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
    useCallback,
    useRef,
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
    refreshToken: () => Promise<string | null>
    refreshChannels: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    loading: true,
    token: null,
    activeChannelId: null,
    setActiveChannelId: () => { },
    channels: [],
    logout: async () => { },
    refreshToken: async () => null,
    refreshChannels: async () => { },
})

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<FirebaseUser | null>(null)
    const [loading, setLoading] = useState(true)
    const [token, setToken] = useState<string | null>(null)
    const [channels, setChannels] = useState<Channel[]>([])
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)

    // Force-refresh the Firebase ID token
    const refreshToken = useCallback(async (): Promise<string | null> => {
        const currentUser = auth.currentUser
        if (!currentUser) return null
        try {
            // forceRefresh = true -> always gets a fresh token
            const freshToken = await currentUser.getIdToken(true)
            setToken(freshToken)
            return freshToken
        } catch (err) {
            console.error("Failed to refresh token:", err)
            return null
        }
    }, [])

    // Listen for Firebase auth state changes
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser)
            if (firebaseUser) {
                const idToken = await firebaseUser.getIdToken(true)
                setToken(idToken)

                // Refresh token every 50 minutes (tokens expire at 60 min)
                if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
                refreshTimerRef.current = setInterval(async () => {
                    try {
                        const fresh = await firebaseUser.getIdToken(true)
                        setToken(fresh)
                    } catch (err) {
                        console.error("Token auto-refresh failed:", err)
                    }
                }, 50 * 60 * 1000) // 50 minutes
            } else {
                setToken(null)
                setChannels([])
                setActiveChannelId(null)
                if (refreshTimerRef.current) {
                    clearInterval(refreshTimerRef.current)
                    refreshTimerRef.current = null
                }
            }
            setLoading(false)
        })

        return () => {
            unsub()
            if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
        }
    }, [])

    // Reusable channel-fetching logic
    const refreshChannels = useCallback(async () => {
        const currentToken = token || (auth.currentUser ? await auth.currentUser.getIdToken(true) : null)
        if (!currentToken) return

        try {
            const res = await fetch("http://localhost:8000/auth/channels", {
                headers: { Authorization: `Bearer ${currentToken}` },
            })
            if (res.ok) {
                const data: Channel[] = await res.json()
                setChannels(data)
                if (data.length > 0 && !activeChannelId) {
                    setActiveChannelId(data[0].youtube_channel_id)
                }
            }
        } catch (err) {
            console.error("Failed to fetch channels:", err)
        }
    }, [token, activeChannelId])

    // When token is available, fetch connected channels
    useEffect(() => {
        if (!token) return
        refreshChannels()
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
                refreshToken,
                refreshChannels,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}
