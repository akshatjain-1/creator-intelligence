import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/layout/sidebar"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
    title: "Creator Intelligence Engine",
    description: "AI-powered analytics for YouTube creators",
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en" className="dark">
            <body className={cn(inter.className, "bg-background min-h-screen antialiased")}>
                <div className="flex min-h-screen">
                    <Sidebar />
                    <main className="flex-1 ml-64 p-8 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </body>
        </html>
    )
}
