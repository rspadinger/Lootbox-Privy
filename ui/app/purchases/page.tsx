"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { usePrivy } from "@privy-io/react-auth"
import PurchaseHistory from "@/components/lootbox/purchase-history"

export default function PurchasesPage() {
    const { user, ready } = usePrivy()
    const router = useRouter()

    useEffect(() => {
        if (ready && !user) {
            router.replace("/")
        }
    }, [user, ready])

    if (!ready) return null // or loading spinner

    return (
        <div className="force-dark container mx-auto px-4 py-8 md:py-12">
            <div className="mb-8">
                <h1 className="hero-title">Your LootBox Purchases</h1>
                <p className="hero-subtitle max-w-3xl">
                    Track all your LootBox purchases and rewards. Each transaction is securely recorded on the
                    blockchain for transparency and verification.
                </p>
            </div>

            <PurchaseHistory />
        </div>
    )
}
