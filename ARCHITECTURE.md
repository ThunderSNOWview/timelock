# TimeLock Inheritance - Architecture

This document describes the system architecture, design decisions, and technical implementation of the TimeLock Inheritance platform.

---

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Diagram](#architecture-diagram)
- [Smart Contract Architecture](#smart-contract-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Data Flow](#data-flow)
- [Design Decisions](#design-decisions)
- [Gas Optimization](#gas-optimization)

---

## System Overview

TimeLock Inheritance is a decentralized application (DApp) built on Ethereum that enables private inheritance vault creation using Fully Homomorphic Encryption (FHE). The system consists of three main layers:

1. **Smart Contract Layer** - Solidity contracts on Ethereum Sepolia with Zama fhEVM
2. **Frontend Layer** - React TypeScript application with Web3 integration
3. **Encryption Layer** - Zama FHE SDK for client-side encryption

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         User Browser                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              React Frontend (Vite + TS)               │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │   Pages     │  │    Hooks     │  │  Components │  │  │
│  │  │  (UI/UX)    │  │ (Business    │  │  (Reusable) │  │  │
│  │  │             │  │   Logic)     │  │             │  │  │
│  │  └─────────────┘  └──────────────┘  └─────────────┘  │  │
│  │         │                 │                 │         │  │
│  │         └─────────────────┼─────────────────┘         │  │
│  │                           │                           │  │
│  │  ┌────────────────────────▼────────────────────────┐  │  │
│  │  │         Web3 Integration Layer                  │  │  │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │  │  │
│  │  │  │  wagmi   │  │   viem   │  │ RainbowKit   │  │  │  │
│  │  │  └──────────┘  └──────────┘  └──────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                           │                           │  │
│  │  ┌────────────────────────▼────────────────────────┐  │  │
│  │  │         Zama FHE SDK (Encryption)               │  │  │
│  │  │  • Client-side encryption                       │  │  │
│  │  │  • euint128 operations                          │  │  │
│  │  │  • Input proof generation                       │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ JSON-RPC / WebSocket
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  Ethereum Sepolia Network                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         TimeLockInheritance.sol Contract              │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  State Variables:                               │  │  │
│  │  │  • vaults mapping                               │  │  │
│  │  │  • beneficiaries mapping                        │  │  │
│  │  │  • vaultCounter                                 │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Core Functions:                                │  │  │
│  │  │  • createVault()                                │  │  │
│  │  │  • addBeneficiary()                             │  │  │
│  │  │  • unlockStage()                                │  │  │
│  │  │  • emergencyUnlock()                            │  │  │
│  │  │  • claimInheritance()                           │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Zama fhEVM Extensions                    │  │
│  │  • FHE.asEuint128() - Type conversion                │  │
│  │  • FHE.decrypt() - Decryption operations             │  │
│  │  • FHE.allow() - Access control                      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Smart Contract Architecture

### Contract Structure

```solidity
contract TimeLockInheritance {
    // Enums
    enum UnlockMode { ONE_TIME, STAGED }
    
    // Structs
    struct Vault {
        address creator;
        uint256 totalAmount;
        uint256 firstUnlockTime;
        uint8 beneficiaryCount;
        uint8 stagesUnlocked;
        UnlockMode unlockMode;
        bool emergencyUnlocked;
    }
    
    struct Beneficiary {
        euint128 encryptedAddress;
        euint128 encryptedAmount;
        bool claimed;
    }
    
    // State
    mapping(uint256 => Vault) public vaults;
    mapping(uint256 => mapping(uint256 => Beneficiary)) public beneficiaries;
    uint256 public vaultCounter;
}
```

### Key Design Patterns

1. **Two-Step Creation Pattern**
   - Vault metadata created first (low gas)
   - Beneficiaries added incrementally (distributed gas cost)
   - Prevents transaction failures from large encrypted data

2. **Encrypted Storage Pattern**
   - Addresses stored as `euint128` (hashed to 128 bits)
   - Amounts stored as `euint128`
   - Only decryptable by authorized parties

3. **Access Control Pattern**
   - Creator-only functions: `addBeneficiary`, `emergencyUnlock`
   - Beneficiary-only functions: `claimInheritance`
   - Time-based unlocking for staged releases

4. **Event-Driven Pattern**
   - Events emitted for all state changes
   - Frontend listens to events for real-time updates

---

## Frontend Architecture

### Component Hierarchy

```
App.tsx
├── RainbowKitProvider
│   ├── ChainGuard (Network validation)
│   └── Router
│       ├── TimeLockLandingPage
│       ├── TimeLockCreatePage
│       ├── TimeLockMyVaultsPage
│       ├── TimeLockVaultDetailPage
│       └── TimeLockCheckInheritancePage
```

### State Management

**Local State (React useState)**
- UI state (loading, modals, forms)
- Temporary data (input values, progress)

**Web3 State (wagmi hooks)**
- Wallet connection status
- Account address
- Network information
- Transaction states

**Contract State (useTimeLock hook)**
- Vault data
- Beneficiary information
- Transaction methods

### Custom Hooks

#### `useTimeLock.ts`

Main hook for contract interactions:

```typescript
export function useTimeLock() {
  // Contract reads
  const getVault = async (vaultId: bigint) => {...}
  
  // Contract writes
  const createVault = async (...) => {...}
  const addBeneficiary = async (...) => {...}
  const emergencyUnlock = async (...) => {...}
  const claimInheritance = async (...) => {...}
  
  return {
    getVault,
    createVault,
    addBeneficiary,
    emergencyUnlock,
    claimInheritance,
  };
}
```

### Utility Modules

#### `fhe.ts`

FHE encryption utilities:

```typescript
// Initialize FHE SDK
export async function initializeFHE() {...}

// Encrypt address
export async function encryptAddress(
  fheInstance: any,
  address: string,
  contractAddress: string
) {...}

// Encrypt amount
export async function encryptAmount(
  fheInstance: any,
  amount: bigint,
  contractAddress: string,
  userAddress: string
) {...}
```

---

## Data Flow

### Vault Creation Flow

```
1. User fills form (amount, date, mode, beneficiary count)
   ↓
2. Frontend validates input
   ↓
3. Call createVault() on contract
   ↓
4. Contract creates vault struct
   ↓
5. Contract emits VaultCreated event
   ↓
6. Frontend navigates to vault detail page
```

### Beneficiary Addition Flow

```
1. User enters beneficiary address and amount
   ↓
2. Initialize FHE SDK
   ↓
3. Encrypt address (euint128)
   ↓
4. Encrypt amount (euint128)
   ↓
5. Generate input proofs
   ↓
6. Call addBeneficiary() with encrypted data
   ↓
7. Contract stores encrypted beneficiary
   ↓
8. Contract emits BeneficiaryAdded event
   ↓
9. Frontend updates UI
```

### Claim Inheritance Flow

```
1. Beneficiary connects wallet
   ↓
2. Check if vault is unlocked
   ↓
3. Contract decrypts beneficiary address
   ↓
4. Verify caller matches decrypted address
   ↓
5. Contract decrypts amount
   ↓
6. Transfer funds to beneficiary
   ↓
7. Mark beneficiary as claimed
   ↓
8. Contract emits InheritanceClaimed event
```

---

## Design Decisions

### 1. Two-Step Vault Creation

**Problem:** Adding all beneficiaries at vault creation caused transaction failures due to high gas costs and large encrypted data payloads.

**Solution:** Split into two steps:
- Step 1: Create vault metadata (quick, low gas)
- Step 2: Add beneficiaries one-by-one (distributed gas cost)

**Benefits:**
- Lower gas per transaction
- Better UX with progress tracking
- Reduced transaction failure rate
- Flexibility to add beneficiaries over time

### 2. euint128 for Addresses

**Problem:** Ethereum addresses are 160 bits, but FHE operations are more efficient with power-of-2 sizes.

**Solution:** Hash addresses to 128 bits before encryption.

**Trade-offs:**
- Theoretical collision risk (negligible: 2^128 space)
- More efficient FHE operations
- Lower gas costs

### 3. Client-Side Encryption

**Problem:** Encrypting on-chain would expose plaintext temporarily.

**Solution:** Encrypt on client before sending to blockchain.

**Benefits:**
- Data never exposed in plaintext on-chain
- Better privacy guarantees
- Leverages Zama FHE SDK capabilities

### 4. Flexible Unlock Modes

**Problem:** Different users have different inheritance needs.

**Solution:** Support both staged and one-time unlock modes.

**Implementation:**
- `UnlockMode` enum in contract
- Different unlock logic based on mode
- Same claiming interface for both modes

---

## Gas Optimization

### Strategies Implemented

1. **Incremental Beneficiary Addition**
   - Distribute gas cost across multiple transactions
   - Prevent transaction failures from gas limits

2. **Efficient Storage**
   - Use `uint8` for counters (beneficiaryCount, stagesUnlocked)
   - Pack struct variables efficiently
   - Minimize storage writes

3. **Event Emission**
   - Emit events instead of storing redundant data
   - Frontend can reconstruct state from events

4. **View Functions**
   - Read-only functions don't cost gas
   - Batch reads where possible

### Gas Cost Estimates

| Operation | Estimated Gas | ETH Cost (50 gwei) |
|-----------|---------------|-------------------|
| Create Vault | ~150,000 | ~0.0075 ETH |
| Add Beneficiary | ~200,000 | ~0.010 ETH |
| Unlock Stage | ~80,000 | ~0.004 ETH |
| Emergency Unlock | ~100,000 | ~0.005 ETH |
| Claim Inheritance | ~150,000 | ~0.0075 ETH |

---

## Security Considerations

See [SECURITY.md](./SECURITY.md) for detailed security analysis.

**Key Security Features:**
- FHE encryption for all sensitive data
- Access control on all state-changing functions
- Time-based unlocking prevents premature claims
- Emergency override for creator only
- No centralized control or admin keys

---

## Future Improvements

1. **Multi-Signature Support**
   - Require multiple signatures for emergency unlock
   - Add co-creators to vaults

2. **Partial Claims**
   - Allow beneficiaries to claim available stages incrementally
   - Better liquidity for beneficiaries

3. **Vault Modification**
   - Allow creators to modify beneficiaries before unlock
   - Add/remove beneficiaries with proper access control

4. **Cross-Chain Support**
   - Deploy on multiple EVM chains
   - Bridge assets between chains

5. **Advanced Unlock Schedules**
   - Custom unlock percentages
   - Non-linear unlock curves
   - Condition-based unlocking

---

**Last Updated:** 2025-10-30
