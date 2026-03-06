"use client"

/**
 * Settings Page — Account info, connected channels, and channel management.
 */

import { useState } from "react"
import {
    User,
    Youtube,
    Trash2,
    Plus,
    Shield,
    LogOut,
    Mail,
    Calendar,
    AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-context"
import { disconnectChannel } from "@/lib/api"

export default function SettingsPage() {
    const { user, token, channels, activeChannelId, setActiveChannelId, logout, refreshChannels } = useAuth()

    const [disconnecting, setDisconnecting] = useState<string | null>(null)
    const [confirmDisconnect, setConfirmDisconnect] = useState<string | null>(null)

    const handleDisconnect = async (channelId: string) => {
        setDisconnecting(channelId)
        try {
            await disconnectChannel(token, channelId)
            // If the disconnected channel was active, clear it
            const channel = channels.find((c) => c.id === channelId)
            if (channel && channel.youtube_channel_id === activeChannelId) {
                const remaining = channels.filter((c) => c.id !== channelId)
                if (remaining.length > 0) {
                    setActiveChannelId(remaining[0].youtube_channel_id)
                }
            }
            await refreshChannels()
            setConfirmDisconnect(null)
        } catch (err) {
            console.error("Failed to disconnect channel:", err)
        } finally {
            setDisconnecting(null)
        }
    }

    const handleConnectNew = () => {
        if (!token) return
        window.location.href = `http://localhost:8000/auth/login?token=${encodeURIComponent(token)}`
    }

    return (
        <div className="space-y-8 max-w-3xl mx-auto pb-20">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground mt-1">
                    Manage your account and connected YouTube channels.
                </p>
            </div>

            {/* ═══ Account Section ═══ */}
            <section className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border/30 flex items-center gap-2">
                    <User className="h-5 w-5 text-coral" />
                    <h2 className="text-lg font-semibold">Account</h2>
                </div>
                <div className="p-6 space-y-4">
                    {user && (
                        <div className="flex items-center gap-4">
                            {user.photoURL && (
                                <img
                                    src={user.photoURL}
                                    alt=""
                                    className="w-16 h-16 rounded-full border-2 border-coral/30"
                                />
                            )}
                            <div>
                                <p className="text-lg font-semibold">{user.displayName ?? "User"}</p>
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <Mail className="h-3.5 w-3.5" />
                                    {user.email}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                    <Shield className="h-3 w-3" />
                                    Signed in via Google (Firebase)
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Account Actions */}
                    <div className="pt-4 border-t border-border/30 flex gap-3">
                        <button
                            onClick={logout}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-coral/10
                                       text-coral hover:bg-coral/20 transition-colors text-sm font-medium"
                        >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </section>

            {/* ═══ Connected Channels Section ═══ */}
            <section className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Youtube className="h-5 w-5 text-red-400" />
                        <h2 className="text-lg font-semibold">Connected Channels</h2>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                            {channels.length}
                        </span>
                    </div>
                    <button
                        onClick={handleConnectNew}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal/10
                                   text-teal hover:bg-teal/20 transition-colors text-sm font-medium"
                    >
                        <Plus className="h-4 w-4" />
                        Connect Channel
                    </button>
                </div>

                <div className="p-6">
                    {channels.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Youtube className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No channels connected yet.</p>
                            <p className="text-xs mt-1">
                                Click &ldquo;Connect Channel&rdquo; above to get started.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {channels.map((channel) => {
                                const isActive = channel.youtube_channel_id === activeChannelId
                                const isConfirming = confirmDisconnect === channel.id
                                const isDisconnecting = disconnecting === channel.id

                                return (
                                    <div
                                        key={channel.id}
                                        className={cn(
                                            "flex items-center gap-4 p-4 rounded-lg border transition-all",
                                            isActive
                                                ? "border-coral/30 bg-coral/5"
                                                : "border-border/30 hover:border-border/50"
                                        )}
                                    >
                                        {/* Channel Avatar */}
                                        {channel.channel_avatar_url ? (
                                            <img
                                                src={channel.channel_avatar_url}
                                                alt=""
                                                className="w-12 h-12 rounded-full flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                                <Youtube className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                        )}

                                        {/* Channel Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium truncate">
                                                    {channel.channel_name || "Unnamed Channel"}
                                                </p>
                                                {isActive && (
                                                    <span className="text-[10px] font-semibold bg-coral/20 text-coral px-1.5 py-0.5 rounded-full">
                                                        ACTIVE
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                ID: {channel.youtube_channel_id}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {!isActive && (
                                                <button
                                                    onClick={() => setActiveChannelId(channel.youtube_channel_id)}
                                                    className="text-xs px-3 py-1.5 rounded-md bg-muted hover:bg-muted/80
                                                               text-muted-foreground hover:text-foreground transition-colors font-medium"
                                                >
                                                    Switch to
                                                </button>
                                            )}

                                            {isConfirming ? (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleDisconnect(channel.id)}
                                                        disabled={isDisconnecting}
                                                        className="text-xs px-3 py-1.5 rounded-md bg-coral/20 text-coral
                                                                   hover:bg-coral/30 transition-colors font-medium disabled:opacity-50"
                                                    >
                                                        {isDisconnecting ? "Removing..." : "Confirm"}
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmDisconnect(null)}
                                                        className="text-xs px-2 py-1.5 text-muted-foreground hover:text-foreground"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setConfirmDisconnect(channel.id)}
                                                    className="p-1.5 rounded-md text-muted-foreground hover:text-red-400
                                                               hover:bg-coral/10 transition-colors"
                                                    title="Disconnect channel"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Warning */}
                {channels.length > 0 && (
                    <div className="px-6 pb-4">
                        <div className="flex items-start gap-2 text-xs text-muted-foreground/60 bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
                            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-amber-500/50 flex-shrink-0" />
                            <span>
                                Disconnecting a channel removes all associated videos and analytics data.
                                This action cannot be undone.
                            </span>
                        </div>
                    </div>
                )}
            </section>

            {/* ═══ About Section ═══ */}
            <section className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border/30">
                    <h2 className="text-lg font-semibold">About</h2>
                </div>
                <div className="p-6 space-y-2 text-sm text-muted-foreground">
                    <p><strong className="text-foreground">Creator Intelligence</strong> — AI-powered YouTube analytics</p>
                    <p>Version 1.0.0 · Phase 3</p>
                    <p>Built with Next.js, FastAPI, PostgreSQL, and Gemini AI</p>
                </div>
            </section>
        </div>
    )
}
