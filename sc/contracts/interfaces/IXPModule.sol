// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IXPModule {
    // ----------------------------
    // Errors
    // ----------------------------

    /// @notice Thrown when XP amount is zero
    error InvalidXPAmount();

    /// @notice Thrown when trying to set a zero address as authorized contract
    error ZeroAddressNotAllowed();

    /// @notice Thrown when caller is not the authorized loot box contract
    error NotAuthorizedLootBox();

    // ----------------------------
    // Events
    // ----------------------------

    /// @notice Emitted when the loot box contract is updated
    /// @param lootBox Address of the new loot box contract
    event LootBoxUpdated(address lootBox);

    /// @notice Emitted when XP is added to a user
    /// @param user Address of the user
    /// @param amount Amount of XP added
    /// @param totalXP total XP held by the user
    event XPAwarded(address indexed user, uint256 amount, uint256 totalXP);

    /// @notice Emitted when a user's level increases.
    /// @param user The address of the user whose level has changed.
    /// @param newLevel The new level achieved by the user.
    event LevelUp(address indexed user, uint256 newLevel);

    // ----------------------------
    // External Functions
    // ----------------------------

    /// @notice Add XP to a specific user. Can only be called by the loot box contract.
    /// @dev Award XP and auto-calculate level up
    /// @param user Address of the user
    /// @param amount Amount of XP to add
    function addXP(address user, uint256 amount) external;

    /// @notice Sets the authorized loot box contract
    /// @param lootBox Address of the loot box contract
    function setLootBoxContract(address lootBox) external;

    /// @notice Returns the XP balance of a specific user
    /// @param user Address of the user
    /// @return xp Amount of XP
    function getXP(address user) external view returns (uint256 xp);

    /// @notice Calculates the level based on a given XP amount.
    /// @dev Simple quadratic level progression: XP needed for level n is n² * 100
    /// @param xp The XP amount to evaluate.
    /// @return level The corresponding level for the given XP.
    function calculateLevel(uint256 xp) external pure returns (uint256 level);

    /// @notice Returns the XP required to reach a given level.
    /// @param level The target level.
    /// @return xpRequired The XP required to reach the specified level.
    function xpRequiredForLevel(uint256 level) external pure returns (uint256 xpRequired);

    /// @notice Retrieves the current level of a specific user.
    /// @param user The address of the user.
    /// @return level The current level of the user.
    function getLevel(address user) external view returns (uint256 level);
}
