import { cn } from "@/lib/utils"
import { Zap } from "lucide-react"

interface PulseWidgetProps {
    latestVideo?: {
        title: string
        velocity: number
    }
    avgVelocity: number | null
}

export function PulseWidget({ latestVideo, avgVelocity }: PulseWidgetProps) {
    if (!latestVideo || avgVelocity === null) return null

    const velocity = latestVideo.velocity ?? 0
    const multiplier = velocity / (avgVelocity || 1)
    const isAbove = multiplier >= 1.0
    const widthPercent = Math.min((velocity / (avgVelocity * 2)) * 100, 100)

    return (
        <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber" />
                        The Pulse
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Latest video velocity vs channel average
                    </p>
                </div>
                <div
                    className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold border",
                        isAbove
                            ? "bg-teal/10 text-teal border-teal/20"
                            : "bg-coral/10 text-coral border-coral/20"
                    )}
                >
                    {multiplier.toFixed(1)}x {isAbove ? "ABOVE" : "BELOW"} AVG
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium truncate max-w-[300px]">
                            {latestVideo.title}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                            {latestVideo.velocity?.toFixed(2) ?? "0.00"} vel
                        </span>
                    </div>
                    <div className="h-4 w-full bg-muted rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-500",
                                isAbove ? "gradient-teal" : "gradient-coral"
                            )}
                            style={{ width: `${Math.max(widthPercent, 5)}%` }}
                        />
                    </div>
                </div>

                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Channel Average</span>
                        <span className="text-muted-foreground tabular-nums">
                            {avgVelocity.toFixed(2)} vel
                        </span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden relative">
                        <div
                            className="absolute left-0 top-0 h-full bg-muted-foreground/30 w-1/2"
                            title="Average Baseline"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
