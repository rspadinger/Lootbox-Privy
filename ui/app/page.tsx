"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import UserBalance from "@/components/lootbox/user-balance"
import LootBoxCard from "@/components/lootbox/loot-box-card"
import { useSmartContractRead } from "../lib/web3/wagmiHelper"
import { formatEther, formatUnits } from "viem"

import { usePrivy } from "@privy-io/react-auth"
// @ts-expect-error working fine
import { useAccount, useBalance } from "wagmi"
import { insertUserAction } from "@/app/actions/user"

// import { useSendTransaction } from "wagmi"
// import type { SendTransactionVariables } from "wagmi/query"
// import { parseEther } from "viem"

export default function Home() {
    type Reward = {
        type: "XP" | "LOOT" | "NFT"
        amount: string
        chance: number
    }

    type LootBox = {
        name: string
        tier: Tier
        price: number
        flavorText: string
        rewards: Reward[]
    }

    type Tier = "bronze" | "silver" | "gold"

    //****************** hooks //******************
    const { user, ready } = usePrivy()
    const { address } = useAccount()
    const { data: ethBalance, isLoading: loadingEthBalance } = useBalance({ address })

    ////****************** state //******************
    const [lootBoxes, setLootBoxes] = useState<LootBox[]>([])

    ////****************** custom types //******************
    const FLAVOR_TEXTS: Record<string, string> = {
        bronze: "A humble beginning… fortune favors the bold.",
        silver: "Balanced and reliable…smart choice for seasoned players.",
        gold: "Highest stakes, greatest rewards…claim greatness!",
    }

    const REWARD_TYPE_MAP = {
        0: "XP",
        1: "LOOT",
        2: "NFT",
    } as const

    //TEST Send TXN => for mainnet testing => seems like smart wallets work only on mainnet
    // const { data, isPending, isSuccess, sendTransaction } = useSendTransaction()
    // const transactionRequest: SendTransactionVariables<Config, number> = {
    //     to: "0x346..." as `0x${string}`,
    //     value: parseEther("0.001"),
    //     type: "eip1559",
    // }

    //****************** smart contract hooks //******************

    const {
        data: xpBalance,
        isLoading: loadingXPBalance,
        error: errorXPBalance,
        refetch: refetchXPBalance,
    } = useSmartContractRead({
        contract: "xpModule",
        functionName: "getXP",
        args: [user?.wallet?.address],
    })

    const {
        data: lootBalance,
        isLoading: loadingLootBalance,
        error: errorLootBalance,
        refetch: refetchLootBalance,
    } = useSmartContractRead({
        contract: "lootToken",
        functionName: "balanceOf",
        args: [user?.wallet?.address],
    })

    const {
        data: getAllPacks,
        isLoading: loadingGetAllPacks,
        error: errorGetAllPacks,
        refetch: refetchPGetAllPacks,
    } = useSmartContractRead({
        contract: "lootBox",
        functionName: "getAllPacks",
    })

    //****************** useEffect hooks //******************

    //@note save data to backend, when Privy does signup/login
    useEffect(() => {
        const insertUser = async () => {
            if (ready && user) {
                //console.log("Privy user:", user.id, user.wallet?.address)
                if (!user.id || !user.wallet?.address) {
                    console.error("Missing user ID or wallet address")
                    return
                }

                // save data to DB
                await insertUserAction(user.id, user.wallet?.address)
            }
        }

        insertUser()
    }, [ready, user])

    //@note only use useState + useEffect if you need to transform the result, otherwise, just use the data directly. => xpBalance...
    useEffect(() => {
        if (!getAllPacks) return

        //get all data from SC call
        const [names, prices, rewardTypes, rewardWeights, rewardValues] = getAllPacks

        //we need to transform the data for the UI component
        const packs = (names as string[]).map((name, i) => {
            //const tier = name.toLowerCase() as Tier
            const tier = name.toLowerCase() as Tier

            const rewards = (rewardTypes[i] as string[]).map((typeId, j) => {
                //const type = REWARD_TYPE_MAP[Number(typeId)]
                const type = REWARD_TYPE_MAP[Number(typeId) as keyof typeof REWARD_TYPE_MAP]
                const rawValue = rewardValues[i][j]
                const rawChance = Number(rewardWeights[i][j])

                const value = type === "LOOT" ? parseFloat(formatEther(rawValue)) : Number(rawValue)

                let chance = rawChance
                if (j > 0) {
                    chance -= Number(rewardWeights[i][j - 1])
                }

                let amount: string

                if (type === "XP") {
                    amount = `${value} XP`
                } else if (type === "LOOT") {
                    amount = `${value.toLocaleString()} LOOT`
                } else {
                    amount = `Token #${value}`
                }

                return { type, amount, chance }
            })

            return {
                name: `${name} Box`,
                tier,
                price: parseFloat(formatUnits(prices[i], 6)),
                flavorText: FLAVOR_TEXTS[tier] ?? "",
                rewards,
            }
        })

        //set the transformed SC data
        setLootBoxes(packs)
    }, [getAllPacks])

    //@note polling to update stale data => no need to use useState
    //@audit check this
    useEffect(() => {
        const interval = setInterval(() => {
            if (ready && user) {
                refetchLootBalance()
                refetchXPBalance()
                refetchPGetAllPacks()
            }
        }, 15_000) // check every 15 seconds

        return () => clearInterval(interval)
    }, [])

    // Optional: one useEffect for logging or global error handling
    useEffect(() => {
        if (ready && user) {
            if (errorGetAllPacks || errorXPBalance || errorLootBalance) {
                console.error("Smart contract read error:", {
                    xp: errorXPBalance,
                    loot: errorLootBalance,
                    packs: errorGetAllPacks,
                })
            }
        }
    }, [errorXPBalance, errorLootBalance, errorGetAllPacks])

    const isLoading = loadingLootBalance || loadingXPBalance || loadingGetAllPacks //show spinner in middle of page

    return (
        <div className="force-dark container mx-auto px-4 py-8 md:py-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="hero-title">Buy Loot Boxes & Win Rewards!</h1>
                    <p className="hero-subtitle max-w-3xl">
                        Unlock exclusive rewards by purchasing loot boxes. Each box contains a surprise mix of XP, LOOT
                        tokens, or powerful NFTs. The rarer the box, the greater the potential rewards!
                    </p>
                    <p className="hero-subtitle max-w-3xl mt-2">
                        Rewards are determined randomly using Chainlink VRF—no two boxes are alike.
                    </p>
                    {/* DELETE - only for testing */}
                    {/* <Button onClick={myFunc} className="bg-cyan-500 hover:bg-cyan-600 text-white mt-5">
                        Test
                    </Button> */}
                    {/* {false && (
                        <>
                             <p>*** TEST *** Wallet address: {address}</p>
                            <div className="space-y-2">
                                {isLoading && <p>Loading...</p>}
                                {errorPackCount && (
                                    <p className="text-red-500">Error loading pack count: {errorPackCount.message}</p>
                                )}
                                {errorXpModule && (
                                    <p className="text-red-500">Error loading owner: {errorXpModule.message}</p>
                                )}
                                {packCount !== undefined && <p>Pack Count: {packCount.toString()}</p>}
                                {xpModule !== undefined && <p>XpModule: {xpModule}</p>}
                            </div>
                            <Button
                                onClick={handleTestWrite}
                                disabled={!address || isConfirming}
                                className="bg-cyan-500 hover:bg-cyan-600 text-white mt-5"
                            >
                                {isConfirming ? "Confirming..." : "Set XP Module"}
                            </Button> */}

                    {/* {txHash && (
                                <p className="mt-2 text-sm text-gray-200">
                                    Txn:&nbsp;
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
                        </>
                    )} */}
                </div>
                <UserBalance
                    xpBalance={xpBalance ?? 0}
                    lootBalance={lootBalance ? parseFloat(formatEther(lootBalance)) : 0}
                    ethBalance={loadingEthBalance || !ethBalance?.value ? 0 : parseFloat(formatEther(ethBalance.value))}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                {lootBoxes.map((box, index) => (
                    <LootBoxCard
                        key={index}
                        name={box.name}
                        tier={box.tier}
                        price={box.price}
                        rewards={box.rewards}
                        flavorText={box.flavorText}
                    />
                ))}
            </div>
        </div>
    )
}
