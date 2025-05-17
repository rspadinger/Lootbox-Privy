"use client"

// @ts-expect-error working fine
import { useChainId, useSwitchChain, useWriteContract, useReadContract } from "wagmi"
import { readContract } from "@wagmi/core"
import { wagmiConfig } from "./privyProviders"
import LootboxABI from "@/abi/LootBox.json"
import LootTokenABI from "@/abi/LootToken.json"
import XPModuleABI from "@/abi/XPModule.json"

import { parseEther } from "viem"

const LOOTBOX_ADDRESS = process.env.NEXT_PUBLIC_LOOTBOX_ADDRESS as `0x${string}`
const LOOT_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_LOOT_TOKEN_ADDRESS as `0x${string}`
const XP_MODULE_ADDRESS = process.env.NEXT_PUBLIC_XP_MODULE_ADDRESS as `0x${string}`

const TARGET_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAINID)

export type ContractType = "lootBox" | "lootToken" | "xpModule"

const getContractAddress = (type: ContractType): `0x${string}` => {
    switch (type) {
        case "lootBox":
            return LOOTBOX_ADDRESS
        case "lootToken":
            return LOOT_TOKEN_ADDRESS
        case "xpModule":
            return XP_MODULE_ADDRESS
        default:
            throw new Error("Unknown contract type")
    }
}

const getContractABI = (type: ContractType) => {
    switch (type) {
        case "lootBox":
            return LootboxABI.abi
        case "lootToken":
            return LootTokenABI.abi
        case "xpModule":
            return XPModuleABI.abi
        default:
            throw new Error("Unknown contract type")
    }
}

export const useSmartContractRead = ({
    contract,
    functionName,
    args = [],
    enabled = true,
}: {
    contract: ContractType
    functionName: string
    args?: readonly unknown[]
    enabled?: boolean
}) => {
    const chainId = useChainId()

    return useReadContract({
        address: getContractAddress(contract),
        abi: getContractABI(contract),
        functionName,
        args,
        query: {
            enabled: enabled && chainId === TARGET_CHAIN_ID,
            staleTime: 10_000, // 10 seconds cache time
            gcTime: 30_000, // 30 seconds garbage collection
        },
    })
}

export const useSmartContractWrite = () => {
    //@note we are not allowed to call hooks in async functions => get the async version from the hook
    const { writeContractAsync } = useWriteContract()
    const chainId = useChainId()
    const { switchChainAsync } = useSwitchChain()

    const executeWrite = async ({
        contract,
        functionName,
        args = [],
        value,
    }: {
        contract: ContractType
        functionName: string
        args?: readonly unknown[]
        value?: number
    }): Promise<{ result: any; status: string }> => {
        if (chainId !== TARGET_CHAIN_ID) {
            try {
                await switchChainAsync({ chainId: TARGET_CHAIN_ID })
            } catch {
                return {
                    result: null,
                    status: "Wrong network. Please switch manually.",
                }
            }
        }

        try {
            const result = await writeContractAsync({
                address: getContractAddress(contract),
                abi: getContractABI(contract),
                functionName,
                args,
                value: value ?? 0n,
            })

            return { result, status: "" }
        } catch (err: any) {
            if (err.message && err.message.includes("User denied transaction signature")) {
                return {
                    result: null,
                    status: "User denied the transaction.",
                }
            }

            return {
                result: null,
                status: err.message || "An unknown error occurred during write",
            }
        }
    }

    return { executeWrite }
}
