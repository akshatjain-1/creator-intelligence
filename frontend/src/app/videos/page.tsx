"use client"

/**
 * Videos Page — Full video library with search, sort, filters, and detail panel.
 */

import { useEffect, useState, useMemo } from "react"
import {
    Search,
    SortAsc,
    SortDesc,
    Play,
    Eye,
    Clock,
    TrendingUp,
    TrendingDown,
    ChevronDown,
    Zap,
    Filter,
    LayoutGrid,
    LayoutList,
    X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-context"
import { fetchVideos, analyzeVideo } from "@/lib/api"
import { HookGauge } from "@/components/dashboard/hook-gauge"
import { InsightDrawer } from "@/components/dashboard/insight-drawer"

type SortField = "published_at" | "views" | "hook_score" | "velocity"
type SortDir = "asc" | "desc"
type ViewMode = "grid" | "list"

interface Video {
    id: string
    youtube_video_id: string
    title: string
    thumbnail_url: string
    published_at: string | null
    duration_seconds: number | null
    views: number
    hook_score: number | null
    hook_color: string | null
    velocity: number | null
    hook_delta: number | null
    velocity_delta: number | null
    last_analyzed_at: string | null
}

function formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return n.toString()
}

function formatDuration(seconds: number | null): string {
    if (!seconds) return "—"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
}

function timeAgo(isoDate: string | null): string {
    if (!isoDate) return "—"
    const diff = Date.now() - new Date(isoDate).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    if (days < 30) return `${days}d ago`
    if (days < 365) return `${Math.floor(days / 30)}mo ago`
    return `${Math.floor(days / 365)}y ago`
}

function getBadge(video: Video): { label: string; color: string } | null {
    if (video.velocity !== null && video.velocity > 2) {
        return { label: "🔥 Trending", color: "bg-amber/20 text-amber" }
    }
    if (video.hook_score !== null && video.hook_score >= 70) {
        return { label: "⭐ Top Hook", color: "bg-teal/20 text-teal" }
    }
    if (video.hook_score !== null && video.hook_score < 35) {
        return { label: "⚠ Low Hook", color: "bg-coral/20 text-coral" }
    }
    return null
}

