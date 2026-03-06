"use client"

/**
 * Login page — Firebase Google sign-in with premium split layout.
 */

import { useState } from "react"
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { Zap } from "lucide-react"

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
        <div className="min-h-screen flex">
            {/* Left Panel — Geometric Art */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-card items-center justify-center">
                {/* Abstract shapes */}
                <div className="absolute inset-0">
                    {/* Large coral circle */}
                    <div
                        className="absolute w-96 h-96 rounded-full opacity-20 animate-float"
                        style={{ background: 'radial-gradient(circle, #FF6B6B 0%, transparent 70%)', top: '10%', left: '20%' }}
                    />
                    {/* Teal blob */}
                    <div
                        className="absolute w-72 h-72 rounded-full opacity-15 animate-float-slow"
                        style={{ background: 'radial-gradient(circle, #4ECDC4 0%, transparent 70%)', bottom: '15%', right: '10%', animationDelay: '-3s' }}
                    />
                    {/* Amber accent */}
                    <div
                        className="absolute w-48 h-48 rounded-full opacity-20 animate-float"
                        style={{ background: 'radial-gradient(circle, #FFD93D 0%, transparent 70%)', top: '60%', left: '10%', animationDelay: '-2s' }}
                    />

                    {/* Grid lines */}
                    <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                </div>

                {/* Center content */}
                <div className="relative z-10 text-center px-12">
                    <h2 className="text-4xl font-bold tracking-tight text-foreground mb-4">
                        Understand your
                        <br />
                        <span className="text-gradient-warm">audience deeply</span>
                    </h2>
                    <p className="text-muted-foreground text-lg max-w-md mx-auto">
                        AI-powered hook analysis, velocity tracking, and actionable insights for every video you publish.
                    </p>
                </div>
            </div>

            {/* Right Panel — Login Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-sm space-y-8">
                    {/* Logo */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl gradient-coral flex items-center justify-center">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold tracking-tight text-gradient-warm">
                                Creator Intelligence
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Welcome back
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Sign in to access your YouTube analytics dashboard.
                        </p>
                    </div>

                    {/* Sign-in button */}
                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 rounded-xl
                                   bg-white text-gray-800 font-medium py-3.5 px-6
                                   hover:bg-gray-50 hover:scale-[1.01] active:scale-[0.99]
                                   transition-all duration-200
                                   disabled:opacity-50 disabled:cursor-not-allowed
                                   shadow-lg shadow-white/5"
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
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    )}

                    <p className="text-xs text-muted-foreground text-center">
                        By continuing, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </div>
            </div>
        </div>
    )
}
