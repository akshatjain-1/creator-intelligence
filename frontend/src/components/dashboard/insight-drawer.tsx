"use client"

import { X, Sparkles, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { HookGauge } from "./hook-gauge"

interface InsightDrawerProps {
    isOpen: boolean
    onClose: () => void
    video: any | null
    analysis: any | null
    isLoading: boolean
}

export function InsightDrawer({ isOpen, onClose, video, analysis, isLoading }: InsightDrawerProps) {
    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 bg-background/80 backdrop-blur-sm z-50 transition-opacity",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={cn(
                    "fixed right-0 top-0 h-full w-[400px] bg-card border-l shadow-2xl z-50 transition-transform duration-300 transform",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-purple-400" />
                            AI Insight
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-muted rounded-md text-muted-foreground">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-40 gap-4 text-muted-foreground">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p>Asking Gemini...</p>
                            </div>
                        ) : analysis ? (
                            <>
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Analyzed Video</h3>
                                    <p className="font-medium leading-normal">{analysis.title}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-lg bg-secondary/50 border flex flex-col items-center text-center gap-2">
                                        <span className="text-xs text-muted-foreground uppercase font-bold">Hook Score</span>
                                        <HookGauge score={analysis.hook_score} />
                                        <span className="text-xs text-muted-foreground">
                                            vs avg {analysis.channel_avg_hook ?? "-"}
                                        </span>
                                    </div>
                                    <div className="p-4 rounded-lg bg-secondary/50 border flex flex-col items-center justify-center text-center gap-1">
                                        <span className="text-xs text-muted-foreground uppercase font-bold">Velocity</span>
                                        <span className="text-2xl font-bold">{analysis.velocity?.toFixed(2)}</span>
                                        <span className="text-xs text-muted-foreground">
                                            vs avg {analysis.channel_avg_velocity ?? "-"}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                                    <h3 className="text-sm font-bold text-purple-400 mb-3 uppercase flex items-center gap-2">
                                        <Sparkles className="h-4 w-4" />
                                        Gemini Insight
                                    </h3>
                                    <p className="text-lg font-medium leading-relaxed italic">
                                        "{analysis.insight}"
                                    </p>
                                </div>

                                <div className="text-xs text-center text-muted-foreground mt-8">
                                    Analyzed at {new Date(analysis.analyzed_at).toLocaleString()}
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-muted-foreground">
                                Select a video to analyze.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