export default function VideosPage() {
    const { token, activeChannelId } = useAuth()

    const [videos, setVideos] = useState<Video[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [sortField, setSortField] = useState<SortField>("published_at")
    const [sortDir, setSortDir] = useState<SortDir>("desc")
    const [viewMode, setViewMode] = useState<ViewMode>("grid")
    const [hookFilter, setHookFilter] = useState<string>("all") // all, green, yellow, red

    // Detail/Analyze state
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [analysisResult, setAnalysisResult] = useState<any>(null)
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)

    useEffect(() => {
        if (!token || !activeChannelId) return
        setLoading(true)
        fetchVideos(token, activeChannelId)
            .then((data) => {
                setVideos(data.videos || [])
            })
            .catch((err) => console.error("Failed to fetch videos", err))
            .finally(() => setLoading(false))
    }, [token, activeChannelId])

    // Filter + sort pipeline
    const processed = useMemo(() => {
        let result = [...videos]

        // Search
        if (search.trim()) {
            const q = search.toLowerCase()
            result = result.filter((v) => v.title.toLowerCase().includes(q))
        }

        // Hook filter
        if (hookFilter !== "all") {
            result = result.filter((v) => v.hook_color === hookFilter)
        }

        // Sort
        result.sort((a, b) => {
            let aVal: number, bVal: number
            switch (sortField) {
                case "published_at":
                    aVal = a.published_at ? new Date(a.published_at).getTime() : 0
                    bVal = b.published_at ? new Date(b.published_at).getTime() : 0
                    break
                case "views":
                    aVal = a.views || 0
                    bVal = b.views || 0
                    break
                case "hook_score":
                    aVal = a.hook_score ?? -1
                    bVal = b.hook_score ?? -1
                    break
                case "velocity":
                    aVal = a.velocity ?? -1
                    bVal = b.velocity ?? -1
                    break
                default:
                    aVal = 0
                    bVal = 0
            }
            return sortDir === "desc" ? bVal - aVal : aVal - bVal
        })

        return result
    }, [videos, search, sortField, sortDir, hookFilter])

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(sortDir === "desc" ? "asc" : "desc")
        } else {
            setSortField(field)
            setSortDir("desc")
        }
    }

    const handleAnalyze = async (video: Video) => {
        setSelectedVideo(video)
        setAnalysisResult(null)
        setIsDrawerOpen(true)
        setIsAnalyzing(true)
        try {
            const result = await analyzeVideo(token, video.id)
            setAnalysisResult(result)
        } catch (error) {
            console.error("Analysis failed", error)
        } finally {
            setIsAnalyzing(false)
        }
    }

    if (!activeChannelId) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                <p className="text-lg">No channel selected.</p>
                <p className="text-sm mt-2">Connect a YouTube channel to view your videos.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Videos</h1>
                <p className="text-muted-foreground mt-1">
                    {videos.length} videos · Search, sort, and analyze your content library
                </p>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search videos..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-card border border-border/50 text-sm
                                   placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2
                                   focus:ring-coral/40 transition-all"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {/* Hook Filter */}
                <div className="flex items-center gap-1 bg-card border border-border/50 rounded-lg p-1">
                    {[
                        { value: "all", label: "All" },
                        { value: "green", label: "✅", title: "Good (60+)" },
                        { value: "yellow", label: "⚠️", title: "Medium (40-60)" },
                        { value: "red", label: "🔴", title: "Low (<40)" },
                    ].map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => setHookFilter(opt.value)}
                            title={opt.title}
                            className={cn(
                                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                                hookFilter === opt.value
                                    ? "bg-coral/20 text-coral"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {/* Sort Buttons */}
                <div className="flex items-center gap-1 bg-card border border-border/50 rounded-lg p-1">
                    {[
                        { field: "published_at" as SortField, label: "Date" },
                        { field: "views" as SortField, label: "Views" },
                        { field: "hook_score" as SortField, label: "Hook" },
                        { field: "velocity" as SortField, label: "Velocity" },
                    ].map((opt) => (
                        <button
                            key={opt.field}
                            onClick={() => handleSort(opt.field)}
                            className={cn(
                                "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                                sortField === opt.field
                                    ? "bg-coral/20 text-coral"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {opt.label}
                            {sortField === opt.field && (
                                sortDir === "desc"
                                    ? <SortDesc className="h-3 w-3" />
                                    : <SortAsc className="h-3 w-3" />
                            )}
                        </button>
                    ))}
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-card border border-border/50 rounded-lg p-1">
                    <button
                        onClick={() => setViewMode("grid")}
                        className={cn(
                            "p-1.5 rounded-md transition-colors",
                            viewMode === "grid" ? "bg-coral/20 text-coral" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setViewMode("list")}
                        className={cn(
                            "p-1.5 rounded-md transition-colors",
                            viewMode === "list" ? "bg-coral/20 text-coral" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <LayoutList className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="text-center py-12 text-muted-foreground">Loading videos...</div>
            )}

            {/* Empty State */}
            {!loading && processed.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                    <p className="text-lg">No videos found.</p>
                    {search && <p className="text-sm mt-1">Try adjusting your search.</p>}
                </div>
            )}

            {/* Grid View */}
            {!loading && viewMode === "grid" && processed.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {processed.map((video) => {
                        const badge = getBadge(video)
                        return (
                            <div
                                key={video.id}
                                className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm
                                           overflow-hidden hover:border-coral/30 transition-all group"
                            >
                                {/* Thumbnail */}
                                <div className="relative aspect-video bg-muted">
                                    {video.thumbnail_url && (
                                        <img
                                            src={video.thumbnail_url}
                                            alt={video.title}
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                    {/* Duration badge */}
                                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                                        {formatDuration(video.duration_seconds)}
                                    </div>
                                    {/* Trending badge */}
                                    {badge && (
                                        <div className={`absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.color}`}>
                                            {badge.label}
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-4 space-y-3">
                                    <h3
                                        className="font-medium text-sm leading-tight line-clamp-2 text-foreground"
                                        title={video.title}
                                    >
                                        {video.title}
                                    </h3>

                                    {/* Metrics Row */}
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Eye className="h-3 w-3" />
                                            {formatNumber(video.views || 0)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {timeAgo(video.published_at)}
                                        </span>
                                        {video.velocity !== null && (
                                            <span className={cn(
                                                "flex items-center gap-0.5 font-medium",
                                                video.velocity >= 1 ? "text-teal" : "text-muted-foreground"
                                            )}>
                                                <Zap className="h-3 w-3" />
                                                {video.velocity.toFixed(2)}x
                                            </span>
                                        )}
                                    </div>

                                    {/* Hook Score + Analyze */}
                                    <div className="flex items-center justify-between pt-1 border-t border-border/30">
                                        <div className="flex items-center gap-2">
                                            <HookGauge score={video.hook_score} />
                                            {video.hook_delta !== null && (
                                                <span className={cn(
                                                    "text-[10px] font-bold",
                                                    video.hook_delta >= 0 ? "text-teal" : "text-coral"
                                                )}>
                                                    {video.hook_delta >= 0 ? "+" : ""}{video.hook_delta.toFixed(1)}%
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleAnalyze(video)}
                                            className="flex items-center gap-1 bg-coral/10 hover:bg-coral/20
                                                       text-coral px-3 py-1.5 rounded-md text-xs font-medium
                                                       transition-colors"
                                        >
                                            <Play className="h-3 w-3 fill-current" />
                                            Analyze
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* List View */}
            {!loading && viewMode === "list" && processed.length > 0 && (
                <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/30 text-muted-foreground uppercase text-xs font-medium">
                            <tr>
                                <th className="px-5 py-3">Video</th>
                                <th className="px-5 py-3 text-right">Views</th>
                                <th className="px-5 py-3 text-center">Hook</th>
                                <th className="px-5 py-3 text-center">Velocity</th>
                                <th className="px-5 py-3 text-center">Δ Baseline</th>
                                <th className="px-5 py-3 text-right">Published</th>
                                <th className="px-5 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {processed.map((video) => {
                                const badge = getBadge(video)
                                return (
                                    <tr key={video.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={video.thumbnail_url}
                                                    alt=""
                                                    className="h-9 w-16 object-cover rounded bg-muted flex-shrink-0"
                                                />
                                                <div className="min-w-0">
                                                    <p className="font-medium truncate max-w-[280px]" title={video.title}>
                                                        {video.title}
                                                    </p>
                                                    {badge && (
                                                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badge.color}`}>
                                                            {badge.label}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-right font-medium tabular-nums">
                                            {formatNumber(video.views || 0)}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex justify-center">
                                                <HookGauge score={video.hook_score} />
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-center tabular-nums">
                                            {video.velocity !== null ? (
                                                <span className={cn(
                                                    "font-medium",
                                                    video.velocity >= 1 ? "text-emerald-400" : "text-muted-foreground"
                                                )}>
                                                    {video.velocity.toFixed(2)}x
                                                </span>
                                            ) : "—"}
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            {video.hook_delta !== null ? (
                                                <span className={cn(
                                                    "flex items-center justify-center gap-0.5 text-xs font-bold",
                                                    video.hook_delta >= 0 ? "text-emerald-400" : "text-red-400"
                                                )}>
                                                    {video.hook_delta >= 0
                                                        ? <TrendingUp className="h-3 w-3" />
                                                        : <TrendingDown className="h-3 w-3" />
                                                    }
                                                    {Math.abs(video.hook_delta).toFixed(1)}%
                                                </span>
                                            ) : "—"}
                                        </td>
                                        <td className="px-5 py-3.5 text-right text-muted-foreground text-xs">
                                            {timeAgo(video.published_at)}
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <button
                                                onClick={() => handleAnalyze(video)}
                                                className="inline-flex items-center gap-1 bg-coral/10 hover:bg-coral/20
                                                           text-coral px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                                            >
                                                <Play className="h-3 w-3 fill-current" />
                                                Analyze
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Insight Drawer */}
            <InsightDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                video={selectedVideo}
                analysis={analysisResult}
                isLoading={isAnalyzing}
            />
        </div>
    )
}
