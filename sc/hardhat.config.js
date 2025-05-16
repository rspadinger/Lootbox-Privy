require("@nomicfoundation/hardhat-toolbox")
require("dotenv").config()

const { ALCHEMY_API_URL, PRIVATE_KEY, ETHERSCAN_API_KEY } = process.env

module.exports = {
    solidity: {
        version: "0.8.28",
        settings: {
            optimizer: { enabled: true, runs: 200 },
        },
    },
    defaultNetwork: "hardhat",
    networks: {
        sepolia: {
            url: ALCHEMY_API_URL,
            accounts: [`0x${PRIVATE_KEY}`],
        },
    },
    //npx hardhat verify --network sepolia ADDR "constructor argument"
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },
}
