// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title LOOT Protocol Token
/// @notice ERC20-compliant token with capped supply and burn functionality.
/// @dev Uses OpenZeppelin's ERC20 and Ownable for standard behavior.
contract LOOTToken is ERC20, Ownable {
    /// @notice Maximum number of tokens that can ever be minted.
    uint256 public constant MAX_SUPPLY = 1_000_000 ether;

    /// @notice Tracks the total number of tokens minted.
    uint256 public totalMinted;

    /// @notice Reverts if a mint would exceed the MAX_SUPPLY.
    error ExceedsMaxSupply();

    /// @notice Reverts if burnFrom is called with allowance lower than amount.
    error BurnExceedsAllowance();

    /// @notice Initializes the LOOT token with an initial supply.
    /// @dev Mints 500,000 tokens to the deployer and sets the totalMinted.
    constructor() ERC20("Loot Protocol Token", "LOOT") Ownable(msg.sender) {
        uint256 initialMint = 500_000 ether;
        totalMinted = initialMint;
        _mint(msg.sender, initialMint);
    }

    /// @notice Mints new tokens to a given address.
    /// @dev Only callable by the contract owner.
    /// @param to The address that will receive the newly minted tokens.
    /// @param amount The number of tokens to mint.
    /// @custom:throws ExceedsMaxSupply if minting would exceed MAX_SUPPLY.
    function mint(address to, uint256 amount) external onlyOwner {
        if (totalMinted + amount > MAX_SUPPLY) revert ExceedsMaxSupply();

        totalMinted += amount;
        _mint(to, amount);
    }

    /// @notice Burns tokens from the caller’s balance.
    /// @dev Useful for deflationary mechanics or redemption-based use cases.
    /// @param amount The number of tokens to burn.
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /// @notice Burns tokens from another account using allowance.
    /// @dev Caller must have sufficient allowance to burn on behalf of account.
    /// @param account The address whose tokens will be burned.
    /// @param amount The number of tokens to burn.
    /// @custom:throws BurnExceedsAllowance if allowance is too low.
    function burnFrom(address account, uint256 amount) external {
        uint256 currentAllowance = allowance(account, msg.sender);

        if (currentAllowance < amount) revert BurnExceedsAllowance();

        _approve(account, msg.sender, currentAllowance - amount);
        _burn(account, amount);
    }
}
