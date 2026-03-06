"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Clapperboard, Settings, LogOut, Zap } from "lucide-react"
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
        <aside className="fixed left-0 top-0 h-screen w-64 border-r border-border/50 bg-card/80 backdrop-blur-xl z-50 flex flex-col">
            {/* Brand */}
            <div className="flex h-16 items-center gap-2 border-b border-border/50 px-6">
                <div className="w-8 h-8 rounded-lg gradient-coral flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold tracking-tight text-gradient-warm">
                    Creator Intel
                </span>
            </div>

            {/* Channel Switcher */}
            <div className="p-4 border-b border-border/30">
                <ChannelSwitcher />
            </div>

            <nav className="flex-1 p-3 space-y-1">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium",
                                isActive
                                    ? "bg-coral/10 text-coral shadow-[inset_0_0_0_1px_rgba(255,107,107,0.15)]"
                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                        >
                            <item.icon className={cn("h-[18px] w-[18px]", isActive && "text-coral")} />
                            <span>{item.label}</span>
                            {isActive && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-coral animate-pulse-glow" />
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* User info + Logout */}
            {user && (
                <div className="p-4 border-t border-border/30">
                    <div className="flex items-center gap-3">
                        {user.photoURL ? (
                            <img
                                src={user.photoURL}
                                alt=""
                                className="w-8 h-8 rounded-full ring-2 ring-coral/20"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full gradient-coral flex items-center justify-center text-xs font-bold text-white">
                                {(user.displayName?.[0] ?? "U").toUpperCase()}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                                {user.displayName ?? "User"}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                                {user.email}
                            </p>
                        </div>
                        <button
                            onClick={logout}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-coral hover:bg-coral/10 transition-colors"
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
