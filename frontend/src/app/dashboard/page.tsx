"use client"

import { useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { PulseWidget } from "@/components/dashboard/pulse-widget"
import { VideoTable } from "@/components/dashboard/video-table"
import { InsightDrawer } from "@/components/dashboard/insight-drawer"
import { ConversionFunnel } from "@/components/dashboard/conversion-funnel"
import { PerformanceCharts } from "@/components/dashboard/performance-charts"
import { HookGaugeCard } from "@/components/dashboard/hook-gauge"
import { InsightFeed } from "@/components/dashboard/insight-feed"
import {
    fetchDashboardStats,
    fetchVideos,
    analyzeVideo,
    syncData,
    fetchFunnelData,
    fetchTrends,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-context"

export default function DashboardPage() {
    const { token, activeChannelId } = useAuth()

    const [stats, setStats] = useState<any>(null)
    const [videos, setVideos] = useState<any[]>([])
    const [funnel, setFunnel] = useState<any>(null)
    const [trends, setTrends] = useState<any[]>([])

    // Analysis state
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [analysisResult, setAnalysisResult] = useState<any>(null)
    const [selectedVideo, setSelectedVideo] = useState<any>(null)

    // Sync state
    const [isSyncing, setIsSyncing] = useState(false)

    async function loadData() {
        if (!token || !activeChannelId) return
        try {
            const [statsData, videosData, funnelData, trendsData] = await Promise.all([
                fetchDashboardStats(token, activeChannelId),
                fetchVideos(token, activeChannelId),
                fetchFunnelData(token, activeChannelId),
                fetchTrends(token, activeChannelId),
            ])
            setStats(statsData)
            setVideos(videosData.videos)
            setFunnel(funnelData)
            setTrends(trendsData.trends ?? [])
        } catch (error) {
            console.error("Failed to load dashboard data", error)
        }
    }

    useEffect(() => {
        loadData()
    }, [token, activeChannelId])

    const handleSync = async () => {
        setIsSyncing(true)
        try {
            await syncData(token, activeChannelId ?? undefined)
            await loadData()
        } catch (error) {
            console.error("Sync failed", error)
        } finally {
            setIsSyncing(false)
        }
    }

    const handleAnalyze = async (video: any) => {
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
                <p className="text-sm mt-2">Connect a YouTube channel from the sidebar to get started.</p>
            </div>
        )
    }

    if (!stats) return <div className="p-8 text-muted-foreground">Loading dashboard...</div>

    // Sort videos by published_at desc
    const sortedVideos = [...videos].sort((a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    )
    const latestVideo = sortedVideos[0]

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground mt-2">
                        Your channel performance at a glance.
                    </p>
                </div>
                <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                    {isSyncing ? "Syncing..." : "Sync Now"}
                </button>
            </div>

            {/* Row 1: Stats Cards */}
            <StatsCards stats={stats} />

            {/* Row 2: Funnel + Hook Gauge + Pulse */}
            <div className="grid gap-6 md:grid-cols-3">
                <ConversionFunnel data={funnel} />
                <HookGaugeCard score={stats.avg_hook_score} />
                <PulseWidget
                    latestVideo={latestVideo ? { title: latestVideo.title, velocity: latestVideo.velocity } : undefined}
                    avgVelocity={stats.avg_velocity}
                />
            </div>

            {/* Row 3: Performance Charts + Insight Feed */}
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <PerformanceCharts trends={trends} />
                </div>
                <InsightFeed />
            </div>

            {/* Row 4: Video Table */}
            <div className="grid gap-8 md:grid-cols-1">
                <VideoTable videos={videos} onAnalyze={handleAnalyze} />
            </div>

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
