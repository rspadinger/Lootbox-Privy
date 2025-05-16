// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./RewardNFT.sol";
import "./interfaces/IXPModule.sol";
import "./interfaces/ILootRedeemer.sol";

// Example Reward Tiers Setup => Tier is an identifier for a reward category in the burn-to-unlock system.
// It represents a specific reward package that a player can unlock by burning LOOT tokens.
// Tier 1: 500 LOOT → NFT (tokenId 3)
// Tier 2: 300 LOOT → 200 XP
// setReward(1, RewardType.NFT, 500 ether, 3);
// setReward(2, RewardType.XP, 300 ether, 200);

/// @title LootRedeemer
/// @notice Handles redemption of LOOT tokens for NFTs or XP rewards.
contract LootRedeemer is ILootRedeemer, Ownable {
    // -----------------------------
    // State Variables
    // -----------------------------

    IERC20 public lootToken;
    RewardNFT public rewardNFT;
    IXPModule public xpModule;

    mapping(uint256 => BurnReward) public rewards;

    /// @notice Initializes the LootRedeemer contract.
    /// @param _loot Address of the LOOT token
    /// @param _rewardNFT Address of the RewardNFT contract
    /// @param _xpModule Address of the XPModule contract
    constructor(address _loot, address _rewardNFT, address _xpModule) Ownable(msg.sender) {
        lootToken = IERC20(_loot);
        rewardNFT = RewardNFT(_rewardNFT);
        xpModule = IXPModule(_xpModule);
    }

    // -----------------------------
    // External Functions
    // -----------------------------

    /// @inheritdoc ILootRedeemer
    function setReward(uint256 tier, RewardType rewardType, uint256 lootCost, uint256 rewardValue) external onlyOwner {
        rewards[tier] = BurnReward(rewardType, lootCost, rewardValue);
    }

    /// @inheritdoc ILootRedeemer
    function burnForReward(uint256 tier) external {
        BurnReward memory reward = rewards[tier];

        if (reward.lootCost == 0) {
            revert InvalidRewardTier();
        }

        bool success = lootToken.transferFrom(msg.sender, address(this), reward.lootCost);
        if (!success) {
            revert TransferFromFailed();
        }

        success = lootToken.transfer(address(0), reward.lootCost);
        if (!success) {
            revert BurnFailed();
        }

        if (reward.rewardType == RewardType.NFT) {
            rewardNFT.mintReward(msg.sender, reward.rewardValue, 1, ""); // Mint NFT (tokenId = rewardValue)
        } else if (reward.rewardType == RewardType.XP) {
            xpModule.addXP(msg.sender, reward.rewardValue);
        }

        emit BurnedForReward(msg.sender, tier, reward.rewardType, reward.rewardValue);
    }

    /// @inheritdoc ILootRedeemer
    function withdrawTokens(address to, uint256 amount) external onlyOwner {
        lootToken.transfer(to, amount); // Optional escape hatch
    }
}
