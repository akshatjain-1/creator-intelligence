"use client"

/**
 * Performance Charts — Views & Hook Score trends using Recharts.
 */

import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts"

interface TrendItem {
    title: string
    published_at: string | null
    views: number
    hook_score: number | null
    velocity: number | null
}

interface PerformanceChartsProps {
    trends: TrendItem[]
}

function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null

    return (
        <div className="bg-card border border-border/50 rounded-lg px-4 py-3 shadow-xl backdrop-blur-sm">
            <p className="text-sm font-medium text-foreground mb-2">{label}</p>
            {payload.map((entry: any, i: number) => (
                <p key={i} className="text-xs" style={{ color: entry.color }}>
                    {entry.name}: <span className="font-semibold">{entry.value ?? "N/A"}</span>
                </p>
            ))}
        </div>
    )
}

export function PerformanceCharts({ trends }: PerformanceChartsProps) {
    if (!trends || trends.length === 0) {
        return (
            <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Performance Trends</h3>
                <p className="text-muted-foreground text-sm">
                    Not enough data yet. Sync your channel to see trends.
                </p>
            </div>
        )
    }

    const chartData = trends.map((t) => ({
        name: t.title,
        views: t.views,
        hook_score: t.hook_score,
        velocity: t.velocity,
    }))

    return (
        <div className="space-y-6">
            {/* Views Chart */}
            <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6">
                <h3 className="text-lg font-semibold mb-1">Views by Video</h3>
                <p className="text-xs text-muted-foreground mb-4">
                    Total views per video (oldest → newest)
                </p>
                <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartData}>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                            opacity={0.3}
                        />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                            dataKey="views"
                            name="Views"
                            fill="url(#viewsGradient)"
                            radius={[6, 6, 0, 0]}
                        />
                        <defs>
                            <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#8b5cf6" />
                                <stop offset="100%" stopColor="#6d28d9" />
                            </linearGradient>
                        </defs>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Hook Score + Velocity Chart */}
            <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6">
                <h3 className="text-lg font-semibold mb-1">Hook Score &amp; Velocity</h3>
                <p className="text-xs text-muted-foreground mb-4">
                    Performance metrics per video
                </p>
                <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={chartData}>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                            opacity={0.3}
                        />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                        />
                        <defs>
                            <linearGradient id="hookGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.4} />
                                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f472b6" stopOpacity={0.4} />
                                <stop offset="100%" stopColor="#f472b6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="hook_score"
                            name="Hook Score"
                            stroke="#22d3ee"
                            strokeWidth={2}
                            fill="url(#hookGradient)"
                            dot={{ r: 4, fill: "#22d3ee" }}
                        />
                        <Area
                            type="monotone"
                            dataKey="velocity"
                            name="Velocity"
                            stroke="#f472b6"
                            strokeWidth={2}
                            fill="url(#velocityGradient)"
                            dot={{ r: 4, fill: "#f472b6" }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
