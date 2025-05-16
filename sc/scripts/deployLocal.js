const { VRF_COORDINATOR, KEY_HASH, SUBSCRIPTION_ID, ETH_USD_FEED, LOOT_USD_FEED, USDC } = process.env

async function main() {
    // Deploy MockERC20 for USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20")
    const mockUsdcToken = await MockERC20.deploy("USDC", "USDC", 6, ethers.parseUnits("1000000", 6))

    // Deploy MockAggregator for LOOT and USDC price feeds
    const nowInSeconds = Math.floor(Date.now() / 1000)
    const MockAggregator = await ethers.getContractFactory("MockAggregator")
    const mockLootUsdFeed = await MockAggregator.deploy(ethers.parseUnits("2", 8), 8, nowInSeconds, 1, 1) // 8 decimals for LOOT
    const mockEthUsdFeed = await MockAggregator.deploy(ethers.parseUnits("2000", 8), 8, nowInSeconds, 1, 1) // Example ETH/USD price (2000)

    // Deploy MockVRFCoordinator
    const MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinator")
    const mockVRFCoordinator = await MockVRFCoordinator.deploy()

    // Deploy LOOT Token
    const LootToken = await ethers.getContractFactory("LOOTToken")
    const lootToken = await LootToken.deploy()
    console.log("LOOT token contract deployed to:", lootToken.target)

    const XPModule = await ethers.getContractFactory("XPModule")
    const xPModule = await XPModule.deploy()
    console.log("XPModule contract deployed to:", xPModule.target)

    const RewardNFT = await ethers.getContractFactory("RewardNFT")
    const rewardNFT = await RewardNFT.deploy()
    console.log("RewardNFT contract deployed to:", rewardNFT.target)

    const LootBox = await ethers.getContractFactory("LootBox")
    const lootBox = await LootBox.deploy(
        mockVRFCoordinator,
        mockEthUsdFeed,
        mockLootUsdFeed,
        lootToken.target,
        mockUsdcToken
    )
    console.log("lootBox contract deployed to:", lootBox.target)

    //set target contracts
    console.log("Setting Target Contracts...")

    await xPModule.setLootBoxContract(lootBox.target)
    await rewardNFT.setLootBoxContract(lootBox.target)
    await lootBox.setXPModule(xPModule.target)
    await lootBox.setRewardNFT(rewardNFT.target)

    // console.log("Setting Properties...")
    // const subscriptionId = BigInt(SUBSCRIPTION_ID) // Ensures uint64 compatibility
    // await lootBox.setSubscriptionId(subscriptionId)
    // await lootBox.setKeyHash(KEY_HASH)

    console.log("Creating Packs...")

    await lootBox.addOrUpdatePackType("GOLD", 50 * 10 ** 6, [30, 70, 100], [0, 1, 2], [300, 50n * 10n ** 18n, 3])
    await lootBox.addOrUpdatePackType("SILVER", 30 * 10 ** 6, [50, 85, 100], [0, 1, 2], [200, 30n * 10n ** 18n, 2])
    await lootBox.addOrUpdatePackType("BRONZE", 10 * 10 ** 6, [70, 90, 100], [0, 1, 2], [100, 10n * 10n ** 18n, 1])
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})

//Token on Seploia: 0xdAcA9A0186C17A9B7772771D8C275f19279Ae125
//Staking on Sepolia: 0x841e3B679D022dff4e86Fa7b6A39CA736C2529A9
