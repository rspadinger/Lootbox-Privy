const { VRF_COORDINATOR, KEY_HASH, SUBSCRIPTION_ID, ETH_USD_FEED, LOOT_USD_FEED, USDC } = process.env

async function main() {
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
    const lootBox = await LootBox.deploy(VRF_COORDINATOR, ETH_USD_FEED, LOOT_USD_FEED, lootToken.target, USDC)
    console.log("lootBox contract deployed to:", lootBox.target)

    //set target contracts
    console.log("Setting Target Contracts...")

    await xPModule.setLootBoxContract(lootBox.target)
    await rewardNFT.setLootBoxContract(lootBox.target)
    await lootBox.setXPModule(xPModule.target)
    await lootBox.setRewardNFT(rewardNFT.target)

    console.log("Setting Properties...")

    const subscriptionId = BigInt(SUBSCRIPTION_ID) // Ensures uint64 compatibility
    await lootBox.setSubscriptionId(subscriptionId)
    await lootBox.setKeyHash(KEY_HASH)

    console.log("Creating Packs...")

    //create packs
    // const [signer] = await ethers.getSigners()
    // const LootBoxFactory = await ethers.getContractFactory("LootBox", signer)
    // const lootBox = LootBoxFactory.attach("0x9a35bf37edaf553959bbb38b1021c89073a5b550")

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
