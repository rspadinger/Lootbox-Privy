const { expect } = require("chai")
const { loadFixture, setBalance, time } = require("@nomicfoundation/hardhat-network-helpers")
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs")

describe("LootBox Contract", function () {
    async function deployContractFixture() {
        const [owner, user, otherUser] = await ethers.getSigners()

        const nowInSeconds = Math.floor(Date.now() / 1000)

        // Deploy MockERC20 for LOOT
        const MockERC20 = await ethers.getContractFactory("MockERC20")
        const mockLootToken = await MockERC20.deploy("Loot Token", "LOOT", 18, ethers.parseEther("1000000"))
        const mockUsdcToken = await MockERC20.deploy("USDC", "USDC", 6, ethers.parseUnits("1000000", 6))

        // Deploy MockAggregator for LOOT and USDC price feeds
        const MockAggregator = await ethers.getContractFactory("MockAggregator")
        const mockLootUsdFeed = await MockAggregator.deploy(ethers.parseUnits("2", 8), 8, nowInSeconds, 1, 1) // 8 decimals for LOOT
        const mockEthUsdFeed = await MockAggregator.deploy(ethers.parseUnits("2000", 8), 8, nowInSeconds, 1, 1) // Example ETH/USD price (2000)

        // Deploy MockVRFCoordinator
        const MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinator")
        const mockVRFCoordinator = await MockVRFCoordinator.deploy()

        // Deploy LootBox contract with all required mocks
        const LootBox = await ethers.getContractFactory("MockFulfillRandomWords") // inherits LootBox
        const lootBox = await LootBox.deploy(
            mockVRFCoordinator.target,
            mockEthUsdFeed.target,
            mockLootUsdFeed.target,
            mockLootToken.target,
            mockUsdcToken.target
        )

        // Deploy XPModule
        const XPModule = await ethers.getContractFactory("XPModule")
        const xPModule = await XPModule.deploy()
        xPModule.setLootBoxContract(lootBox.target)

        lootBox.setXPModule(xPModule.target)

        // Return all deployed contracts and addresses
        return {
            lootBox,
            mockVRFCoordinator,
            mockLootToken,
            mockUsdcToken,
            mockLootUsdFeed,
            mockEthUsdFeed,
            owner,
            user,
            otherUser,
        }
    }

    describe("Deployment and Initialization", function () {
        it("Should deploy with correct initial state", async function () {
            const { lootBox, mockVRFCoordinator, mockLootToken, mockUsdcToken, mockLootUsdFeed, mockEthUsdFeed } =
                await loadFixture(deployContractFixture)

            expect(await lootBox.vrfCoordinator()).to.equal(mockVRFCoordinator.target)
            expect(await lootBox.lootToken()).to.equal(mockLootToken.target)
            expect(await lootBox.usdcToken()).to.equal(mockUsdcToken.target)
            expect(await lootBox.lootUsdPriceFeed()).to.equal(mockLootUsdFeed.target)
            expect(await lootBox.ethUsdPriceFeed()).to.equal(mockEthUsdFeed.target)
        })

        it("Should set initial subscription ID and key hash", async function () {
            const { lootBox, owner } = await loadFixture(deployContractFixture)

            const subscriptionId = 1
            const keyHash = "0x" + "1".repeat(64)

            await expect(lootBox.connect(owner).setSubscriptionId(subscriptionId))
                .to.emit(lootBox, "SubscriptionIdUpdated")
                .withArgs(0, subscriptionId)

            await expect(lootBox.connect(owner).setKeyHash(keyHash))
                .to.emit(lootBox, "KeyHashUpdated")
                .withArgs("0x" + "0".repeat(64), keyHash)
        })
    })

    describe("Pack Management", function () {
        it("Should add new pack type", async function () {
            const { lootBox, owner } = await loadFixture(deployContractFixture)

            //GOLD: rewardWeights: [70, 90, 100] --- rewardValues: [100, 10e18, 1]
            //Silver: rewardWeights: [50, 85, 100] --- rewardValues: [200, 25e18, 2]
            //Bronze: rewardWeights: [30, 70, 100] --- rewardValues: [300, 50e18, 3]

            const packName = "GOLD"
            const priceUSDC = 10 * 10 ** 6
            const rewardTypes = [0, 1, 2]
            const rewardWeights = [30, 70, 100]
            const rewardValues = [100, ethers.parseEther("50"), 1]

            await lootBox
                .connect(owner)
                .addOrUpdatePackType(packName, priceUSDC, rewardWeights, rewardTypes, rewardValues)

            const pack = await lootBox.getPackType(packName)

            expect(pack.priceUSDC).to.equal(priceUSDC)
            expect(pack.rewardTypes.length).to.equal(3)
            expect(pack.rewardWeights.length).to.equal(3)
            expect(pack.rewardValues.length).to.equal(3)
        })

        it("Should update existing pack type", async function () {
            const { lootBox, owner } = await loadFixture(deployContractFixture)

            const packName = "GOLD"
            const initialPrice = 10 * 10 ** 6
            const updatedPrice = 15 * 10 ** 6

            // Add initial pack
            await lootBox
                .connect(owner)
                .addOrUpdatePackType(
                    packName,
                    initialPrice,
                    [30, 70, 100],
                    [0, 1, 2],
                    [100, ethers.parseEther("50"), 1]
                )

            // Update pack
            await lootBox
                .connect(owner)
                .addOrUpdatePackType(
                    packName,
                    updatedPrice,
                    [30, 70, 100],
                    [0, 1, 2],
                    [100, ethers.parseEther("50"), 1]
                )

            const pack = await lootBox.getPackType(packName)

            expect(pack.priceUSDC).to.equal(updatedPrice)
        })

        it("Should delete pack type", async function () {
            const { lootBox, owner } = await loadFixture(deployContractFixture)

            const packName = "GOLD"

            // Add pack
            await lootBox
                .connect(owner)
                .addOrUpdatePackType(
                    packName,
                    10 * 10 ** 6,
                    [30, 70, 100],
                    [0, 1, 2],
                    [100, ethers.parseEther("50"), 1]
                )

            // Delete pack
            await lootBox.connect(owner).deletePackType(packName)

            const pack = await lootBox.getPackType(packName)

            expect(pack.rewardWeights.length).to.equal(0)
        })
    })

    describe("Purchase and Payment Processing", function () {
        it("Should purchase pack with LOOT token", async function () {
            const { lootBox, mockVRFCoordinator, mockLootToken, mockLootUsdFeed, user } = await loadFixture(
                deployContractFixture
            )

            const packName = "GOLD"
            const amount = 1
            const paymentToken = 0 // PaymentToken.LOOT

            // Add pack type
            await lootBox.addOrUpdatePackType(
                packName,
                10 * 10 ** 6,
                [30, 70, 100],
                [0, 1, 2],
                [100, ethers.parseEther("50"), 1]
            )

            // Set LOOT/USD price
            await mockLootUsdFeed.setPrice(2 * 10 ** 8) // 1 LOOT = 2 USDC

            // Fund user and approve
            await mockLootToken.mint(user.address, ethers.parseEther("1000"))
            await mockLootToken.connect(user).approve(lootBox.target, ethers.parseEther("1000"))

            const initialBalance = await mockLootToken.balanceOf(user.address)

            // Purchase pack
            await expect(lootBox.connect(user).purchasePack(packName, amount, paymentToken))
                .to.emit(lootBox, "PackPurchased")
                .withArgs(user.address, packName, amount, 9 * 10 ** 6, paymentToken)
                .to.emit(lootBox, "RandomnessRequested")

            // Verify balance change
            const finalBalance = await mockLootToken.balanceOf(user.address)
            const expectedBalance = initialBalance - ethers.parseEther("4.5")
            expect(finalBalance).to.equal(expectedBalance)
        })

        it("Should purchase pack with ETH", async function () {
            const { lootBox, mockVRFCoordinator, mockEthUsdFeed, user } = await loadFixture(deployContractFixture)

            const packName = "GOLD"
            const amount = 1
            const paymentToken = 2 // PaymentToken.ETH

            // Add pack type
            await lootBox.addOrUpdatePackType(
                packName,
                10 * 10 ** 6,
                [30, 70, 100],
                [0, 1, 2],

                [100, ethers.parseEther("50"), 1]
            )

            // Set ETH/USD price
            await mockEthUsdFeed.setPrice(2000 * 10 ** 8) // 1 ETH = 2000 USDC

            // Fund user with ETH
            await setBalance(user.address, ethers.parseEther("1"))

            // Calculate required ETH amount
            const requiredEth = ethers.parseEther("0.0050") // 10 USDC / 2000 USDC/ETH

            // Purchase pack
            await expect(lootBox.connect(user).purchasePack(packName, amount, paymentToken, { value: requiredEth }))
                .to.emit(lootBox, "PackPurchased")
                .withArgs(user.address, packName, amount, 10 * 10 ** 6, paymentToken)
                .to.emit(lootBox, "RandomnessRequested")
        })

        it("Should purchase pack with USDC", async function () {
            const { lootBox, mockVRFCoordinator, mockUsdcToken, user } = await loadFixture(deployContractFixture)

            const packName = "GOLD"
            const amount = 1
            const paymentToken = 1 // PaymentToken.USDC

            // Add pack type
            await lootBox.addOrUpdatePackType(
                packName,
                10 * 10 ** 6,
                [30, 70, 100],
                [0, 1, 2],
                [100, ethers.parseEther("50"), 1]
            )

            // Fund user with USDC
            await mockUsdcToken.mint(user.address, ethers.parseUnits("1000", 6))
            await mockUsdcToken.connect(user).approve(lootBox.target, ethers.parseUnits("1000", 6))

            // Purchase pack
            await expect(lootBox.connect(user).purchasePack(packName, amount, paymentToken))
                .to.emit(lootBox, "PackPurchased")
                .withArgs(user.address, packName, amount, 10 * 10 ** 6, paymentToken)
                .to.emit(lootBox, "RandomnessRequested")
        })

        it("Should apply bulk discount", async function () {
            const { lootBox, mockLootToken, mockLootUsdFeed, user } = await loadFixture(deployContractFixture)

            const packName = "GOLD"
            const amount = 5 // Should get 9% discount (3% + 2% * 3)
            const paymentToken = 0 // PaymentToken.LOOT

            // Add pack type
            await lootBox.addOrUpdatePackType(
                packName,
                10 * 10 ** 6,
                [30, 70, 100],
                [0, 1, 2],
                [100, ethers.parseEther("50"), 1]
            )

            // Set LOOT/USD price
            await mockLootUsdFeed.setPrice(2 * 10 ** 8)

            // Fund user and approve
            await mockLootToken.mint(user.address, ethers.parseEther("1000"))
            await mockLootToken.connect(user).approve(lootBox.target, ethers.parseEther("1000"))

            const initialBalance = await mockLootToken.balanceOf(user.address)

            // Purchase pack
            await lootBox.connect(user).purchasePack(packName, amount, paymentToken)

            // Verify balance change with discount
            const finalBalance = await mockLootToken.balanceOf(user.address)
            const expectedBalance = initialBalance - ethers.parseEther("20.475") // 5 * 4.5 * 0.91
            expect(finalBalance).to.equal(expectedBalance)
        })
    })

    describe("Reward Distribution", function () {
        it("Should distribute XP rewards", async function () {
            const { lootBox, mockVRFCoordinator, mockLootToken, user } = await loadFixture(deployContractFixture)

            const packName = "GOLD"
            const amount = 1
            const paymentToken = 0 // PaymentToken.LOOT

            // Add pack type with XP reward onlly - 100 XP
            await lootBox.addOrUpdatePackType(packName, 10 * 10 ** 6, [100], [0], [100])

            await mockLootToken.mint(user.address, ethers.parseEther("1000")) // Mint 1000 LOOT tokens
            await mockLootToken.connect(user).approve(lootBox.target, ethers.parseEther("1000"))

            const tx = await lootBox.connect(user).purchasePack(packName, amount, paymentToken)
            const receipt = await tx.wait()

            const logs = receipt.logs
                .map((log) => {
                    try {
                        return lootBox.interface.parseLog(log)
                    } catch (e) {
                        return null
                    }
                })
                .filter((log) => log && log.name === "RandomnessRequested")

            const requestId = logs[0].args[0]

            const amountRandomWords = await mockVRFCoordinator.getRequestAmount(requestId)
            const result = await mockVRFCoordinator.getRandomWordsByRequestId(requestId)

            //@note convert the result into a plain JavaScript array before passing it to the function
            const randomWords = result.map(BigInt)

            await expect(lootBox.testFulfillRandomWords(requestId, randomWords))
                .to.emit(lootBox, "RewardMinted")
                .withArgs(user.address, 0, 100)
        })

        it("Should distribute LOOT token rewards", async function () {
            const { lootBox, mockVRFCoordinator, mockLootToken, user } = await loadFixture(deployContractFixture)

            const packName = "GOLD"
            const amount = 1
            const paymentToken = 0 // PaymentToken.LOOT

            // Add pack type with LOOT reward
            await lootBox.addOrUpdatePackType(packName, 10 * 10 ** 6, [100], [1], [ethers.parseEther("50")])

            await mockLootToken.mint(user.address, ethers.parseEther("1000")) // Mint 1000 LOOT tokens
            await mockLootToken.connect(user).approve(lootBox.target, ethers.parseEther("1000"))

            const tx = await lootBox.connect(user).purchasePack(packName, amount, paymentToken)
            const receipt = await tx.wait()

            const logs = receipt.logs
                .map((log) => {
                    try {
                        return lootBox.interface.parseLog(log)
                    } catch (e) {
                        return null
                    }
                })
                .filter((log) => log && log.name === "RandomnessRequested")

            const requestId = logs[0].args[0]

            const amountRandomWords = await mockVRFCoordinator.getRequestAmount(requestId)
            const result = await mockVRFCoordinator.getRandomWordsByRequestId(requestId)

            const randomWords = result.map(BigInt)

            //the LootBox will distribute LOOT tokens => we need to provide the contract with LOOT tokens
            await mockLootToken.mint(lootBox.target, ethers.parseEther("10000"))

            // Fulfill random words
            await expect(lootBox.testFulfillRandomWords(requestId, randomWords))
                .to.emit(lootBox, "RewardMinted")
                .withArgs(user.address, 1, ethers.parseEther("50"))
        })

        it("Should distribute LOOT token rewards 2", async function () {
            const { lootBox, mockVRFCoordinator, mockLootToken, user } = await loadFixture(deployContractFixture)

            // Test configuration
            const packName = "GOLD"
            const amount = 1
            const PaymentToken = { LOOT: 0, USDC: 1, ETH: 2 }
            const RewardType = { XP: 0, LOOT: 1, NFT: 2 }
            const rewardAmount = ethers.parseEther("50")

            // Setup pack with 100% chance of LOOT token reward
            await lootBox.addOrUpdatePackType(
                packName,
                ethers.parseUnits("10", 6), // 10 USDC
                [100], // 100% chance
                [RewardType.LOOT],
                [rewardAmount]
            )

            // Setup user with LOOT tokens for purchase
            await mockLootToken.mint(user.address, ethers.parseEther("1000"))
            await mockLootToken.connect(user).approve(lootBox.target, ethers.parseEther("1000"))

            // Record initial balances
            const userInitialBalance = await mockLootToken.balanceOf(user.address)

            // Purchase pack
            const tx = await lootBox.connect(user).purchasePack(packName, amount, PaymentToken.LOOT)

            //@note Get requestId from event
            const requestId = (await tx.wait()).logs.find((log) => {
                try {
                    const parsed = lootBox.interface.parseLog(log)
                    return parsed.name === "RandomnessRequested"
                } catch {
                    return false
                }
            }).args[0]

            // Setup LootBox contract with tokens for rewards
            await mockLootToken.mint(lootBox.target, ethers.parseEther("10000"))
            const contractInitialBalance = await mockLootToken.balanceOf(lootBox.target)

            // Get random words from mock coordinator
            const randomWords = (await mockVRFCoordinator.getRandomWordsByRequestId(requestId)).map(BigInt)

            // Distribute rewards and verify events
            await expect(lootBox.testFulfillRandomWords(requestId, randomWords))
                .to.emit(lootBox, "RewardMinted")
                .withArgs(user.address, RewardType.LOOT, rewardAmount)

            // Verify final balances
            expect(await mockLootToken.balanceOf(user.address)).to.equal(
                userInitialBalance - ethers.parseEther("4.5") + rewardAmount // Purchase cost (with 10% discount) + reward
            )
            expect(await mockLootToken.balanceOf(lootBox.target)).to.equal(contractInitialBalance - rewardAmount)
        })
    })

    describe("Admin Functions", function () {
        it("Should withdraw ETH", async function () {
            const { lootBox, mockEthUsdFeed, owner, user } = await loadFixture(deployContractFixture)

            // First verify the contract has no initial ETH balance
            expect(await ethers.provider.getBalance(lootBox.target)).to.equal(0)

            // Send ETH to contract through a purchase instead of direct transfer
            const packName = "GOLD"
            const amount = 1
            const paymentToken = 2 // PaymentToken.ETH

            // Add pack type
            await lootBox.addOrUpdatePackType(
                packName,
                10 * 10 ** 6, // 10 USDC
                [30, 70, 100],
                [0, 1, 2],
                [100, ethers.parseEther("50"), 1]
            )

            // Set ETH/USD price (1 ETH = 2000 USDC)
            await mockEthUsdFeed.setPrice(2000 * 10 ** 8)

            // Send more ETH than needed to ensure there's excess ETH in contract
            const requiredEth = ethers.parseEther("0.01") // More than needed
            await lootBox.connect(user).purchasePack(packName, amount, paymentToken, { value: requiredEth })

            // Verify contract has ETH balance
            const contractBalance = await ethers.provider.getBalance(lootBox.target)
            expect(contractBalance).to.be.gt(0)

            // Track user balance change during withdrawal
            await expect(lootBox.connect(owner).withdrawETH(user.address)).to.changeEtherBalance(user, contractBalance)

            // Verify contract balance is now 0
            expect(await ethers.provider.getBalance(lootBox.target)).to.equal(0)
        })

        it("Should withdraw ERC20 tokens", async function () {
            const { lootBox, mockLootToken, owner, user } = await loadFixture(deployContractFixture)

            // Mint some LOOT tokens to the contract
            await mockLootToken.mint(lootBox.target, ethers.parseEther("100"))

            await expect(
                lootBox.connect(owner).withdrawERC20(mockLootToken.target, user.address)
            ).to.changeTokenBalance(mockLootToken, user, ethers.parseEther("100"))
        })

        it("Should update price feeds", async function () {
            const { lootBox, mockLootUsdFeed, mockEthUsdFeed, owner } = await loadFixture(deployContractFixture)

            const newLootFeed = mockLootUsdFeed.target
            const newEthFeed = mockEthUsdFeed.target

            await expect(lootBox.connect(owner).setLootUsdPriceFeed(newLootFeed))
                .to.emit(lootBox, "LootUsdPriceFeedUpdated")
                .withArgs(newLootFeed)

            await expect(lootBox.connect(owner).setEthUsdPriceFeed(newEthFeed))
                .to.emit(lootBox, "EthUsdPriceFeedUpdated")
                .withArgs(newEthFeed)
        })
    })

    describe("Error Handling", function () {
        it("Should revert on invalid pack amount", async function () {
            const { lootBox, user } = await loadFixture(deployContractFixture)

            await expect(lootBox.connect(user).purchasePack("GOLD", 0, 0)).to.be.revertedWithCustomError(
                lootBox,
                "InvalidPackAmount"
            )

            await expect(lootBox.connect(user).purchasePack("GOLD", 11, 0)).to.be.revertedWithCustomError(
                lootBox,
                "InvalidPackAmount"
            )
        })

        it("Should revert on non-existent pack", async function () {
            const { lootBox, user } = await loadFixture(deployContractFixture)

            await expect(lootBox.connect(user).purchasePack("NONEXISTENT", 1, 0)).to.be.revertedWithCustomError(
                lootBox,
                "PackNotExisting"
            )
        })

        it("Should revert on insufficient ETH", async function () {
            const { lootBox, user } = await loadFixture(deployContractFixture)

            // Add pack type
            await lootBox.addOrUpdatePackType(
                "GOLD",
                10 * 10 ** 6,
                [30, 70, 100],
                [0, 1, 2],
                [100, ethers.parseEther("50"), 1]
            )

            await expect(
                lootBox.connect(user).purchasePack("GOLD", 1, 2, { value: ethers.parseEther("0.001") })
            ).to.be.revertedWithCustomError(lootBox, "InsufficientETH")
        })

        //xit("NOT REQUIRED", async function () {
        // const tx = await lootBox.connect(user).purchasePack(packName, amount, paymentToken)
        // const receipt = await tx.wait()
        // const logs = receipt.logs
        //     .map((log) => {
        //         try {
        //             return lootBox.interface.parseLog(log)
        //         } catch (e) {
        //             return null
        //         }
        //     })
        //     .filter((log) => log && log.name === "RandomnessRequested")
        // requestId = logs[0].args[0]
        // const amountRandomWords = await mockVRFCoordinator.getRequestAmount(requestId)
        // const result = await mockVRFCoordinator.getRandomWordsByRequestId(requestId)
        //@note convert the result into a plain JavaScript array before passing it to the function
        // const randomWords = result.map(BigInt)
        // await lootBox.testFulfillRandomWords(requestId, randomWords)
        //await lootBox.testFulfillRandomWords(1, [BigInt(42), BigInt(1337)])
        //})
    })
})
