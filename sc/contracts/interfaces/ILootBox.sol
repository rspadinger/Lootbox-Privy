// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ILootBox {
    // ----------------------------
    // Types
    // ----------------------------

    /// @notice Enum for accepted payment tokens
    enum PaymentToken {
        LOOT,
        USDC,
        ETH
    }

    /// @notice Struct defining a loot pack
    struct PackType {
        uint256 priceUSDC;
        uint256[] rewardWeights;
        uint256[] rewardTypes; // 0: XP, 1: LOOT, 2: NFT
        uint256[] rewardValues;
    }

    // ----------------------------
    // Errors
    // ----------------------------

    error InvalidPackAmount(uint256 amount);
    error PackNotExisting();
    error InvalidFeedPrice();
    error InsufficientETH(uint256 expected, uint256 sent);
    error CallerNotLootBox();
    error InvalidXPAmount();
    error ETHTransferFailed();
    error ArrayLengthMismatch();
    error PackNameEmpty();
    error InvalidSubscriptionID();
    error InvalidKeyHash();
    error StaleFeedPrice();
    error IncompleteFeedAnswer();
    error ZeroAddressNotAllowed();

    // ----------------------------
    // Events
    // ----------------------------

    event PackPurchased(
        address indexed user,
        string packName,
        uint256 amount,
        uint256 priceUSD,
        PaymentToken paymentToken
    );

    event RewardMinted(address indexed user, uint256 rewardType, uint256 rewardValue);
    event RandomnessRequested(uint256 indexed requestId, address indexed user);
    event SubscriptionIdUpdated(uint256 oldId, uint256 newId);
    event KeyHashUpdated(bytes32 oldKeyHash, bytes32 newKeyHash);
    event XPModuleUpdated(address lootBox);
    event LootUsdPriceFeedUpdated(address priceFeed);
    event EthUsdPriceFeedUpdated(address priceFeed);
    event PackAdded(string packName, uint256 priceUSDC);
    event PackUpdated(string packName, uint256 priceUSDC);
    event PackDeleted(string packName);

    // ----------------------------
    // External Functions
    // ----------------------------

    /// @notice Purchase one or more loot packs using selected token
    /// @param packName The name of the pack type
    /// @param amount Number of packs to purchase
    /// @param paymentToken The token used to pay: ETH, LOOT, or USDC
    function purchasePack(string memory packName, uint256 amount, PaymentToken paymentToken) external payable;

    /// @notice Withdraw ERC20 tokens from the contract
    /// @param token Address of the token to withdraw
    /// @param recipient Address to receive the withdrawn tokens
    function withdrawERC20(address token, address recipient) external;

    /// @notice Withdraw ETH from the contract
    /// @param recipient Address to receive the withdrawn ETH
    function withdrawETH(address payable recipient) external;

    /// @notice Set the Chainlink subscription ID for randomness
    /// @param _subscriptionId The Chainlink VRF subscription ID
    function setSubscriptionId(uint256 _subscriptionId) external;

    /// @notice Set the Chainlink key hash
    /// @param _keyHash The VRF key hash
    function setKeyHash(bytes32 _keyHash) external;

    /// @notice Add or update a pack type
    /// @param packName The name of the pack
    /// @param priceUSDC The price in USDC
    /// @param rewardWeights Cumulative weights for reward distribution
    /// @param rewardTypes Reward types (0: XP, 1: LOOT, 2: NFT)
    /// @param rewardValues Values for each reward type
    function addOrUpdatePackType(
        string memory packName,
        uint256 priceUSDC,
        uint256[] memory rewardWeights,
        uint256[] memory rewardTypes,
        uint256[] memory rewardValues
    ) external;

    /// @notice Remove an existing pack type
    /// @param packName The name of the pack to delete
    function deletePackType(string memory packName) external;

    /// @notice Sets the Chainlink price feed for ETH/USD.
    /// @param feed The address of the new ETH/USD price feed.
    function setEthUsdPriceFeed(address feed) external;

    /// @notice Sets the Chainlink price feed for LOOT/USD.
    /// @param feed The address of the new LOOT/USD price feed.
    function setLootUsdPriceFeed(address feed) external;

    /// @notice Sets the address of the XPModule contract for handling XP rewards.
    /// @param _xpModule The address of the XPModule contract.
    function setXPModule(address _xpModule) external;

    /// @notice Sets the address of the ERC1155 contract used for NFT rewards.
    /// @param _rewardNFT The address of the reward NFT contract.
    function setRewardNFT(address _rewardNFT) external;

    /// @notice Returns all fields of a pack type
    /// @param packName The name of the pack type
    /// @return priceUSDC The price in USDC
    /// @return rewardTypes Array of reward types (0: XP, 1: LOOT, 2: NFT)
    /// @return rewardWeights Array of reward weights
    /// @return rewardValues Array of reward values
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
        );

    /// @notice Get all registered pack types
    /// @return names Array of pack names
    /// @return prices Array of pack prices in USDC
    /// @return rewardTypes Array of arrays containing reward types for each pack
    /// @return rewardWeights Array of arrays containing reward weights for each pack
    /// @return rewardValues Array of arrays containing reward values for each pack
    function getAllPacks()
        external
        view
        returns (
            string[] memory names,
            uint256[] memory prices,
            uint256[][] memory rewardTypes,
            uint256[][] memory rewardWeights,
            uint256[][] memory rewardValues
        );

    /// @notice Get the total number of registered packs
    /// @return The count of registered packs
    function getPackCount() external view returns (uint256);
}
