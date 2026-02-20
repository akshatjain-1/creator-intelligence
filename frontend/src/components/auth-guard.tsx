"use client"

/**
 * Auth Guard — wraps the app with AuthProvider and handles routing.
 *
 * - Shows loading spinner while Firebase initializes
 * - Redirects unauthenticated users to /login
 * - Renders sidebar + content for authenticated users
 * - Passes through the /login page without sidebar
 */

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { AuthProvider, useAuth } from "@/components/auth-context"
import { Sidebar } from "@/components/layout/sidebar"

function AuthGuardInner({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()
    const pathname = usePathname()
    const router = useRouter()

    const isLoginPage = pathname === "/login"

    useEffect(() => {
        if (!loading && !user && !isLoginPage) {
            router.push("/login")
        }
    }, [loading, user, isLoginPage, router])

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
            </div>
        )
    }

    // Login page — no sidebar
    if (isLoginPage) {
        return <>{children}</>
    }

    // Not authenticated — show nothing while redirecting
    if (!user) {
        return null
    }

    // Authenticated — full layout with sidebar
    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                {children}
            </main>
        </div>
    )
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <AuthGuardInner>{children}</AuthGuardInner>
        </AuthProvider>
    )
}
