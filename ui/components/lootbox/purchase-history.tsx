"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, ArrowUpDown } from "lucide-react"
import TransactionLink from "@/components/common/txn-link"
import { formatDistanceToNow } from "date-fns"
import NoDataMessage from "@/components/common/no-data-message"
import { usePrivy } from "@privy-io/react-auth"
import { getLootboxesByPrivyIdAction } from "@/app/actions/lootbox"
import Link from "next/link"

interface Purchase {
    id: string
    bought_at: string
    payment_token: string
    price_usd: number
    number_of_packs: number
    pack_type: string
    txn_hash: string
}

export default function PurchaseHistory() {
    const { user, ready } = usePrivy()

    const [purchases, setPurchases] = useState<Purchase[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [sortConfig, setSortConfig] = useState<{
        key: keyof Purchase
        direction: "ascending" | "descending"
    }>({
        key: "bought_at",
        direction: "descending",
    })

    useEffect(() => {
        // Simulate fetching data from an API
        const fetchPurchases = async () => {
            setIsLoading(true)
            try {
                //@todo get all purchases from DB =>
                if (ready && user) {
                    //console.log("Privy user:", user.id, user.wallet?.address)

                    // save data to DB
                    //await insertUserAction(user.id, user.wallet?.address)
                    const purchases = await getLootboxesByPrivyIdAction(user.id)
                    setPurchases(purchases)
                }
            } catch (error) {
                console.error("Error fetching purchases:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchPurchases()
    }, [])

    const handleSort = (key: keyof Purchase) => {
        let direction: "ascending" | "descending" = "ascending"
        if (sortConfig.key === key && sortConfig.direction === "ascending") {
            direction = "descending"
        }
        setSortConfig({ key, direction })
    }

    const getPackTypeOrder = (packType: string): number => {
        if (packType.includes("GOLD")) return 1
        if (packType.includes("SILVER")) return 2
        if (packType.includes("BRONZE")) return 3
        return 4 // Any other pack types
    }

    const sortedPurchases = [...purchases].sort((a, b) => {
        if (sortConfig.key === "pack_type") {
            // Custom sorting for pack types: Gold, Silver, Bronze
            const orderA = getPackTypeOrder(a.pack_type)
            const orderB = getPackTypeOrder(b.pack_type)
            return sortConfig.direction === "ascending" ? orderA - orderB : orderB - orderA
        }

        // Default sorting for other columns
        if (a[sortConfig.key] < b[sortConfig.key]) {
            return sortConfig.direction === "ascending" ? -1 : 1
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
            return sortConfig.direction === "ascending" ? 1 : -1
        }
        return 0
    })

    const filteredPurchases = sortedPurchases.filter((purchase) => {
        return (
            purchase.pack_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
            purchase.payment_token.toLowerCase().includes(searchTerm.toLowerCase()) ||
            purchase.txn_hash.toLowerCase().includes(searchTerm.toLowerCase())
        )
    })

    const getPackTypeBadgeColor = (packType: string) => {
        if (packType.includes("GOLD")) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
        if (packType.includes("SILVER")) return "bg-slate-400/20 text-slate-300 border-slate-400/50"
        if (packType.includes("BRONZE")) return "bg-amber-700/20 text-amber-500 border-amber-700/50"
        return "bg-slate-800 text-slate-300 border-slate-700"
    }

    const getPaymentTokenBadgeColor = (token: string) => {
        if (token === "LOOT") return "bg-cyan-500/20 text-cyan-400 border-cyan-500/50"
        if (token === "ETH") return "bg-blue-500/20 text-blue-400 border-blue-500/50"
        if (token === "USDC") return "bg-green-500/20 text-green-400 border-green-500/50"
        return "bg-slate-800 text-slate-300 border-slate-700"
    }

    return (
        <Card className="card-dark border-slate-800">
            <CardHeader className="border-b border-slate-800 bg-slate-900 py-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <CardTitle className="text-xl font-bold text-white">Purchase History</CardTitle>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <Input
                            placeholder="Search purchases..."
                            className="pl-8 bg-slate-800 border-slate-700 h-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="flex justify-center items-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                        </div>
                    ) : filteredPurchases.length > 0 ? (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-800">
                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">
                                        <button
                                            className="flex items-center focus:outline-none"
                                            onClick={() => handleSort("bought_at")}
                                        >
                                            Date
                                            <ArrowUpDown className="ml-1 h-4 w-4" />
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">
                                        <button
                                            className="flex items-center focus:outline-none"
                                            onClick={() => handleSort("pack_type")}
                                        >
                                            Pack Type
                                            <ArrowUpDown className="ml-1 h-4 w-4" />
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">
                                        <button
                                            className="flex items-center focus:outline-none"
                                            onClick={() => handleSort("number_of_packs")}
                                        >
                                            Quantity
                                            <ArrowUpDown className="ml-1 h-4 w-4" />
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">
                                        <button
                                            className="flex items-center focus:outline-none"
                                            onClick={() => handleSort("payment_token")}
                                        >
                                            Payment
                                            <ArrowUpDown className="ml-1 h-4 w-4" />
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">
                                        <button
                                            className="flex items-center focus:outline-none"
                                            onClick={() => handleSort("price_usd")}
                                        >
                                            Price (USD)
                                            <ArrowUpDown className="ml-1 h-4 w-4" />
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">
                                        Transaction
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPurchases.map((purchase) => (
                                    <tr
                                        key={purchase.id}
                                        className="border-b border-slate-800/50 hover:bg-slate-800/30"
                                    >
                                        <td className="px-4 py-3 text-sm">
                                            <div className="flex flex-col">
                                                <span>{new Date(purchase.bought_at).toLocaleDateString()}</span>
                                                <span className="text-xs text-slate-500">
                                                    {formatDistanceToNow(new Date(purchase.bought_at), {
                                                        addSuffix: true,
                                                    })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant="outline"
                                                className={`${getPackTypeBadgeColor(purchase.pack_type)} px-2 py-1`}
                                            >
                                                {purchase.pack_type}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-sm">{purchase.number_of_packs}</td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant="outline"
                                                className={`${getPaymentTokenBadgeColor(
                                                    purchase.payment_token
                                                )} px-2 py-1`}
                                            >
                                                {purchase.payment_token}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-sm">${purchase.price_usd.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <TransactionLink txHash={purchase.txn_hash} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <NoDataMessage
                            title="No purchases found"
                            description="You haven't made any lootbox purchases yet, or no results match your search."
                            action={
                                <Button className="bg-cyan-500 hover:bg-cyan-600 text-white mt-4" asChild>
                                    <Link href="/">Buy Your First Lootbox</Link>
                                </Button>
                            }
                        />
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
