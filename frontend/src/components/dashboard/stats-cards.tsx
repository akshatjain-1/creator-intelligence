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

const CARD_CONFIGS = [
    { key: "views", title: "Total Views", icon: TrendingUp, color: "coral" },
    { key: "hook", title: "Avg Hook Score", icon: Activity, color: "teal" },
    { key: "velocity", title: "Avg Velocity", icon: ArrowUpRight, color: "amber" },
    { key: "videos", title: "Total Videos", icon: Film, color: "coral" },
] as const

const ACCENT_MAP: Record<string, { icon: string; glow: string; deltaBg: string }> = {
    coral: { icon: "text-coral", glow: "shadow-coral/5", deltaBg: "bg-coral/10" },
    teal: { icon: "text-teal", glow: "shadow-teal/5", deltaBg: "bg-teal/10" },
    amber: { icon: "text-amber", glow: "shadow-amber/5", deltaBg: "bg-amber/10" },
}

export function StatsCards({ stats }: StatsCardsProps) {
    const values = [
        { value: stats.total_views.toLocaleString(), sub: "All time" },
        { value: stats.avg_hook_score?.toFixed(1) || "-", sub: "Retention @ 30s / 0s", delta: stats.deltas?.hook, deltaLabel: "vs previous 5" },
        { value: stats.avg_velocity?.toFixed(2) || "-", sub: "Views / Hour", delta: stats.deltas?.velocity, deltaLabel: "vs previous 5" },
        { value: stats.video_count.toString(), sub: "Across channels" },
    ]

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {CARD_CONFIGS.map((cfg, i) => (
                <Card
                    key={cfg.key}
                    title={cfg.title}
                    value={values[i].value}
                    icon={cfg.icon}
                    subtext={values[i].sub}
                    color={cfg.color}
                    delta={values[i].delta}
                    deltaLabel={values[i].deltaLabel}
                />
            ))}
        </div>
    )
}

function Card({
    title,
    value,
    icon: Icon,
    subtext,
    color,
    delta,
    deltaLabel,
}: {
    title: string
    value: string
    icon: any
    subtext: string
    color: string
    delta?: number | null
    deltaLabel?: string
}) {
    const accent = ACCENT_MAP[color] || ACCENT_MAP.coral

    return (
        <div className={cn(
            "rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 space-y-3",
            "hover:border-border transition-all duration-300 card-glow",
            `shadow-lg ${accent.glow}`
        )}>
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {title}
                </h3>
                <div className={cn("p-1.5 rounded-lg", accent.deltaBg)}>
                    <Icon className={cn("h-3.5 w-3.5", accent.icon)} />
                </div>
            </div>
            <div className="flex flex-col gap-1">
                <div className="text-3xl font-bold tracking-tight">{value}</div>
                {delta !== undefined && delta !== null ? (
                    <div className="flex items-center gap-2">
                        <div
                            className={cn(
                                "flex items-center text-xs font-bold px-1.5 py-0.5 rounded",
                                delta > 0
                                    ? "text-teal bg-teal/10"
                                    : delta < 0
                                        ? "text-coral bg-coral/10"
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
                    <p className="text-xs text-muted-foreground">{subtext}</p>
                )}
            </div>
        </div>
    )
}
