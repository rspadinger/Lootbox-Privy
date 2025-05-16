// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ILootRedeemer {
    /// @notice Enum representing the type of reward.
    enum RewardType {
        NFT,
        XP
    }

    /// @notice Struct representing a burnable reward tier.
    /// @param rewardType Type of reward (NFT or XP)
    /// @param lootCost Amount of LOOT tokens required
    /// @param rewardValue Value of the reward (NFT ID or XP amount)
    struct BurnReward {
        RewardType rewardType;
        uint256 lootCost;
        uint256 rewardValue;
    }

    /// @notice Thrown when attempting to redeem a reward from a non-existent or unconfigured tier.
    error InvalidRewardTier();

    /// @notice Thrown when the LOOT token transfer from the user to the contract fails.
    error TransferFromFailed();

    /// @notice Thrown when burning (sending to address(0)) the LOOT tokens fails.
    error BurnFailed();

    /// @notice Emitted when a user burns LOOT for a reward.
    /// @param user The user address
    /// @param tier The reward tier selected
    /// @param rewardType Type of reward (NFT or XP)
    /// @param value The reward value received
    event BurnedForReward(address indexed user, uint256 tier, RewardType rewardType, uint256 value);

    /// @notice Sets a new burn reward for a given tier.
    /// @param tier The reward tier identifier
    /// @param rewardType The type of reward
    /// @param lootCost Amount of LOOT required to redeem the reward
    /// @param rewardValue NFT token ID or XP amount
    function setReward(uint256 tier, RewardType rewardType, uint256 lootCost, uint256 rewardValue) external;

    /// @notice Burns LOOT tokens in exchange for a tier reward.
    /// @param tier The reward tier to redeem
    function burnForReward(uint256 tier) external;

    /// @notice Withdraws LOOT tokens from the contract to a specified address.
    /// @param to The address to send the tokens
    /// @param amount The amount of LOOT tokens to withdraw
    function withdrawTokens(address to, uint256 amount) external;
}
