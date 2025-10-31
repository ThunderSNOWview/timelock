# TimeLock Inheritance

**Secure Your Legacy with Private, Encrypted Inheritance Vaults**

TimeLock Inheritance is a blockchain-based platform that lets you create secure inheritance vaults for your loved ones. Using advanced encryption technology from Zama, all beneficiary information stays completely private - no one can see who will receive funds or how much they'll get until the vault unlocks.

The platform works in two simple steps: first, you create a vault by setting the total amount and unlock schedule. Then, you add your beneficiaries one at a time, with each person's address and share amount encrypted before being stored on the blockchain. This approach keeps gas costs low while maintaining maximum privacy and security for your inheritance plans.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Smart Contract](#smart-contract)
- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Additional Documentation](#additional-documentation)
- [License](#license)

---

## Overview

TimeLock Inheritance enables users to:
- **Create Vaults**: Set up inheritance vaults with total amount, unlock mode, and beneficiary slots
- **Add Beneficiaries**: Privately add beneficiaries with encrypted addresses and amounts
- **Flexible Unlocks**: Choose between staged releases (25% yearly over 4 years) or one-time unlock
- **Emergency Override**: Vault creators can unlock all stages immediately if needed
- **Claim Inheritance**: Beneficiaries claim their share as each stage unlocks

Unlike traditional inheritance platforms, TimeLock ensures complete privacy through FHE encryption, making it ideal for:
- Private wealth transfer planning
- Estate management
- Family inheritance distribution
- Secure legacy planning

---

## Key Features

### 🔐 Privacy-First Design
- Beneficiary addresses encrypted using FHE
- Amounts encrypted with Zama's FHE technology
- No public visibility of beneficiaries until unlock
- Complete on-chain privacy

### ⏰ Flexible Unlock Modes
- **Staged Release**: 25% per year over 4 years (4 stages)
- **One-Time Unlock**: 100% on specified date
- Emergency override capability for vault creators
- Transparent unlock schedule

### 💰 Gas-Optimized Architecture
- Two-step vault creation process
- Add beneficiaries incrementally
- Lower transaction costs per operation
- Efficient FHE operations

### 📱 Modern User Experience
- Responsive design for all devices
- Real-time encryption progress indicators
- Intuitive vault management dashboard
- Seamless wallet integration via RainbowKit

### ⚡ Decentralized & Trustless
- Smart contracts on Ethereum Sepolia
- No central authority
- Transparent and verifiable
- Immutable inheritance records

---

## Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **React Router** - Navigation
- **React Hot Toast** - Notifications

### Blockchain
- **Solidity 0.8.24** - Smart contract language
- **Hardhat** - Development environment
- **Zama fhEVM** - FHE-enabled EVM
- **Ethereum Sepolia** - Test network

### Web3 Integration
- **wagmi** - React hooks for Ethereum
- **viem** - TypeScript Ethereum library
- **RainbowKit** - Wallet connection UI
- **ethers.js** - Ethereum interactions

### Encryption
- **Zama FHE SDK** - Fully Homomorphic Encryption
- **fhEVM** - FHE operations on-chain
- **euint128** - Encrypted 128-bit integers

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MetaMask or compatible Web3 wallet
- Sepolia ETH for gas fees
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/timelock-inheritance.git
cd timelock-inheritance
```

2. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Configuration

1. **Smart Contract Setup**

Create `.env` in the root directory:
```env
PRIVATE_KEY=your_wallet_private_key
INFURA_API_KEY=your_infura_api_key
```

2. **Frontend Setup**

Create `frontend/.env`:
```env
VITE_TIMELOCK_CONTRACT_ADDRESS=0xYourDeployedContractAddress
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

### Running the Application

1. **Deploy Smart Contract** (if not already deployed)
```bash
npx hardhat run scripts/deployTimeLockInheritance.js --network sepolia
```

2. **Start Frontend Development Server**
```bash
cd frontend
npm run dev
```

3. **Access the application**
Open http://localhost:5173 in your browser

---

## Smart Contract

### TimeLockInheritance.sol

The core smart contract manages all encrypted inheritance operations.

**Key Functions:**

```solidity
// Create a new vault
function createVault(
    uint256 totalAmount,
    uint256 firstUnlockTime,
    uint8 beneficiaryCount,
    UnlockMode unlockMode
) external payable returns (uint256)

// Add a beneficiary to a vault
function addBeneficiary(
    uint256 vaultId,
    uint256 beneficiaryIndex,
    externalEuint128 encryptedAddress,
    externalEuint128 encryptedAmount,
    bytes calldata addressProof,
    bytes calldata amountProof
) external

// Emergency unlock all stages
function emergencyUnlock(uint256 vaultId) external

// Unlock next stage (staged mode only)
function unlockStage(uint256 vaultId) external

// Claim inheritance
function claimInheritance(uint256 vaultId) external

// Get vault details
function getVault(uint256 vaultId) external view returns (Vault memory)
```

**Deployed Contract:**
- Network: Ethereum Sepolia
- Address: `0x4e0774D47a91F2544d8e48c63e281E2B9a6F0A8a`
- [View on Etherscan](https://sepolia.etherscan.io/address/0x4e0774D47a91F2544d8e48c63e281E2B9a6F0A8a)

---

## How It Works

### 1. Creating a Vault

```typescript
// Creator sets up a vault structure
const vaultId = await createVault(
  "1.0",           // Total amount in ETH
  firstUnlockDate, // Unix timestamp
  2,               // Number of beneficiaries
  "STAGED"         // Unlock mode (STAGED or ONE_TIME)
);
```

### 2. Adding Beneficiaries

```typescript
// Add beneficiaries one-by-one with encryption
await addBeneficiary(
  vaultId,
  0, // Beneficiary index
  { address: "0x...", amount: "0.5" },
  (step) => console.log(step) // Progress callback
);
```

**Encryption Process:**
1. Initialize FHE SDK
2. Encrypt beneficiary address using `euint128`
3. Encrypt amount using `euint128`
4. Generate input proofs for both
5. Submit to blockchain
6. Repeat for each beneficiary

### 3. Unlocking Stages

**Staged Mode:**
```typescript
// Unlock next stage when time arrives
await unlockStage(vaultId);
// 25% becomes available per stage
```

**One-Time Mode:**
```typescript
// All funds unlock at once on specified date
// No manual unlock needed
```

**Emergency Override:**
```typescript
// Creator can unlock all stages immediately
await emergencyUnlock(vaultId);
```

### 4. Claiming Inheritance

```typescript
// Beneficiary claims their share
await claimInheritance(vaultId);
```

---

## Project Structure

```
timelock-inheritance/
├── contracts/
│   └── TimeLockInheritance.sol       # Main smart contract
├── scripts/
│   └── deployTimeLockInheritance.js  # Deployment script
├── frontend/
│   ├── src/
│   │   ├── abi/
│   │   │   └── TimeLockInheritanceABI.json
│   │   ├── components/
│   │   │   ├── ChainGuard.tsx        # Network validation
│   │   │   └── CompactConnectButton.tsx
│   │   ├── config/
│   │   │   └── wagmi.ts              # Web3 configuration
│   │   ├── hooks/
│   │   │   └── useTimeLock.ts        # Main React hook
│   │   ├── pages/
│   │   │   ├── TimeLockLandingPage.tsx
│   │   │   ├── TimeLockCreatePage.tsx
│   │   │   ├── TimeLockMyVaultsPage.tsx
│   │   │   ├── TimeLockVaultDetailPage.tsx
│   │   │   └── TimeLockCheckInheritancePage.tsx
│   │   ├── utils/
│   │   │   └── fhe.ts                # FHE utilities
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── hardhat.config.js
├── package.json
├── README.md
├── ARCHITECTURE.md
├── SECURITY.md
└── DEPLOYMENT.md
```

---

## Deployment

### Smart Contract Deployment

```bash
# Deploy to Sepolia
npx hardhat run scripts/deployTimeLockInheritance.js --network sepolia

# Verify contract
npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS
```

### Frontend Deployment

**Vercel (Recommended):**

1. Push code to GitHub
2. Import project in Vercel
3. Set root directory to `frontend`
4. Add environment variables
5. Deploy

**Manual Build:**

```bash
cd frontend
npm run build
# Deploy dist/ folder to your hosting provider
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

---

## Additional Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and design decisions
- **[SECURITY.md](./SECURITY.md)** - Security model and FHE encryption details
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Comprehensive deployment guide

---

## License

This project is licensed under the MIT License.

---

## Acknowledgments

- [Zama](https://zama.ai/) - For FHE technology and fhEVM
- [Ethereum](https://ethereum.org/) - For the blockchain infrastructure
- [Hardhat](https://hardhat.org/) - For development tools
- [RainbowKit](https://www.rainbowkit.com/) - For wallet connection UI

---

**Built with ❤️ using Zama FHE • Powered by Ethereum Sepolia**
