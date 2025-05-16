// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

//import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "../interfaces/AggregatorV3Interface.sol";

contract MockAggregator is AggregatorV3Interface {
    int256 private _price;
    uint8 private _decimals;
    uint256 private _updatedAt;
    uint80 private _roundId;
    uint80 private _answeredInRound;

    constructor(int256 price, uint8 decimals, uint256 updatedAt, uint80 roundId, uint80 answeredInRound) {
        _price = price;
        _decimals = decimals;
        _updatedAt = updatedAt;
        _roundId = roundId;
        _answeredInRound = answeredInRound;
    }

    // --- Setter functions for testing ---
    function setPrice(int256 newPrice) external {
        _price = newPrice;
    }

    function setUpdatedAt(uint256 newTimestamp) external {
        _updatedAt = newTimestamp;
    }

    function setAnsweredInRound(uint80 newAnsweredInRound) external {
        _answeredInRound = newAnsweredInRound;
    }

    function setRoundId(uint80 newRoundId) external {
        _roundId = newRoundId;
    }

    // --- AggregatorV3Interface implementation ---

    function latestRoundData() external view override returns (uint80, int256, uint256, uint256, uint80) {
        return (_roundId, _price, 0, _updatedAt, _answeredInRound);
    }

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function description() external view override returns (string memory) {
        return "MockAggregator";
    }

    function version() external view override returns (uint256) {
        return 1;
    }

    function getRoundData(uint80) external view override returns (uint80, int256, uint256, uint256, uint80) {
        return (_roundId, _price, 0, _updatedAt, _answeredInRound);
    }
}
