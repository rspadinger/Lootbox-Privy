import { ethers } from "ethers"
import { getContract } from "./common"

export const getLootBoxContract = async () => getContract("lootbox")

// read functions

export const getPackCount = async (): Promise<number> => {
    const result = await executeContractRead("getPackCount", getLootBoxContract, async (contract) => {
        return await contract.getPackCount()
    })

    return result ?? 0
}

// web3/lootbox.ts

export const getAllPacks = async (): Promise<{
    names: string[]
    prices: number[]
    rewardTypes: number[][]
    rewardWeights: number[][]
    rewardValues: number[][]
}> => {
    try {
        const result = await executeContractRead("getAllPacks", getLootBoxContract, async (contract) => {
            const [names, prices, rewardTypes, rewardWeights, rewardValues] = await contract.getAllPacks()

            return {
                names,
                prices: prices.map((price: bigint) => Number(price)), // Convert BigNumbers to regular numbers
                rewardTypes,
                rewardWeights,
                rewardValues,
            }
        })

        return (
            result ?? {
                names: [],
                prices: [],
                rewardTypes: [],
                rewardWeights: [],
                rewardValues: [],
            }
        )
    } catch (error) {
        console.error("Error fetching all packs:", error)
        return {
            names: [],
            prices: [],
            rewardTypes: [],
            rewardWeights: [],
            rewardValues: [],
        }
    }
}

// write functions

export const purchasePack = async (
    packName: string,
    amount: number,
    paymentToken: number
): Promise<ethers.TransactionResponse> => {
    return executeContractWrite("purchasePack", getLootBoxContract, async (contract) => {
        return await contract.purchasePack(packName, amount, paymentToken)
    })
}

// generic helper functions

const executeContractRead = async <T>(
    operation: string,
    contractFn: () => Promise<ethers.Contract | null>,
    actionFn: (contract: ethers.Contract) => Promise<T>
): Promise<T | null> => {
    const contract = await contractFn()
    if (!contract) {
        console.error(`${operation} - Contract not available`)
        return null
    }

    try {
        return await actionFn(contract)
    } catch (error) {
        console.error(`Error during ${operation}:`, error)
        return null
    }
}

const executeContractWrite = async <T>(
    operation: string,
    contractFn: () => Promise<ethers.Contract | null>,
    actionFn: (contract: ethers.Contract) => Promise<T>
): Promise<T> => {
    const contract = await contractFn()
    if (!contract) {
        throw new Error(`${operation} - Contract not available`)
    }

    try {
        return await actionFn(contract)
    } catch (error) {
        console.error(`Error ${operation}:`, error)
        throw error
    }
}
