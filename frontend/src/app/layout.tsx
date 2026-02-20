import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthGuard } from "@/components/auth-guard"
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
                <AuthGuard>{children}</AuthGuard>
            </body>
        </html>
    )
}
