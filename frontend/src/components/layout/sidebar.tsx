"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Clapperboard, Settings, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-context"
import ChannelSwitcher from "@/components/layout/channel-switcher"

const NAV_ITEMS = [
    {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        label: "Videos",
        href: "/videos",
        icon: Clapperboard,
    },
    {
        label: "Settings",
        href: "/settings",
        icon: Settings,
    },
]

export function Sidebar() {
    const pathname = usePathname()
    const { user, logout } = useAuth()

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 border-r bg-background/50 backdrop-blur-xl z-50 flex flex-col">
            <div className="flex h-16 items-center border-b px-6">
                <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                    Creator Intel
                </span>
            </div>

            {/* Channel Switcher */}
            <div className="p-4 border-b border-border/50">
                <ChannelSwitcher />
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            <span>{item.label}</span>
                        </Link>
                    )
                })}
            </nav>

            {/* User info + Logout */}
            {user && (
                <div className="p-4 border-t border-border/50">
                    <div className="flex items-center gap-3">
                        {user.photoURL && (
                            <img
                                src={user.photoURL}
                                alt=""
                                className="w-8 h-8 rounded-full"
                            />
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                                {user.displayName ?? "User"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {user.email}
                            </p>
                        </div>
                        <button
                            onClick={logout}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Sign out"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </aside>
    )
}
