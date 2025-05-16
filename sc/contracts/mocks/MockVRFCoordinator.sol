// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "hardhat/console.sol";

contract MockVRFCoordinator {
    uint256 public requestIdCounter = 1;

    mapping(uint256 => address) public requestIdToSender;
    mapping(uint256 => string) public requestIdToPackType;
    mapping(uint256 => uint256) public requestIdToAmount;
    mapping(uint256 => uint256[]) public requestIdToRandomWords;

    event RandomWordsFulfilled(uint256 requestId, uint256[] randomWords);

    function requestRandomWords(VRFV2PlusClient.RandomWordsRequest calldata req) external returns (uint256 requestId) {
        requestId = requestIdCounter++;

        requestIdToSender[requestId] = msg.sender;
        requestIdToPackType[requestId] = "MockPack";
        requestIdToAmount[requestId] = req.numWords;

        uint256[] memory randomWords = generateRandomWords(req.numWords);
        requestIdToRandomWords[requestId] = randomWords;

        emit RandomWordsFulfilled(requestId, randomWords);
        return requestId;
    }

    function getRandomWordsByRequestId(uint256 requestId) public view returns (uint256[] memory) {
        return requestIdToRandomWords[requestId];
    }

    function getLatestRequestId() public view returns (uint256) {
        return requestIdCounter - 1;
    }

    function getRequestAmount(uint256 requestId) external view returns (uint256) {
        return requestIdToAmount[requestId];
    }

    function generateRandomWords(uint32 numWords) public view returns (uint256[] memory randomWords) {
        randomWords = new uint256[](numWords);
        for (uint32 i = 0; i < numWords; i++) {
            randomWords[i] = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, i)));
        }
    }
}
