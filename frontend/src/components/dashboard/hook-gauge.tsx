"use client"

/**
 * Hook Score Gauge — Enhanced radial gauge with color zones.
 * Standalone card version for the dashboard.
 */

import {
    RadialBarChart,
    RadialBar,
    PolarAngleAxis,
    ResponsiveContainer,
} from "recharts"

interface HookGaugeCardProps {
    score: number | null
    label?: string
}

export function HookGaugeCard({ score, label = "Avg Hook Score" }: HookGaugeCardProps) {
    const data = [{ value: score ?? 0 }]

    let fill = "#6b7280" // gray for null
    let zone = "No Data"
    let zoneColor = "text-muted-foreground"

    if (score !== null) {
        if (score >= 70) {
            fill = "#10b981"
            zone = "Excellent"
            zoneColor = "text-emerald-400"
        } else if (score >= 50) {
            fill = "#22d3ee"
            zone = "Good"
            zoneColor = "text-cyan-400"
        } else if (score >= 35) {
            fill = "#f59e0b"
            zone = "Needs Work"
            zoneColor = "text-amber-400"
        } else {
            fill = "#ef4444"
            zone = "Critical"
            zoneColor = "text-red-400"
        }
    }

    return (
        <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 flex flex-col items-center">
            <h3 className="text-lg font-semibold mb-2">{label}</h3>

            <div className="h-[160px] w-[160px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                        innerRadius="70%"
                        outerRadius="100%"
                        barSize={12}
                        data={data}
                        startAngle={180}
                        endAngle={0}
                    >
                        <PolarAngleAxis
                            type="number"
                            domain={[0, 100]}
                            angleAxisId={0}
                            tick={false}
                        />
                        <RadialBar
                            background={{ fill: "hsl(var(--muted))" }}
                            dataKey="value"
                            cornerRadius={30}
                            fill={fill}
                        />
                    </RadialBarChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
                    <span className="text-3xl font-bold" style={{ color: fill }}>
                        {score !== null ? score.toFixed(0) : "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">/100</span>
                </div>
            </div>

            <div className={`text-sm font-medium mt-1 ${zoneColor}`}>{zone}</div>

            {/* Zone legend */}
            <div className="flex gap-3 mt-4 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    &lt;35
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    35-50
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    50-70
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    70+
                </div>
            </div>
        </div>
    )
}


/* ── Inline gauge for video table rows ─────────────── */

interface HookGaugeProps {
    score: number | null
}

export function HookGauge({ score }: HookGaugeProps) {
    if (score === null) return <div className="text-muted-foreground text-xs">N/A</div>

    const data = [{ value: score }]

    let fill = "#ef4444" // red
    if (score >= 60) fill = "#10b981" // green
    else if (score >= 40) fill = "#f59e0b" // yellow

    return (
        <div className="h-[60px] w-[60px] relative">
            <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                    innerRadius="70%"
                    outerRadius="100%"
                    barSize={6}
                    data={data}
                    startAngle={90}
                    endAngle={-270}
                >
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar
                        background={{ fill: "#334155" }}
                        dataKey="value"
                        cornerRadius={30}
                        fill={fill}
                    />
                </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                {score.toFixed(0)}
            </div>
        </div>
    )
}
