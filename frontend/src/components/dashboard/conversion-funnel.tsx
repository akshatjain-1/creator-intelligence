"use client"

/**
 * Conversion Funnel — Visualizes: Impressions → CTR → Views → Avg View Duration
 * PRD Req 2.3
 *
 * Bars are proportional to actual data values.
 * Shows conversion rates between each step.
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

export function ConversionFunnel({ data }: FunnelProps) {
    if (!data) {
        return (
            <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Conversion Funnel</h3>
                <p className="text-muted-foreground text-sm">
                    Sync your channel data to see the funnel.
                </p>
            </div>
        )
    }

    // Build funnel steps with actual conversion percentages
    const steps = [
        {
            label: "Impressions",
            value: data.impressions,
            display: formatNumber(data.impressions || 0),
            color: "#a78bfa",
        },
        {
            label: "Click-Through",
            value: data.ctr,
            display: `${data.ctr || 0}%`,
            color: "#8b5cf6",
        },
        {
            label: "Views",
            value: data.views,
            display: formatNumber(data.views || 0),
            color: "#7c3aed",
        },
        {
            label: "Avg Watch Time",
            value: data.avg_view_duration,
            display: formatDuration(data.avg_view_duration || 0),
            color: "#6d28d9",
        },
    ]

    // Compute real conversion rates between stages
    const conversionRate =
        data.impressions > 0
            ? ((data.views / data.impressions) * 100).toFixed(1)
            : null

    // For bar widths: use the actual proportional relationship
    // Impressions is the widest (100%), then proportional
    const maxImpOrViews = Math.max(data.impressions, data.views, 1)

    const barWidths = [
        data.impressions > 0 ? 100 : 10, // Impressions
        Math.max(data.ctr, 5), // CTR as a % (min 5% width for visibility)
        data.impressions > 0
            ? Math.max((data.views / data.impressions) * 100, 5)
            : data.views > 0
                ? 80
                : 10, // Views relative to impressions
        data.avg_view_duration > 0 ? Math.max(40, Math.min(70, data.avg_view_duration / 3)) : 10, // Duration
    ]

    const hasAnalytics = data.impressions > 0 || data.ctr > 0

    return (
        <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6">
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
                            <span className="text-muted-foreground text-xs">
                                {step.label}
                            </span>
                            <span className="font-semibold text-foreground text-sm tabular-nums">
                                {step.display}
                            </span>
                        </div>
                        <div className="h-7 bg-muted/20 rounded-md overflow-hidden">
                            <div
                                className="h-full rounded-md transition-all duration-700 ease-out flex items-center"
                                style={{
                                    width: `${barWidths[i]}%`,
                                    backgroundColor: step.color,
                                    opacity: step.value > 0 ? 1 : 0.25,
                                }}
                            />
                        </div>

                        {/* Show conversion arrow between Impressions and Views */}
                        {i === 0 && conversionRate && (
                            <div className="flex items-center justify-center my-1">
                                <span className="text-[10px] text-muted-foreground/60">
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
