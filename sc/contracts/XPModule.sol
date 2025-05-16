// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IXPModule.sol";

contract XPModule is IXPModule, Ownable {
    // ----------------------------
    // State Variables
    // ----------------------------

    address public lootBoxContract;
    mapping(address => uint256) public xpBalances;
    mapping(address => uint256) public levels;

    /// @notice Modifier to restrict functions to the LootBox contract
    modifier onlyLootBox() {
        if (msg.sender != lootBoxContract) revert NotAuthorizedLootBox();
        _;
    }

    constructor() Ownable(msg.sender) {}

    // ----------------------------
    // External Functions
    // ----------------------------

    /// @inheritdoc IXPModule
    function setLootBoxContract(address _lootBoxContract) external onlyOwner {
        if (_lootBoxContract == address(0)) revert ZeroAddressNotAllowed();
        lootBoxContract = _lootBoxContract;
        emit LootBoxUpdated(_lootBoxContract);
    }

    /// @inheritdoc IXPModule
    function addXP(address user, uint256 amount) external onlyLootBox {
        if (amount == 0) revert InvalidXPAmount();

        xpBalances[user] += amount;
        emit XPAwarded(user, amount, xpBalances[user]);

        uint256 currentLevel = levels[user];
        uint256 newLevel = calculateLevel(xpBalances[user]);

        if (newLevel > currentLevel) {
            levels[user] = newLevel;
            emit LevelUp(user, newLevel);
        }
    }

    /// @inheritdoc IXPModule
    function calculateLevel(uint256 xp) public pure returns (uint256) {
        uint256 level = 0;
        while (xp >= xpRequiredForLevel(level + 1)) {
            level++;
        }
        return level;
    }

    /// @inheritdoc IXPModule
    function xpRequiredForLevel(uint256 level) public pure returns (uint256) {
        return level * level * 100;
    }

    /// @inheritdoc IXPModule
    function getLevel(address user) external view returns (uint256) {
        return levels[user];
    }

    /// @inheritdoc IXPModule
    function getXP(address user) external view returns (uint256) {
        return xpBalances[user];
    }
}
