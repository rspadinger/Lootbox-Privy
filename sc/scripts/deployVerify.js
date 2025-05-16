const fs = require("fs")
const path = require("path")
const { ethers } = require("hardhat")

const { VRF_COORDINATOR, KEY_HASH, SUBSCRIPTION_ID, ETH_USD_FEED, LOOT_USD_FEED, USDC } = process.env

async function main() {
    const network = hre.network.name
    const verifyCommands = []

    // Deploy LOOTToken
    const LootToken = await ethers.getContractFactory("LOOTToken")
    const lootToken = await LootToken.deploy()
    await lootToken.waitForDeployment()
    console.log("LOOTToken deployed to:", lootToken.target)
    verifyCommands.push(`npx hardhat verify --network ${network} ${lootToken.target}`)

    // Deploy XPModule
    const XPModule = await ethers.getContractFactory("XPModule")
    const xPModule = await XPModule.deploy()
    await xPModule.waitForDeployment()
    console.log("XPModule deployed to:", xPModule.target)
    verifyCommands.push(`npx hardhat verify --network ${network} ${xPModule.target}`)

    // Deploy RewardNFT
    const RewardNFT = await ethers.getContractFactory("RewardNFT")
    const rewardNFT = await RewardNFT.deploy()
    await rewardNFT.waitForDeployment()
    console.log("RewardNFT deployed to:", rewardNFT.target)
    verifyCommands.push(`npx hardhat verify --network ${network} ${rewardNFT.target}`)

    // Deploy LootBox with constructor arguments
    const LootBox = await ethers.getContractFactory("LootBox")
    const lootBox = await LootBox.deploy(VRF_COORDINATOR, ETH_USD_FEED, LOOT_USD_FEED, lootToken.target, USDC)
    await lootBox.waitForDeployment()
    console.log("LootBox deployed to:", lootBox.target)

    // Prepare constructor arguments for verification
    const lootBoxArgs = [
        `"${VRF_COORDINATOR}"`,
        `"${ETH_USD_FEED}"`,
        `"${LOOT_USD_FEED}"`,
        `"${lootToken.target}"`,
        `"${USDC}"`,
    ].join(" ")
    verifyCommands.push(`npx hardhat verify --network ${network} ${lootBox.target} ${lootBoxArgs}`)

    // Set target contracts
    console.log("Setting Target Contracts...")
    await xPModule.setLootBoxContract(lootBox.target)
    await rewardNFT.setLootBoxContract(lootBox.target)
    await lootBox.setXPModule(xPModule.target)
    await lootBox.setRewardNFT(rewardNFT.target)

    // Set properties
    console.log("Setting Properties...")
    const subscriptionId = BigInt(SUBSCRIPTION_ID)
    await lootBox.setSubscriptionId(subscriptionId)
    await lootBox.setKeyHash(KEY_HASH)

    // Create packs
    console.log("Creating Packs...")
    await lootBox.addOrUpdatePackType("GOLD", 50 * 10 ** 6, [30, 70, 100], [0, 1, 2], [300, 50n * 10n ** 18n, 3])
    await lootBox.addOrUpdatePackType("SILVER", 30 * 10 ** 6, [50, 85, 100], [0, 1, 2], [200, 30n * 10n ** 18n, 2])
    await lootBox.addOrUpdatePackType("BRONZE", 10 * 10 ** 6, [70, 90, 100], [0, 1, 2], [100, 10n * 10n ** 18n, 1])

    // Write verification commands to verify.txt
    const verifyFilePath = path.join(__dirname, "verify.txt")
    fs.writeFileSync(verifyFilePath, verifyCommands.join("\n"))
    console.log(`\n✅ Verification commands saved to ${verifyFilePath}`)
    console.log("👉 You can now run:\n")
    console.log(`   bash ${verifyFilePath}\n`)
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
