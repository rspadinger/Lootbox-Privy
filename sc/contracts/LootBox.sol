// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "./interfaces/AggregatorV3Interface.sol";

import "./interfaces/ILootBox.sol";
import "./interfaces/IXPModule.sol";
import "./RewardNFT.sol";

import "hardhat/console.sol";

//@note VRF docs: https://docs.chain.link/vrf/v2/getting-started && https://vrf.chain.link/
// VRF Setup: https://vrf.chain.link/
//@note CL data feeds: https://docs.chain.link/data-feeds && https://docs.chain.link/data-feeds/using-data-feeds

contract LootBox is ILootBox, VRFConsumerBaseV2Plus {
    // ----------------------------
    // Constants and Immutables
    // ----------------------------

    uint32 public constant CALLBACK_GAS_LIMIT = 100000;
    uint16 public constant REQUEST_CONFIRMATIONS = 3;
    uint256 public constant ERC20_SCALING_FACTOR = 1e20;
    uint256 public constant STALE_PRICE_DELAY = 1 hours;

    address public immutable vrfCoordinator;
    IERC20 public immutable lootToken;

    // ----------------------------
    // State Variables
    // ----------------------------

    uint256 public subscriptionId;
    bytes32 public keyHash;

    AggregatorV3Interface public ethUsdPriceFeed;
    AggregatorV3Interface public lootUsdPriceFeed;

    IERC20 public usdcToken;
    IXPModule public xpModule;
    RewardNFT public rewardNFT;

    mapping(string => PackType) public packTypes;
    mapping(uint256 => address) public requestIdToSender;
    mapping(uint256 => string) public requestIdToPackType;
    mapping(uint256 => uint256) public requestIdToAmount;

    //XP is a non-transferable, account-bound score typically used for leveling, achievements, or progression
    mapping(address => uint256) public xpBalances;

    string[] public packNames;
    mapping(string => bool) public packExists;

    // ----------------------------
    // Constructor
    // ----------------------------

    constructor(
        address _vrfCoordinator,
        address _ethUsdFeed,
        address _lootUsdFeed,
        address _lootToken,
        address _usdcToken
    ) VRFConsumerBaseV2Plus(_vrfCoordinator) {
        vrfCoordinator = _vrfCoordinator;
        ethUsdPriceFeed = AggregatorV3Interface(_ethUsdFeed);
        lootUsdPriceFeed = AggregatorV3Interface(_lootUsdFeed);
        lootToken = IERC20(_lootToken);
        usdcToken = IERC20(_usdcToken);
    }

    // ----------------------------
    // External Functions
    // ----------------------------

    /// @inheritdoc ILootBox
    function purchasePack(string memory packName, uint256 amount, PaymentToken paymentToken) external payable {
        if (amount == 0 || amount > 10) revert InvalidPackAmount(amount);

        PackType storage pack = packTypes[packName];
        if (pack.priceUSDC == 0) revert PackNotExisting();

        uint256 totalPriceUSDC = pack.priceUSDC * amount;
        uint256 discount = getBulkDiscount(amount);
        totalPriceUSDC -= (totalPriceUSDC * discount) / 100;

        if (paymentToken == PaymentToken.LOOT) {
            uint256 extraDiscount = (totalPriceUSDC * 10) / 100;
            totalPriceUSDC -= extraDiscount;

            //uint256 lootPriceUSD = getPrice(lootUsdPriceFeed); //price of LOOT in USD => 8 decimals
            uint256 lootPriceUSD = 200_000_000; //we dond have a feed at the moment => hardcode 2 USDC

            //eg: 1 LOOT == 2 USDC => if Pack is 100 USDC, we need to pay 50 LOOT
            //totalPriceUSDC is stored with 6 decimals => (6 + 20) - 8 = 18
            uint256 totalPriceLOOT = (totalPriceUSDC * ERC20_SCALING_FACTOR) / lootPriceUSD;

            lootToken.transferFrom(msg.sender, address(this), totalPriceLOOT);
        } else if (paymentToken == PaymentToken.ETH) {
            uint256 ethPriceUSD = getPrice(ethUsdPriceFeed);
            uint256 totalPriceETH = (totalPriceUSDC * ERC20_SCALING_FACTOR) / ethPriceUSD;

            if (msg.value < totalPriceETH) revert InsufficientETH(totalPriceETH, msg.value);

            // Refund excess
            if (msg.value > totalPriceETH) {
                payable(msg.sender).transfer(msg.value - totalPriceETH);
            }
        } else {
            usdcToken.transferFrom(msg.sender, address(this), totalPriceUSDC);
        }

        uint256 requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: subscriptionId,
                requestConfirmations: REQUEST_CONFIRMATIONS,
                callbackGasLimit: CALLBACK_GAS_LIMIT,
                numWords: uint32(amount),
                // Set nativePayment to true to pay for VRF requests with Sepolia ETH instead of LINK
                extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: false}))
            })
        );

        requestIdToSender[requestId] = msg.sender;
        requestIdToPackType[requestId] = packName;
        requestIdToAmount[requestId] = amount;

        emit PackPurchased(msg.sender, packName, amount, totalPriceUSDC, paymentToken);
        emit RandomnessRequested(requestId, msg.sender);
    }

    /// @inheritdoc ILootBox
    function withdrawETH(address payable recipient) external onlyOwner {
        (bool success, ) = recipient.call{value: address(this).balance}("");
        if (!success) revert ETHTransferFailed();
    }

    /// @inheritdoc ILootBox
    function withdrawERC20(address token, address recipient) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(recipient, balance);
    }

    /// @inheritdoc ILootBox
    function addOrUpdatePackType(
        string memory packName,
        uint256 priceUSDC,
        uint256[] memory rewardWeights,
        uint256[] memory rewardTypes,
        uint256[] memory rewardValues
    ) external onlyOwner {
        if (rewardWeights.length != rewardTypes.length && rewardTypes.length != rewardValues.length)
            revert ArrayLengthMismatch();

        bool isNewPack = !packExists[packName];

        // If it's a new pack, add it to the packNames array
        if (isNewPack) {
            packNames.push(packName);
            packExists[packName] = true;
            emit PackAdded(packName, priceUSDC);
        } else {
            emit PackUpdated(packName, priceUSDC);
        }

        packTypes[packName] = PackType(priceUSDC, rewardWeights, rewardTypes, rewardValues);
    }

    /// @inheritdoc ILootBox
    function deletePackType(string memory packName) external onlyOwner {
        if (bytes(packName).length == 0) revert PackNameEmpty();
        if (!packExists[packName]) revert PackNotExisting();

        // Remove from packNames array
        for (uint i = 0; i < packNames.length; i++) {
            if (keccak256(bytes(packNames[i])) == keccak256(bytes(packName))) {
                // Move the last element to the position being deleted
                packNames[i] = packNames[packNames.length - 1];
                packNames.pop();
                break;
            }
        }

        delete packTypes[packName];
        delete packExists[packName];

        emit PackDeleted(packName);
    }

    /// @inheritdoc ILootBox
    function setSubscriptionId(uint256 newId) external onlyOwner {
        if (newId == 0) revert InvalidSubscriptionID();
        uint256 oldId = subscriptionId;
        subscriptionId = newId;
        emit SubscriptionIdUpdated(oldId, newId);
    }

    /// @inheritdoc ILootBox
    function setKeyHash(bytes32 newKeyHash) external onlyOwner {
        if (newKeyHash == bytes32(0)) revert InvalidKeyHash();
        bytes32 oldKeyHash = keyHash;
        keyHash = newKeyHash;
        emit KeyHashUpdated(oldKeyHash, newKeyHash);
    }

    /// @inheritdoc ILootBox
    function setEthUsdPriceFeed(address feed) external onlyOwner {
        require(feed != address(0), "Invalid address");
        ethUsdPriceFeed = AggregatorV3Interface(feed);
        emit EthUsdPriceFeedUpdated(feed);
    }

    /// @inheritdoc ILootBox
    function setLootUsdPriceFeed(address feed) external onlyOwner {
        require(feed != address(0), "Invalid address");
        lootUsdPriceFeed = AggregatorV3Interface(feed);
        emit LootUsdPriceFeedUpdated(feed);
    }

    /// @inheritdoc ILootBox
    function setXPModule(address _xpModule) external onlyOwner {
        if (_xpModule == address(0)) revert ZeroAddressNotAllowed();
        xpModule = IXPModule(_xpModule);
        emit XPModuleUpdated(_xpModule);
    }

    /// @inheritdoc ILootBox
    function setRewardNFT(address _rewardNFT) external onlyOwner {
        rewardNFT = RewardNFT(_rewardNFT);
    }

    /// @inheritdoc ILootBox
    function getPackType(
        string memory packName
    )
        external
        view
        returns (
            uint256 priceUSDC,
            uint256[] memory rewardTypes,
            uint256[] memory rewardWeights,
            uint256[] memory rewardValues
        )
    {
        PackType storage pack = packTypes[packName];
        return (pack.priceUSDC, pack.rewardTypes, pack.rewardWeights, pack.rewardValues);
    }

    /// @inheritdoc ILootBox
    function getAllPacks()
        external
        view
        returns (
            string[] memory names,
            uint256[] memory prices,
            uint256[][] memory rewardTypes,
            uint256[][] memory rewardWeights,
            uint256[][] memory rewardValues
        )
    {
        uint256 length = packNames.length;

        prices = new uint256[](length);
        rewardTypes = new uint256[][](length);
        rewardWeights = new uint256[][](length);
        rewardValues = new uint256[][](length);

        for (uint256 i = 0; i < length; i++) {
            PackType storage pack = packTypes[packNames[i]];
            prices[i] = pack.priceUSDC;
            rewardTypes[i] = pack.rewardTypes;
            rewardWeights[i] = pack.rewardWeights;
            rewardValues[i] = pack.rewardValues;
        }

        return (packNames, prices, rewardTypes, rewardWeights, rewardValues);
    }

    /// @inheritdoc ILootBox
    function getPackCount() external view returns (uint256) {
        return packNames.length;
    }

    // ----------------------------
    // Internal Functions
    // ----------------------------

    /// @notice Callback function called by Chainlink VRF with randomness results.
    /// @dev Distributes rewards to the buyer based on random values received from Chainlink VRF.
    /// @param requestId The ID of the randomness request.
    /// @param randomWords An array of random values used to determine reward outcomes.
    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        address buyer = requestIdToSender[requestId];
        string memory packName = requestIdToPackType[requestId];
        uint256 amount = requestIdToAmount[requestId];
        PackType storage pack = packTypes[packName];

        for (uint256 i = 0; i < amount; i++) {
            uint256 rand = randomWords[i] % 100;
            uint256 rewardIndex = getRewardIndex(pack.rewardWeights, rand);
            uint256 rewardType = pack.rewardTypes[rewardIndex];
            uint256 rewardValue = pack.rewardValues[rewardIndex];

            if (rewardType == 0) {
                xpModule.addXP(buyer, rewardValue);
            } else if (rewardType == 1) {
                lootToken.transfer(buyer, rewardValue);
            } else if (rewardType == 2) {
                // NFT - represented as ERC1155 token with ID = rewardValue
                rewardNFT.mintReward(buyer, rewardValue, 1, "");
            }

            emit RewardMinted(buyer, rewardType, rewardValue);
        }
    }

    /// @notice Get the current price from Chainlink and check staleness
    /// @param feed The price feed interface
    /// @return price Latest price from the feed
    function getPrice(AggregatorV3Interface feed) internal view returns (uint256) {
        (uint80 roundID, int256 price, , uint256 updatedAt, uint80 answeredInRound) = feed.latestRoundData();
        if (price <= 0) revert InvalidFeedPrice();

        if (block.timestamp - updatedAt > STALE_PRICE_DELAY) revert StaleFeedPrice();
        // Check if the answered round is at least the current round
        if (answeredInRound < roundID) revert IncompleteFeedAnswer();

        return uint256(price);
    }

    /// @notice Get index from weighted random choice
    /// @param weights Array of weights
    /// @param rand Random number mod 100
    /// @return index Chosen index
    function getRewardIndex(uint256[] storage weights, uint256 rand) internal view returns (uint256) {
        for (uint256 i = 0; i < weights.length; i++) {
            if (rand < weights[i]) {
                return i;
            }
        }
        return weights.length - 1;
    }

    /// @notice Calculate bulk discount percentage
    /// @param amount Number of packs purchased
    /// @return discount Discount percent
    //get 3% for 2 items - for each additional item get another 2% up to 10 items max
    function getBulkDiscount(uint256 amount) internal pure returns (uint256) {
        if (amount < 2) return 0;
        uint256 discount = 3 + (amount - 2) * 2; //3, 5, 7, 9... %
        return discount > 20 ? 20 : discount;
    }

    // the following function is optional - currently not required !

    // Assume Chainlink VRF returned a big number. Split it into multiple rolls:
    // randoms[0] = uint256(keccak256(abi.encode(rand, 0)));
    // randoms[1] = uint256(keccak256(abi.encode(rand, 1)));

    // (uint256[] memory types, uint256[] memory values) = pickMultipleRewards(
    //     randoms,
    //     pack.rewardWeights,
    //     pack.rewardTypes,
    //     pack.rewardValues
    // );
    function pickMultipleRewards(
        uint256[] memory randomNumbers, // one per reward roll, e.g. [88, 34, 92]
        uint256[] memory rewardWeights,
        uint256[] memory rewardTypes,
        uint256[] memory rewardValues
    ) internal pure returns (uint256[] memory, uint256[] memory) {
        require(
            rewardWeights.length == rewardTypes.length && rewardTypes.length == rewardValues.length,
            "Mismatched reward config arrays"
        );

        uint256 numRolls = randomNumbers.length;
        uint256[] memory selectedTypes = new uint256[](numRolls);
        uint256[] memory selectedValues = new uint256[](numRolls);

        for (uint256 j = 0; j < numRolls; j++) {
            uint256 roll = randomNumbers[j] % 100;

            bool found = false;
            for (uint256 i = 0; i < rewardWeights.length; i++) {
                if (roll < rewardWeights[i]) {
                    selectedTypes[j] = rewardTypes[i];
                    selectedValues[j] = rewardValues[i];
                    found = true;
                    break;
                }
            }

            require(found, "Invalid reward configuration or random roll");
        }

        return (selectedTypes, selectedValues);
    }
}
