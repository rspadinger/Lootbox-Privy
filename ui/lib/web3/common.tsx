import { ethers, TransactionResponse, TransactionReceipt } from "ethers"
import React from "react"
import LootboxABI from "../../abi/LootBox.json"
import LootTokenABI from "../../abi/LootToken.json"
import XPModuleABI from "../../abi/XPModule.json"

const LOOTBOX_ADDRESS = process.env.NEXT_PUBLIC_LOOTBOX_ADDRESS
const LOOT_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_LOOT_TOKEN_ADDRESS
const XP_MODULE_ADDRESS = process.env.NEXT_PUBLIC_XP_MODULE_ADDRESS

const METAMASK_DOWNLOAD_LINK = "https://metamask.io/download.html"

type ContractType = "lootbox" | "lootToken" | "xpModule"

export const hasEthereum = (): boolean => {
    const hasProvider = typeof window !== "undefined" && !!window.ethereum
    return hasProvider
}

export const getProvider = (): ethers.BrowserProvider | null => {
    try {
        const ethereum = getEthereum()
        if (ethereum) {
            return new ethers.BrowserProvider(ethereum)
        }
        return null
    } catch (error) {
        console.error("Error creating provider:", error)
        return null
    }
}

export const getSigner = async (): Promise<ethers.Signer | null> => {
    const provider = getProvider()
    if (!provider) return null

    try {
        if ("getSigner" in provider) {
            return await provider.getSigner()
        }

        console.error("Provider type does not support getting a signer")
        return null
    } catch (error) {
        console.error("Error getting signer:", error)
        return null
    }
}

export const connectWallet = () => handleWalletRequest("eth_requestAccounts")
export const getCurrentWalletConnected = () => handleWalletRequest("eth_accounts")

export const getContract = async (type: ContractType) => {
    const signer = await getSigner()
    const address = getContractAddress(type)

    if (!signer || !address) {
        console.warn(`Missing signer or address for contract type: ${type}`)
        return null
    }

    return new ethers.Contract(address, getContractABI(type), signer)
}

export const waitForTransaction = async (tx: TransactionResponse): Promise<TransactionReceipt> => {
    try {
        const receipt = await tx.wait()
        if (!receipt) {
            throw new Error("Transaction receipt is null")
        }
        return receipt
    } catch (error) {
        console.error("Error while waiting for transaction confirmation:", error)
        throw error
    }
}

export const isCorrectNetwork = async (expectedChainId: string): Promise<boolean> => {
    if (!hasEthereum()) {
        console.warn("Ethereum provider not found.")
        return false
    }

    if (typeof window !== "undefined" && window.ethereum) {
        try {
            const currentChainId = await window.ethereum.request({ method: "eth_chainId" })
            return currentChainId === expectedChainId
        } catch (error) {
            console.error("Failed to get chain ID:", error)
            return false
        }
    } else {
        console.warn("Ethereum provider not found")
        return false
    }
}

export const switchNetwork = async (expectedChainId: string): Promise<boolean> => {
    if (!hasEthereum()) {
        console.warn("Ethereum provider not found.")
        return false
    }

    try {
        const ethereum = getEthereum()
        if (ethereum) {
            await ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: expectedChainId }],
            })
            return true
        } else return false
    } catch (switchError: unknown) {
        if (typeof switchError === "object" && switchError !== null && "code" in switchError) {
            const err = switchError as { code: number }
            if (err.code === 4902) {
                console.warn("The requested network is not added in MetaMask.")
            } else {
                console.error("Failed to switch network:", err)
            }
        } else {
            console.error("Unexpected error during network switch:", switchError)
        }

        return false
    }
}

export function getEthereum(): typeof window.ethereum | null {
    if (typeof window !== "undefined" && typeof window.ethereum !== "undefined") {
        return window.ethereum
    }
    console.warn("window.ethereum is not available")
    return null
}

// events

type WalletChangeCallback = (account: string | null) => void

export const listenForAccountChange = (onChange: WalletChangeCallback) => {
    const ethereum = getEthereum()
    if (!ethereum) return

    const handleAccountChange = (accounts: string[]) => {
        if (accounts.length > 0) {
            onChange(accounts[0])
        } else {
            onChange(null)
        }
    }

    ethereum.on("accountsChanged", handleAccountChange)

    // Return a cleanup function to remove the listener
    return () => {
        ethereum.removeListener("accountsChanged", handleAccountChange)
    }
}

export const onWalletChange = (callback: (accounts: string[]) => void) => {
    window.ethereum?.on("accountsChanged", callback)
}

export const onChainChange = (callback: (chainId: string) => void) => {
    window.ethereum?.on("chainChanged", callback)
}

//helper functions

const handleWalletRequest = async (method: "eth_accounts" | "eth_requestAccounts") => {
    const ethereum = getEthereum()
    if (!ethereum) {
        return {
            account: "",
            signer: null,
            status: (
                <span>
                    🦊{" "}
                    <a target="_blank" rel="noreferrer" href={METAMASK_DOWNLOAD_LINK}>
                        You must install Metamask to use this dApp.
                    </a>
                </span>
            ),
        }
    }

    try {
        const accounts = await ethereum.request({ method })
        const provider = getProvider()
        if (!provider) {
            return { account: "", signer: null, status: "The provider is not available." }
        }
        const signer = await provider.getSigner()

        return accounts.length
            ? { account: accounts[0], signer, status: "" }
            : { account: "", signer: null, status: "Connect to Metamask using the top right button." }
    } catch (err) {
        return { account: "", signer: null, status: (err as Error).message }
    }
}

const getContractAddress = (type: ContractType): string => {
    if (type === "lootbox") return LOOTBOX_ADDRESS ?? ""
    else if (type === "lootToken") return LOOT_TOKEN_ADDRESS ?? ""
    else if (type === "xpModule") return XP_MODULE_ADDRESS ?? ""
    else return ""
}

const getContractABI = (type: ContractType) => {
    if (type === "lootbox") return LootboxABI.abi
    else if (type === "lootToken") return LootTokenABI.abi
    else if (type === "xpModule") return XPModuleABI.abi
    else throw new Error("The specified contract type does not exist")
}
