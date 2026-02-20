"use client"

/**
 * Login page — Firebase Google sign-in.
 */

import { useState } from "react"
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"

export default function LoginPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleLogin = async () => {
        setLoading(true)
        setError(null)
        try {
            const provider = new GoogleAuthProvider()
            provider.addScope("https://www.googleapis.com/auth/userinfo.email")
            await signInWithPopup(auth, provider)
            router.push("/dashboard")
        } catch (err: any) {
            setError(err.message ?? "Login failed")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="w-full max-w-md space-y-8 p-8 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm">
                {/* Logo / Branding */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 mb-4">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-8 h-8 text-white"
                        >
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Creator Intelligence
                    </h1>
                    <p className="text-muted-foreground">
                        AI-powered analytics for YouTube creators
                    </p>
                </div>

                {/* Sign-in button */}
                <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 rounded-xl
                               bg-white text-gray-800 font-medium py-3 px-6
                               hover:bg-gray-50 transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed
                               border border-gray-200 shadow-sm"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 488 512"
                        className="w-5 h-5"
                    >
                        <path
                            fill="#4285F4"
                            d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                        />
                    </svg>
                    {loading ? "Signing in..." : "Continue with Google"}
                </button>

                {/* Error message */}
                {error && (
                    <p className="text-sm text-red-400 text-center">{error}</p>
                )}

                <p className="text-xs text-muted-foreground text-center">
                    By continuing, you agree to our Terms of Service and Privacy Policy.
                </p>
            </div>
        </div>
    )
}
