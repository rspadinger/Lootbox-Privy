// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../LootBox.sol";

contract MockFulfillRandomWords is LootBox {
    constructor(
        address _vrfCoordinator,
        address _ethUsdFeed,
        address _lootUsdFeed,
        address _lootToken,
        address _usdcToken
    ) LootBox(_vrfCoordinator, _ethUsdFeed, _lootUsdFeed, _lootToken, _usdcToken) {}

    function testFulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external {
        fulfillRandomWords(requestId, randomWords);
    }
}
