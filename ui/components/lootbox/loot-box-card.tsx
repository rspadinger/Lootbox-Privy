"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Info, Minus, Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

import { usePrivy } from "@privy-io/react-auth"
// @ts-expect-error working fine
import { useAccount, useConfig } from "wagmi"
import { waitForTransactionReceipt } from "wagmi/actions"
import { useSmartContractWrite } from "@/lib/web3/wagmiHelper"
import { useEthPrice } from "@/lib/hooks/useEthUsdPrice"
import { insertLootboxAction } from "@/app/actions/lootbox"
import { insertUserAction, getUserIdAction } from "@/app/actions/user"
import { calculatePrice } from "@/lib/utils"

interface Reward {
    type: string
    amount: string
    chance: number
}

interface LootBoxProps {
    name: string
    tier: "bronze" | "silver" | "gold"
    price: number
    rewards: Reward[]
    flavorText: string
}

export default function LootBoxCard({ name, tier, price, rewards, flavorText }: LootBoxProps) {
    const PAYMENT_TOKEN = {
        LOOT: 0,
        ETH: 1,
        USDC: 2,
    } as const

    type PaymentMethod = keyof typeof PAYMENT_TOKEN

    const { user, ready } = usePrivy()
    const { address } = useAccount()
    const wagmiConfig = useConfig()
    const { executeWrite } = useSmartContractWrite()

    const [quantity, setQuantity] = useState(1)
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("LOOT")
    const [isLoading, setIsLoading] = useState(false)

    const [txHash, setTxHash] = useState<string | null>(null)
    const [isConfirming, setIsConfirming] = useState(false)

    const ethPrice = useEthPrice()

    const tierColors = {
        bronze: "bronze-header",
        silver: "silver-header",
        gold: "gold-header",
    }

    const handleQuantityChange = (value: string) => {
        const newValue = Number.parseInt(value)
        if (!isNaN(newValue) && newValue >= 1 && newValue <= 10) {
            setQuantity(newValue)
        }
    }

    const decrementQuantity = () => {
        if (quantity > 1) {
            setQuantity(quantity - 1)
        }
    }

    const incrementQuantity = () => {
        if (quantity < 10) {
            setQuantity(quantity + 1)
        }
    }

    const handleBuy = async () => {
        if (!address || isConfirming) return

        //call SC to buy lootbox
        const { result: hash, status } = await executeWrite({
            contract: "lootBox",
            functionName: "purchasePack",
            args: [name.slice(0, -4), quantity, PAYMENT_TOKEN[paymentMethod]],
        })

        if (!hash) {
            toast.error(status || "Transaction failed")
            return
        }

        try {
            setIsConfirming(true)

            //@note wait for the txn to complete
            const transactionReceipt = await waitForTransactionReceipt(wagmiConfig, { hash })
            toast.success("Purchase of LootBox confirmed! ✅")
            setTxHash(hash)

            //everything worked => add purchase details to supabase
            if (ready && user) {
                //get supabase userId for currently logged in user
                const userId = await getUserIdAction(user.id)

                //insert lootbox purchase details for user
                await insertLootboxAction(userId, paymentMethod, discountedPrice, quantity, name.slice(0, -4), hash)
            }

            //@note Manually refetch updated XP Balance value => eg: if lootbox purchase would depend on it (eg: user wins XP tokens)
            //to make this work, we need to add: useSmartContractRead({ contract: "xpModule" ... => like on home page
            // await refetchXPBalance().then(({ data: xpBalanceAfter }) => {
            //     if (xpBalanceAfter !== xpBalanceBefore) {
            //         toast.success(`XP Balance updated to: ${xpBalanceAfter}`)
            //         //toast.success(<span>XP Balance updated to: <br /> {xpBalanceAfter}</span>)
            //     }
            // })
        } catch (err) {
            console.error(err)
            toast.error("Transaction failed to confirm.")
        } finally {
            setIsConfirming(false)
        }
    }

    // Apply bulk discount & calculate final price
    const { unitPrice, totalPrice, discount, discountedPrice } = calculatePrice({
        basePriceUsd: price,
        quantity,
        paymentMethod,
        ethPriceUsd: ethPrice,
    })

    return (
        <Card className="card-dark border-slate-800 overflow-hidden">
            <CardHeader
                className={`${tierColors[tier]} border-b border-slate-800 flex items-center justify-between py-3`}
            >
                <CardTitle className="text-xl font-bold">{name}</CardTitle>
                <Badge variant="outline" className="px-3 py-1 bg-slate-800/50 border-slate-700">
                    💰 ${price.toFixed(2)}
                </Badge>
            </CardHeader>
            <CardContent className="pt-6 pb-4 bg-slate-900">
                <div className="space-y-4">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-800">
                                    <th className="text-left pb-2 font-medium text-slate-400">Reward Type</th>
                                    <th className="text-left pb-2 font-medium text-slate-400">Amount</th>
                                    <th className="text-left pb-2 font-medium text-slate-400 flex items-center">
                                        Chance
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Info className="h-3.5 w-3.5 ml-1 text-slate-500" />
                                                </TooltipTrigger>
                                                <TooltipContent className="max-w-xs">
                                                    <div className="space-y-2">
                                                        <p className="font-semibold">Cumulative Weights:</p>
                                                        <p className="text-sm text-slate-300">
                                                            Cumulative weights determine the likelihood of each reward.
                                                            Weights [30,70,100] mean 30% XP, 40% LOOT, 30% NFT.
                                                        </p>
                                                        <p className="font-semibold mt-2">Reward Logic:</p>
                                                        <p className="text-sm text-slate-300">
                                                            A secure Chainlink VRF random number is matched against
                                                            these weights for fair, verifiable draws.
                                                        </p>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rewards.map((reward, index) => (
                                    <tr key={index} className="border-b border-slate-800/50">
                                        <td className="py-2">{reward.type}</td>
                                        <td className="py-2">{reward.amount}</td>
                                        <td className="py-2">{reward.chance}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Progress bars to visualize odds */}
                    <div className="space-y-2">
                        {rewards.map((reward, index) => (
                            <div key={index} className="space-y-1">
                                <div className="w-full bg-slate-800 rounded-full h-1.5">
                                    <div
                                        className={`h-1.5 rounded-full ${
                                            reward.type === "XP"
                                                ? "bg-yellow-500"
                                                : reward.type === "LOOT"
                                                ? "bg-cyan-500"
                                                : "bg-purple-500"
                                        }`}
                                        style={{ width: `${reward.chance}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className="text-sm text-slate-400 italic mt-4">{flavorText}</p>
                </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pt-2 border-t border-slate-800 bg-slate-900/50">
                <div className="flex flex-col sm:flex-row w-full gap-4">
                    <div className="flex-1 space-y-1">
                        <label htmlFor={`quantity-${tier}`} className="text-xs text-slate-400">
                            Quantity
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="h-3 w-3 ml-1 inline text-slate-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="text-sm">
                                            Choose between 1 and 10 packs. Bulk purchases unlock additional discounts!
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </label>
                        <div className="flex">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 rounded-r-none border-slate-700"
                                onClick={decrementQuantity}
                            >
                                <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                                id={`quantity-${tier}`}
                                type="number"
                                min={1}
                                max={10}
                                value={quantity}
                                onChange={(e) => handleQuantityChange(e.target.value)}
                                className="h-9 w-12 rounded-none text-center border-x-0 border-slate-700"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 rounded-l-none border-slate-700"
                                onClick={incrementQuantity}
                            >
                                <Plus className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 space-y-1">
                        <label className="text-xs text-slate-400">
                            Payment Method
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="h-3 w-3 ml-1 inline text-slate-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="text-sm">
                                            Select LOOT tokens, ETH, or USDC. Prices convert in real-time via Chainlink.
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </label>
                        <ToggleGroup
                            type="single"
                            value={paymentMethod}
                            onValueChange={(value) => {
                                if (value === "LOOT" || value === "ETH" || value === "USDC") {
                                    setPaymentMethod(value)
                                }
                            }}
                            className="border rounded-md border-slate-700 justify-between"
                        >
                            <ToggleGroupItem value="LOOT" className="flex-1 text-xs data-[state=on]:bg-slate-800">
                                LOOT
                            </ToggleGroupItem>
                            <ToggleGroupItem value="ETH" className="flex-1 text-xs data-[state=on]:bg-slate-800">
                                ETH
                            </ToggleGroupItem>
                            <ToggleGroupItem value="USDC" className="flex-1 text-xs data-[state=on]:bg-slate-800">
                                USDC
                            </ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                </div>

                <div className="w-full">
                    <Button
                        onClick={handleBuy}
                        disabled={isLoading || !address || isConfirming}
                        className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                            </>
                        ) : isConfirming ? (
                            "Confirming..."
                        ) : (
                            `Buy Pack${quantity > 1 ? "s" : ""}`
                        )}
                    </Button>

                    {txHash && (
                        <p className="mt-2 text-sm text-gray-200">
                            Purchase Transaction:&nbsp;
                            <a
                                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline text-blue-300 hover:text-blue-400"
                            >
                                {`${txHash.substring(0, 6)}...${txHash.substring(txHash.length - 4)}`}
                            </a>
                        </p>
                    )}

                    <div className="text-center mt-2 text-sm">
                        <span className="text-slate-400">Total: </span>
                        <span className="font-medium">
                            {discount > 0 && (
                                <span className="line-through text-slate-500 mr-2">
                                    {/* {(totalPrice * (paymentMethod === "LOOT" ? 1000 : 0.01)).toLocaleString()}{" "} */}
                                    {totalPrice.toLocaleString()} {paymentMethod}
                                </span>
                            )}
                            {/* {(discountedPrice * (paymentMethod === "LOOT" ? 1000 : 0.01)).toLocaleString()}{" "} */}
                            {discountedPrice.toLocaleString()} {paymentMethod}
                        </span>
                    </div>
                </div>
            </CardFooter>
        </Card>
    )
}
