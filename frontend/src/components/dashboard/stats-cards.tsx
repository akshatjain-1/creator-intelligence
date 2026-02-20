import { ArrowUpRight, Film, TrendingUp, Activity, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsCardsProps {
    stats: {
        total_views: number
        avg_hook_score: number | null
        avg_velocity: number | null
        video_count: number
        deltas?: {
            views: number | null
            hook: number | null
            velocity: number | null
        }
    }
}

export function StatsCards({ stats }: StatsCardsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card
                title="Total Views"
                value={stats.total_views.toLocaleString()}
                icon={TrendingUp}
                subtext="All time"
            />
            <Card
                title="Avg Hook Score"
                value={stats.avg_hook_score?.toFixed(1) || "-"}
                icon={Activity}
                subtext="Retention @ 30s / 0s"
                delta={stats.deltas?.hook}
                deltaLabel="vs previous 5"
            />
            <Card
                title="Avg Velocity"
                value={stats.avg_velocity?.toFixed(2) || "-"}
                icon={ArrowUpRight}
                subtext="Views / Hour"
                delta={stats.deltas?.velocity}
                deltaLabel="vs previous 5"
            />
            <Card
                title="Total Videos"
                value={stats.video_count.toString()}
                icon={Film}
                subtext="Across channels"
            />
        </div>
    )
}

function Card({
    title,
    value,
    icon: Icon,
    subtext,
    delta,
    deltaLabel,
}: {
    title: string
    value: string
    icon: any
    subtext: string
    delta?: number | null
    deltaLabel?: string
}) {
    return (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 space-y-2">
            <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium text-muted-foreground">
                    {title}
                </h3>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1">
                <div className="text-2xl font-bold">{value}</div>
                {delta !== undefined && delta !== null ? (
                    <div className="flex items-center gap-2">
                        <div
                            className={cn(
                                "flex items-center text-xs font-bold px-1.5 py-0.5 rounded",
                                delta > 0
                                    ? "text-green-500 bg-green-500/10"
                                    : delta < 0
                                        ? "text-red-500 bg-red-500/10"
                                        : "text-muted-foreground bg-muted"
                            )}
                        >
                            {delta > 0 ? (
                                <TrendingUp className="h-3 w-3 mr-1" />
                            ) : delta < 0 ? (
                                <TrendingDown className="h-3 w-3 mr-1" />
                            ) : (
                                <Minus className="h-3 w-3 mr-1" />
                            )}
                            {Math.abs(delta)}%
                        </div>
                        <p className="text-xs text-muted-foreground">{deltaLabel}</p>
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground pt-1">{subtext}</p>
                )}
            </div>
        </div>
    )
}
