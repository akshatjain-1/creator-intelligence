/**
 * API client — all backend requests go through here.
 *
 * Automatically attaches Firebase JWT from the auth context.
 * All data-fetching functions accept channelId for multi-tenant scoping.
 */

const API_BASE = "http://localhost:8000/api"

/**
 * Authenticated fetch wrapper.
 * Attaches Authorization header and handles common error patterns.
 */
async function apiFetch(
    path: string,
    token: string | null,
    options: RequestInit = {}
): Promise<Response> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    }

    if (token) {
        headers["Authorization"] = `Bearer ${token}`
    }

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
    })

    if (res.status === 401) {
        // Token expired — caller should handle re-auth
        throw new Error("UNAUTHORIZED")
    }

    return res
}


export async function fetchDashboardStats(token: string | null, channelId: string) {
    const res = await apiFetch(
        `/dashboard/stats?channel_id=${encodeURIComponent(channelId)}`,
        token
    )
    return res.json()
}


export async function fetchVideos(token: string | null, channelId: string) {
    const res = await apiFetch(
        `/videos?channel_id=${encodeURIComponent(channelId)}`,
        token
    )
    return res.json()
}


export async function analyzeVideo(token: string | null, videoId: string) {
    const res = await apiFetch(
        `/videos/${videoId}/analyze`,
        token,
        { method: "POST" }
    )
    return res.json()
}


export async function syncData(token: string | null, channelId?: string) {
    let path = "/ingest/sync"
    if (channelId) {
        path += `?channel_id=${encodeURIComponent(channelId)}`
    }
    const res = await apiFetch(path, token, { method: "POST" })
    return res.json()
}
