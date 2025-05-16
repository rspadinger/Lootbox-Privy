# 🎁 Lootbox dApp

The **Lootbox dApp** is a Web3-enabled application that allows users to purchase loot packs and receive random rewards including XP, LOOT tokens, and NFTs. The app is built with **Privy** for seamless Web2+Web3 authentication, a **Supabase** backend for tracking user activity, and a powerful **Solidity smart contract** for loot mechanics and reward distribution.

---

## 🚀 Features

### 🔐 Privy Authentication

-   **Email and Wallet login** support.
-   **Smart Wallet** creation for non-crypto users.
-   Ensures easy onboarding for Web2 users and flexibility for crypto-savvy ones.

### 🧾 Supabase Integration

-   Tracks **lootbox purchases** per user.
-   Links **Privy user ID and wallet address** for all interactions.
-   Supports a user dashboard showing **purchase history**.

### 📦 Lootbox Smart Contract

-   Users can **purchase loot packs** using **ETH, USDC, or LOOT tokens**.
-   Packs are defined with a reward pool including **XP, LOOT, and NFTs**.
-   Chainlink price feeds are used to determine accurate ETH/LOOT pricing.
-   XP and NFT rewards are minted via external module contracts.
-   Admin features include adding/updating/removing pack types and setting up randomness via Chainlink VRF.

---

## ⚙️ Smart Contract Capabilities

The `ILootBox` interface supports the following key functionalities:

-   `purchasePack(packName, amount, paymentToken)` — Buy one or more packs with a selected payment token.
-   `addOrUpdatePackType(...)` — Admin function to define or modify loot pack types.
-   `deletePackType(packName)` — Remove a specific pack from the store.
-   `setXPModule(...)`, `setRewardNFT(...)` — Configure external contracts for reward handling.
-   `getAllPacks()`, `getPackCount()` — Query available packs and details.
-   **Chainlink integrations**:

    -   Price feeds for ETH and LOOT.
    -   Subscription + key hash setup for VRF randomness.

Rewards are distributed based on weighted randomness, and the entire contract supports transparent, upgradeable pack configurations.

---

## 🛠️ Getting Started

### 1. Clone the Repository

### 2. Install Dependencies

Install for both the frontend (`ui`) and smart contracts (`sc`) folders:

```bash
cd ui
npm install

cd ../sc
npm install
```

### 3. Set Environment Variables

Update the `.env.example` files in both folders and rename them to `.env`.

You’ll need:

-   Your **Privy app ID**
-   Your **Supabase URL and anon key**
-   Any RPC URLs or chain-specific configs

### 4. Deploy Smart Contracts

Use Hardhat/Foundry to deploy the contracts in the `sc` folder:

```bash
cd sc
npx hardhat run scripts/deployVerify.js --network <your_network>
```

Ensure the contract addresses are updated in your frontend config.

### 5. Run the Frontend

```bash
cd ../ui
npm run dev
```

Visit `http://localhost:3000` to access the dApp.

---

## 🔐 Protected Routes

The **Dashboard** route is protected using `usePrivy()`:

-   Only **authenticated users** can access the dashboard.
-   If the user is not logged in, they are **redirected** to the homepage or login screen.
-   From the dashboard, users can **view all past lootbox purchases** tied to their Privy user ID.
