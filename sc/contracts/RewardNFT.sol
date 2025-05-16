// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

//1 :: Sword :: https://gateway.pinata.cloud/ipfs/bafkreid7c6caatejewonv5s6oatvyj3ddmnueackhh3ntq5q7rajs6tlku
//2 :: Shield :: https://gateway.pinata.cloud/ipfs/bafkreifq6yprdk4chapafkj33udxcli5iwr5ge5nq76ixi2gkqvck3jljy
//3 :: Potion :: https://gateway.pinata.cloud/ipfs/bafkreiegcp2jjni24h7m2bwehiz5amog6hcdg3pzqkisht5trgcirvlqhu

//@note Ensure that each token ID has its metadata uploaded to IPFS

/// @title RewardNFT
/// @notice ERC1155-based NFT contract that allows minting of reward NFTs by an authorized LootBox contract.
contract RewardNFT is ERC1155URIStorage, Ownable {
    /// @notice Thrown when caller is not the LootBox contract
    error NotLootBox();

    /// @notice Address of the authorized LootBox contract
    address public lootBoxContract;

    /// @notice Modifier to restrict functions to the LootBox contract
    modifier onlyLootBox() {
        if (msg.sender != lootBoxContract) revert NotLootBox();
        _;
    }

    /// @notice Initializes the ERC1155 base contract with empty URI
    constructor() ERC1155("") Ownable(msg.sender) {}

    /// @dev Sets the address of the LootBox contract.
    /// @notice Can only be called by the contract owner.
    /// @param _lootBoxContract The address of the LootBox contract.
    function setLootBoxContract(address _lootBoxContract) external onlyOwner {
        lootBoxContract = _lootBoxContract;
    }

    /// @dev Mints a specific amount of a token to a recipient.
    /// @notice Can only be called by the LootBox contract.
    /// @param to The address receiving the token.
    /// @param id The token ID to mint.
    /// @param amount The amount of tokens to mint.
    /// @param data Additional data with no specified format.
    function mintReward(address to, uint256 id, uint256 amount, bytes memory data) external onlyLootBox {
        _mint(to, id, amount, data);
    }

    /// @dev Sets the URI for a specific token ID.
    /// @notice Can only be called by the contract owner.
    /// @param id The token ID.
    /// @param newuri The new URI for the token.
    function setTokenURI(uint256 id, string memory newuri) external onlyOwner {
        _setURI(id, newuri);
    }

    /// @dev Returns the URI for a specific token ID.
    /// @param id The token ID.
    /// @return The URI string.
    function uri(uint256 id) public view override returns (string memory) {
        return super.uri(id);
    }
}
