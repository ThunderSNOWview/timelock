# TimeLock Inheritance - Deployment Guide

This guide provides step-by-step instructions for deploying the TimeLock Inheritance platform to production.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Smart Contract Deployment](#smart-contract-deployment)
- [Frontend Deployment](#frontend-deployment)
- [Environment Configuration](#environment-configuration)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

- Node.js 18+ and npm
- Git
- Hardhat
- MetaMask or hardware wallet with deployment funds

### Required Accounts & Keys

1. **Ethereum Wallet**
   - Private key with Sepolia ETH for gas fees
   - Recommended: Use hardware wallet for mainnet

2. **Infura Account** (or alternative RPC provider)
   - API key for Ethereum node access
   - Sign up at https://infura.io

3. **WalletConnect Project**
   - Project ID for wallet connections
   - Sign up at https://cloud.walletconnect.com

4. **Etherscan API Key** (optional, for verification)
   - Sign up at https://etherscan.io/apis

### Funding Requirements

**Sepolia Testnet:**
- ~0.05 ETH for contract deployment
- Get testnet ETH from faucets:
  - https://sepoliafaucet.com
  - https://www.infura.io/faucet/sepolia

**Ethereum Mainnet:**
- ~0.5 ETH for deployment (varies with gas prices)
- Additional ETH for testing transactions

---

## Smart Contract Deployment

### Step 1: Clone and Setup

```bash
# Clone repository
git clone https://github.com/yourusername/timelock-inheritance.git
cd timelock-inheritance

# Install dependencies
npm install
```

### Step 2: Configure Environment

Create `.env` in the root directory:

```env
# Wallet Configuration
PRIVATE_KEY=your_private_key_here

# RPC Provider
INFURA_API_KEY=your_infura_api_key

# Optional: For contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key
```

**Security Notes:**
- Never commit `.env` to version control
- Use hardware wallet for mainnet deployments
- Consider using environment-specific keys

### Step 3: Compile Contracts

```bash
npx hardhat compile
```

Expected output:
```
Compiled 1 Solidity file successfully
```

### Step 4: Deploy to Sepolia

```bash
npx hardhat run scripts/deployTimeLockInheritance.js --network sepolia
```

Expected output:
```
Deploying TimeLockInheritance...
TimeLockInheritance deployed to: 0x...
Deployment saved to deployment-timelock.json
```

**Save the contract address** - you'll need it for frontend configuration.

### Step 5: Verify Contract (Optional but Recommended)

```bash
npx hardhat verify --network sepolia YOUR_CONTRACT_ADDRESS
```

This makes your contract source code public on Etherscan, improving transparency and trust.

### Step 6: Test Deployment

Create a test script `test-deployment.js`:

```javascript
const { ethers } = require("hardhat");

async function main() {
  const contractAddress = "YOUR_DEPLOYED_ADDRESS";
  const TimeLock = await ethers.getContractAt("TimeLockInheritance", contractAddress);
  
  // Test read function
  const counter = await TimeLock.vaultCounter();
  console.log("Vault counter:", counter.toString());
  
  console.log("✅ Contract is working!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

Run test:
```bash
npx hardhat run test-deployment.js --network sepolia
```

---

## Frontend Deployment

### Step 1: Configure Environment

Create `frontend/.env`:

```env
# Contract Address (from deployment)
VITE_TIMELOCK_CONTRACT_ADDRESS=0xYourContractAddress

# WalletConnect Project ID
VITE_WALLETCONNECT_PROJECT_ID=your_project_id

# Optional: Custom RPC endpoints
VITE_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
```

### Step 2: Update Contract ABI

Copy the ABI from compilation artifacts:

```bash
cp artifacts/contracts/TimeLockInheritance.sol/TimeLockInheritance.json \
   frontend/src/abi/TimeLockInheritanceABI.json
```

### Step 3: Build Frontend

```bash
cd frontend
npm install
npm run build
```

This creates a `dist/` folder with optimized production files.

### Step 4: Deploy to Vercel

#### Option A: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

#### Option B: Vercel Dashboard

1. Push code to GitHub
2. Go to https://vercel.com/new
3. Import your repository
4. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

5. Add environment variables:
   ```
   VITE_TIMELOCK_CONTRACT_ADDRESS=0x...
   VITE_WALLETCONNECT_PROJECT_ID=...
   ```

6. Click "Deploy"

### Step 5: Configure Custom Domain (Optional)

In Vercel dashboard:
1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Wait for SSL certificate provisioning

---

## Environment Configuration

### Development Environment

```env
# .env (root)
PRIVATE_KEY=test_private_key
INFURA_API_KEY=dev_infura_key

# frontend/.env
VITE_TIMELOCK_CONTRACT_ADDRESS=0xDevContractAddress
VITE_WALLETCONNECT_PROJECT_ID=dev_project_id
```

### Staging Environment

```env
# .env (root)
PRIVATE_KEY=staging_private_key
INFURA_API_KEY=staging_infura_key

# frontend/.env
VITE_TIMELOCK_CONTRACT_ADDRESS=0xStagingContractAddress
VITE_WALLETCONNECT_PROJECT_ID=staging_project_id
```

### Production Environment

```env
# .env (root)
PRIVATE_KEY=production_private_key_from_hardware_wallet
INFURA_API_KEY=production_infura_key
ETHERSCAN_API_KEY=production_etherscan_key

# frontend/.env (Vercel environment variables)
VITE_TIMELOCK_CONTRACT_ADDRESS=0xProductionContractAddress
VITE_WALLETCONNECT_PROJECT_ID=production_project_id
```

---

## Verification

### Contract Verification Checklist

- [ ] Contract deployed successfully
- [ ] Contract verified on Etherscan
- [ ] Test vault creation works
- [ ] Test beneficiary addition works
- [ ] Test unlock functionality works
- [ ] Test claim functionality works
- [ ] Events are emitted correctly
- [ ] Access control is working

### Frontend Verification Checklist

- [ ] Application loads without errors
- [ ] Wallet connection works
- [ ] Network switching works (if multi-chain)
- [ ] Contract interactions succeed
- [ ] FHE encryption initializes
- [ ] All pages render correctly
- [ ] Mobile responsive design works
- [ ] Toast notifications appear
- [ ] Error handling works

### Security Verification Checklist

- [ ] Private keys not exposed
- [ ] Environment variables secured
- [ ] HTTPS enabled
- [ ] CORS configured correctly
- [ ] Rate limiting in place (if applicable)
- [ ] Input validation working
- [ ] Access control enforced

---

## Troubleshooting

### Common Deployment Issues

#### Issue: "Insufficient funds for gas"

**Solution:**
```bash
# Check wallet balance
npx hardhat run scripts/checkBalance.js --network sepolia

# Get testnet ETH from faucet
# https://sepoliafaucet.com
```

#### Issue: "Contract verification failed"

**Solution:**
```bash
# Ensure compiler version matches
# Check hardhat.config.js solidity version

# Try manual verification with constructor args
npx hardhat verify --network sepolia CONTRACT_ADDRESS \
  --constructor-args arguments.js
```

#### Issue: "FHE SDK initialization failed"

**Solution:**
- Check browser compatibility (Chrome/Brave recommended)
- Verify CORS headers in `vite.config.ts`
- Clear browser cache
- Check console for WASM errors

#### Issue: "Transaction reverted"

**Solution:**
```bash
# Enable detailed error messages in hardhat.config.js
networks: {
  sepolia: {
    // ...
    gasPrice: "auto",
    gas: "auto"
  }
}

# Check contract state before transaction
# Verify access control requirements
# Ensure sufficient ETH in vault for claims
```

#### Issue: "Vercel build failed"

**Solution:**
```bash
# Test build locally first
cd frontend
npm run build

# Check for:
# - Missing environment variables
# - TypeScript errors
# - Import path issues
# - Node version compatibility
```

### Getting Help

- **GitHub Issues:** https://github.com/yourusername/timelock-inheritance/issues
- **Zama Discord:** https://discord.gg/zama
- **Ethereum Stack Exchange:** https://ethereum.stackexchange.com

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Code reviewed
- [ ] Security audit completed (for mainnet)
- [ ] Documentation updated
- [ ] Environment variables configured
- [ ] Backup deployment keys securely

### Deployment

- [ ] Smart contract deployed
- [ ] Contract verified on Etherscan
- [ ] Frontend deployed
- [ ] DNS configured (if custom domain)
- [ ] SSL certificate active

### Post-Deployment

- [ ] Smoke tests completed
- [ ] Monitoring setup
- [ ] Team notified
- [ ] Documentation updated with addresses
- [ ] Announcement prepared (if public)

---

## Monitoring & Maintenance

### Contract Monitoring

Monitor contract events using Etherscan or custom indexer:

```javascript
// Example: Listen to VaultCreated events
contract.on("VaultCreated", (vaultId, creator, totalAmount) => {
  console.log(`New vault ${vaultId} created by ${creator}`);
});
```

### Frontend Monitoring

Use Vercel Analytics or custom solution:
- Page load times
- Error rates
- User interactions
- Transaction success rates

### Maintenance Tasks

**Weekly:**
- Check contract balance
- Monitor transaction success rates
- Review error logs

**Monthly:**
- Update dependencies
- Security patches
- Performance optimization

**Quarterly:**
- Security audit
- User feedback review
- Feature planning

---

## Rollback Procedure

If critical issues are discovered:

1. **Frontend Rollback:**
   ```bash
   # Vercel: Revert to previous deployment
   vercel rollback
   ```

2. **Contract Issues:**
   - Cannot rollback deployed contracts
   - Deploy new version if needed
   - Update frontend to use new contract
   - Migrate data if necessary

3. **Communication:**
   - Notify users immediately
   - Post status updates
   - Provide timeline for resolution

---

## Production Deployment to Mainnet

**⚠️ WARNING:** Mainnet deployment involves real funds. Proceed with extreme caution.

### Additional Mainnet Steps

1. **Security Audit**
   - Hire professional auditors
   - Review all findings
   - Implement fixes

2. **Testnet Testing**
   - Run on testnet for 2+ weeks
   - Test all edge cases
   - Simulate attack scenarios

3. **Gradual Rollout**
   - Deploy with low limits initially
   - Monitor closely
   - Gradually increase limits

4. **Insurance**
   - Consider smart contract insurance
   - Set up emergency response fund

5. **Legal Review**
   - Consult legal counsel
   - Ensure compliance
   - Prepare terms of service

---

**Last Updated:** 2025-10-30
