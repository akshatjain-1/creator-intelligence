import { ArrowUpRight, Film, TrendingUp, Activity } from "lucide-react"

interface StatsCardsProps {
    stats: {
        total_views: number
        avg_hook_score: number | null
        avg_velocity: number | null
        video_count: number
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
            />
            <Card
                title="Avg Velocity"
                value={stats.avg_velocity?.toFixed(2) || "-"}
                icon={ArrowUpRight}
                subtext="Views / Hour"
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
}: {
    title: string
    value: string
    icon: any
    subtext: string
}) {
    return (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 space-y-2">
            <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium text-muted-foreground">
                    {title}
                </h3>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col">
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground pt-1">{subtext}</p>
            </div>
        </div>
    )
}
