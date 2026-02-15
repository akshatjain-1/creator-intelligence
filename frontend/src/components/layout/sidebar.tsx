"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Clapperboard, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

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

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 border-r bg-background/50 backdrop-blur-xl z-50">
            <div className="flex h-16 items-center border-b px-6">
                <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                    Creator Intel
                </span>
            </div>

            <nav className="p-4 space-y-2">
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
        </aside>
    )
}
