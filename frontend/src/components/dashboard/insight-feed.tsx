"use client"

/**
 * Insight Feed — displays rule-based anomaly signals for the channel's videos.
 * PRD Req 3.1 / 5.3
 */

import { useEffect, useState } from "react"
import {
    AlertTriangle,
    TrendingUp,
    Zap,
    Eye,
    MousePointerClick,
    Star,
    ChevronDown,
    ChevronUp,
    Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-context"
import { fetchInsights } from "@/lib/api"

interface Signal {
    type: string
    severity: "critical" | "warning" | "positive"
    message: string
    suggestion: string
}

interface InsightItem {
    video_id: string
    youtube_video_id: string
    title: string
    thumbnail_url: string
    published_at: string | null
    signals: Signal[]
}

const SIGNAL_ICONS: Record<string, React.ElementType> = {
    LOW_HOOK: AlertTriangle,
    STRONG_HOOK: Star,
    HIGH_VELOCITY: TrendingUp,
    DECLINING_VIEWS: Eye,
    LOW_CTR: MousePointerClick,
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
    critical: {
        bg: "bg-coral/5",
        border: "border-coral/20",
        icon: "text-coral",
        badge: "bg-coral/15 text-coral",
    },
    warning: {
        bg: "bg-amber/5",
        border: "border-amber/20",
        icon: "text-amber",
        badge: "bg-amber/15 text-amber",
    },
    positive: {
        bg: "bg-teal/5",
        border: "border-teal/20",
        icon: "text-teal",
        badge: "bg-teal/15 text-teal",
    },
}

function SignalBadge({ signal }: { signal: Signal }) {
    const Icon = SIGNAL_ICONS[signal.type] || Zap
    const style = SEVERITY_STYLES[signal.severity] || SEVERITY_STYLES.warning

    return (
        <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full", style.badge)}>
            <Icon className="h-3 w-3" />
            {signal.type.replace(/_/g, " ")}
        </span>
    )
}

export function InsightFeed() {
    const { token, activeChannelId } = useAuth()
    const [insights, setInsights] = useState<InsightItem[]>([])
    const [loading, setLoading] = useState(true)
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})

    useEffect(() => {
        if (!token || !activeChannelId) return
        setLoading(true)
        fetchInsights(token, activeChannelId)
            .then((data) => setInsights(data.insights || []))
            .catch((err) => console.error("Failed to fetch insights:", err))
            .finally(() => setLoading(false))
    }, [token, activeChannelId])

    const toggleExpand = (videoId: string) => {
        setExpanded((prev) => ({ ...prev, [videoId]: !prev[videoId] }))
    }

    if (loading) {
        return (
            <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-coral" />
                    Insight Feed
                </h3>
                <p className="text-muted-foreground text-sm mt-2">Loading insights...</p>
            </div>
        )
    }

    if (insights.length === 0) {
        return (
            <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-coral" />
                    Insight Feed
                </h3>
                <p className="text-muted-foreground text-sm mt-3">
                    No anomalies detected. Sync more data or analyze videos to surface insights.
                </p>
            </div>
        )
    }

    return (
        <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-coral" />
                    Insight Feed
                </h3>
                <span className="text-xs text-muted-foreground">
                    {insights.length} video{insights.length !== 1 ? "s" : ""} flagged
                </span>
            </div>

            <div className="space-y-3">
                {insights.map((item) => {
                    const isOpen = expanded[item.video_id]
                    const topSeverity = item.signals.reduce((worst, s) => {
                        const order = { critical: 0, warning: 1, positive: 2 }
                        return (order[s.severity] ?? 3) < (order[worst] ?? 3) ? s.severity : worst
                    }, "positive" as Signal["severity"])
                    const style = SEVERITY_STYLES[topSeverity]

                    return (
                        <div
                            key={item.video_id}
                            className={cn(
                                "rounded-lg border transition-all",
                                style.bg,
                                style.border
                            )}
                        >
                            {/* Header Row */}
                            <button
                                onClick={() => toggleExpand(item.video_id)}
                                className="w-full flex items-center gap-3 p-3 text-left"
                            >
                                <img
                                    src={item.thumbnail_url}
                                    alt=""
                                    className="h-8 w-14 object-cover rounded flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                        {item.title}
                                    </p>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {item.signals.map((s, i) => (
                                            <SignalBadge key={i} signal={s} />
                                        ))}
                                    </div>
                                </div>
                                {isOpen
                                    ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                }
                            </button>

                            {/* Expanded Details */}
                            {isOpen && (
                                <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-2">
                                    {item.signals.map((signal, i) => {
                                        const sStyle = SEVERITY_STYLES[signal.severity]
                                        const Icon = SIGNAL_ICONS[signal.type] || Zap
                                        return (
                                            <div key={i} className="flex gap-3">
                                                <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", sStyle.icon)} />
                                                <div>
                                                    <p className="text-sm text-foreground">{signal.message}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        💡 {signal.suggestion}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
