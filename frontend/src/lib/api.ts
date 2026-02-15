const API_URL = "http://localhost:8000/api"

export async function fetchDashboardStats() {
    const res = await fetch(`${API_URL}/dashboard/stats`, { cache: "no-store" })
    if (!res.ok) throw new Error("Failed to fetch stats")
    return res.json()
}

export async function fetchVideos() {
    const res = await fetch(`${API_URL}/videos`, { cache: "no-store" })
    if (!res.ok) throw new Error("Failed to fetch videos")
    return res.json()
}

export async function analyzeVideo(videoId: string) {
    const res = await fetch(`${API_URL}/videos/${videoId}/analyze`, {
        method: "POST",
    })
    if (!res.ok) throw new Error("Failed to analyze video")
    return res.json()
}
