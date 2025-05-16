const { CONTRACT_ADDRESS, CONTRACT_ADDRESS_LOCAL } = process.env

let provider, contract, txn

async function main() {
    //provider = ethers.provider
    const currentNetwork = await ethers.provider.getNetwork()

    if (currentNetwork.chainId.toString().includes(1337)) {
        //we are on a local network
        contract = await ethers.getContractAt("LootBox", CONTRACT_ADDRESS_LOCAL)
    } else {
        //we are on a remote network
        contract = await ethers.getContractAt("LootBox", CONTRACT_ADDRESS)
    }

    const [signer1, signer2] = await ethers.getSigners()

    console.log("Pack Count: ", await contract.getPackCount())

    // txn = await contract.setSubscriptionId(2)
    // await txn.wait()
}

main()
