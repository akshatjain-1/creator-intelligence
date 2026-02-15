"use client"

import { useState } from "react"
import { Play, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { HookGauge } from "./hook-gauge"

interface Video {
    id: string
    title: string
    thumbnail_url: string
    views: number
    hook_score: number | null
    velocity: number | null
    hook_delta: number | null
    velocity_delta: number | null
}

interface VideoTableProps {
    videos: Video[]
    onAnalyze: (video: Video) => void
}

export function VideoTable({ videos, onAnalyze }: VideoTableProps) {
    return (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-medium">
                        <tr>
                            <th className="px-6 py-3">Video</th>
                            <th className="px-6 py-3 text-right">Views</th>
                            <th className="px-6 py-3 text-center">Hook Score</th>
                            <th className="px-6 py-3 text-center">Velocity</th>
                            <th className="px-6 py-3 text-center">Baseline Δ</th>
                            <th className="px-6 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {videos.map((video) => (
                            <tr key={video.id} className="hover:bg-muted/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={video.thumbnail_url}
                                            alt={video.title}
                                            className="h-10 w-16 object-cover rounded-md bg-muted"
                                        />
                                        <div className="font-medium truncate max-w-[200px]" title={video.title}>
                                            {video.title}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right font-medium">
                                    {video.views?.toLocaleString()}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-center">
                                        <HookGauge score={video.hook_score} />
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {video.velocity?.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {video.hook_delta !== null ? (
                                        <div
                                            className={cn(
                                                "flex items-center justify-center gap-1 text-xs font-bold",
                                                video.hook_delta >= 0 ? "text-green-500" : "text-red-500"
                                            )}
                                        >
                                            {video.hook_delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                            {Math.abs(video.hook_delta).toFixed(1)}%
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => onAnalyze(video)}
                                        className="inline-flex items-center gap-1 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                                    >
                                        <Play className="h-3 w-3 fill-current" />
                                        Analyze
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
