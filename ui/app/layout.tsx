//@note use css in layout, Metadata for SEO, UserProvider for state management (useContext)
import "./globals.css"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

import PrivyProviders from "@/lib/web3/privyProviders"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
    title: "LootBox - DeFi Rewards Platform",
    description: "Purchase loot boxes and win exclusive rewards on our DeFi platform",
}

//@note In mobile web design, the maximum-scale property in a viewport settings restricts how much users can zoom in on the page.
// Setting it to 1 means the user won't be able to zoom in on the page
export const viewport: Viewport = {
    maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning className="dark">
            <body className={`${inter.className} force-dark min-h-screen flex flex-col`}>
                <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
                    <PrivyProviders>
                        <Header />
                        <main className="flex-1 force-dark">{children}</main>
                        <Footer />
                        <Toaster position="top-right" richColors expand />
                    </PrivyProviders>
                </ThemeProvider>
            </body>
        </html>
    )
}
