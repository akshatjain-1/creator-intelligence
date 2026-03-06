"use client"

/**
 * Conversion Funnel — Visualizes: Impressions → CTR → Views → Avg View Duration
 * PRD Req 2.3
 */

interface FunnelProps {
    data: {
        impressions: number
        ctr: number
        views: number
        avg_view_duration: number
    } | null
}

function formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return n.toString()
}

function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
}

const FUNNEL_COLORS = [
    { bar: "#FF6B6B", bg: "rgba(255, 107, 107, 0.08)" },
    { bar: "#FFD93D", bg: "rgba(255, 217, 61, 0.08)" },
    { bar: "#4ECDC4", bg: "rgba(78, 205, 196, 0.08)" },
    { bar: "#FF6B6B", bg: "rgba(255, 107, 107, 0.08)" },
]

export function ConversionFunnel({ data }: FunnelProps) {
    if (!data) {
        return (
            <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Conversion Funnel</h3>
                <p className="text-muted-foreground text-sm">
                    Sync your channel data to see the funnel.
                </p>
            </div>
        )
    }

    const steps = [
        { label: "Impressions", value: data.impressions, display: formatNumber(data.impressions || 0) },
        { label: "Click-Through", value: data.ctr, display: `${data.ctr || 0}%` },
        { label: "Views", value: data.views, display: formatNumber(data.views || 0) },
        { label: "Avg Watch Time", value: data.avg_view_duration, display: formatDuration(data.avg_view_duration || 0) },
    ]

    const conversionRate =
        data.impressions > 0
            ? ((data.views / data.impressions) * 100).toFixed(1)
            : null

    const barWidths = [
        data.impressions > 0 ? 100 : 10,
        Math.max(data.ctr, 5),
        data.impressions > 0
            ? Math.max((data.views / data.impressions) * 100, 5)
            : data.views > 0 ? 80 : 10,
        data.avg_view_duration > 0 ? Math.max(40, Math.min(70, data.avg_view_duration / 3)) : 10,
    ]

    const hasAnalytics = data.impressions > 0 || data.ctr > 0

    return (
        <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
            <h3 className="text-lg font-semibold mb-1">Conversion Funnel</h3>
            <p className="text-xs text-muted-foreground mb-5">
                {hasAnalytics
                    ? "How viewers discover and engage with your content"
                    : "Sync analytics to populate impressions & CTR data"
                }
            </p>

            <div className="space-y-3">
                {steps.map((step, i) => (
                    <div key={step.label}>
                        <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground text-xs font-medium">
                                {step.label}
                            </span>
                            <span className="font-bold text-foreground text-sm tabular-nums">
                                {step.display}
                            </span>
                        </div>
                        <div
                            className="h-8 rounded-lg overflow-hidden"
                            style={{ backgroundColor: FUNNEL_COLORS[i].bg }}
                        >
                            <div
                                className="h-full rounded-lg transition-all duration-700 ease-out"
                                style={{
                                    width: `${barWidths[i]}%`,
                                    backgroundColor: FUNNEL_COLORS[i].bar,
                                    opacity: step.value > 0 ? 0.85 : 0.2,
                                }}
                            />
                        </div>

                        {i === 0 && conversionRate && (
                            <div className="flex items-center justify-center my-1.5">
                                <span className="text-[10px] text-amber font-medium">
                                    ↓ {conversionRate}% converted to views
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {!hasAnalytics && (
                <div className="mt-4 text-xs text-muted-foreground/60 text-center border-t border-border/30 pt-3">
                    💡 Click <strong>Sync Now</strong> to fetch analytics data
                </div>
            )}
        </div>
    )
}
