"use client"

/**
 * Channel Switcher — dropdown in the sidebar for multi-channel management.
 */

import { useState } from "react"
import { useAuth } from "@/components/auth-context"
import { ChevronDown, Plus, Check } from "lucide-react"

export default function ChannelSwitcher() {
    const { channels, activeChannelId, setActiveChannelId, token } = useAuth()
    const [open, setOpen] = useState(false)

    const activeChannel = channels.find(
        (ch) => ch.youtube_channel_id === activeChannelId
    )

    const handleConnectChannel = () => {
        if (!token) return
        // Redirect to backend OAuth login with Firebase token
        window.location.href = `http://localhost:8000/auth/login?token=${token}`
    }

    if (channels.length === 0) {
        return (
            <button
                onClick={handleConnectChannel}
                className="w-full flex items-center gap-2 rounded-lg
                           bg-violet-500/10 text-violet-400 px-3 py-2.5
                           hover:bg-violet-500/20 transition-colors text-sm font-medium"
            >
                <Plus className="w-4 h-4" />
                Connect YouTube Channel
            </button>
        )
    }

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-3 rounded-lg
                           bg-card/60 border border-border/50 px-3 py-2.5
                           hover:bg-card/80 transition-colors"
            >
                {activeChannel?.channel_avatar_url && (
                    <img
                        src={activeChannel.channel_avatar_url}
                        alt=""
                        className="w-7 h-7 rounded-full ring-2 ring-violet-500/30"
                    />
                )}
                <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                        {activeChannel?.channel_name ?? "Select Channel"}
                    </p>
                </div>
                <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""
                        }`}
                />
            </button>

            {open && (
                <div className="absolute left-0 right-0 mt-1 z-50 rounded-lg
                                bg-card border border-border/50 shadow-xl
                                overflow-hidden animate-in fade-in slide-in-from-top-1">
                    {channels.map((ch) => (
                        <button
                            key={ch.id}
                            onClick={() => {
                                setActiveChannelId(ch.youtube_channel_id)
                                setOpen(false)
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5
                                       hover:bg-accent/50 transition-colors"
                        >
                            {ch.channel_avatar_url && (
                                <img
                                    src={ch.channel_avatar_url}
                                    alt=""
                                    className="w-6 h-6 rounded-full"
                                />
                            )}
                            <span className="flex-1 text-sm text-foreground text-left truncate">
                                {ch.channel_name}
                            </span>
                            {ch.youtube_channel_id === activeChannelId && (
                                <Check className="w-4 h-4 text-violet-400" />
                            )}
                        </button>
                    ))}

                    {/* Divider + Connect another */}
                    <div className="border-t border-border/50">
                        <button
                            onClick={() => {
                                setOpen(false)
                                handleConnectChannel()
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2.5
                                       text-violet-400 hover:bg-violet-500/10
                                       transition-colors text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Connect Another Channel
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
