"use client"

import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts"

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
