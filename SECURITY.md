# TimeLock Inheritance - Security Documentation

This document details the security model, encryption implementation, and potential vulnerabilities of the TimeLock Inheritance platform.

---

## Table of Contents

- [Security Overview](#security-overview)
- [Fully Homomorphic Encryption (FHE)](#fully-homomorphic-encryption-fhe)
- [Smart Contract Security](#smart-contract-security)
- [Access Control](#access-control)
- [Threat Model](#threat-model)
- [Known Limitations](#known-limitations)
- [Best Practices](#best-practices)
- [Audit Recommendations](#audit-recommendations)

---

## Security Overview

TimeLock Inheritance employs multiple layers of security to protect user funds and privacy:

1. **Encryption Layer** - FHE encryption for sensitive data
2. **Smart Contract Layer** - Access control and validation
3. **Frontend Layer** - Input validation and secure communication
4. **Network Layer** - Ethereum's consensus security

### Security Goals

- **Privacy:** Beneficiary addresses and amounts remain confidential
- **Integrity:** Vault data cannot be tampered with
- **Availability:** Funds are accessible when unlock conditions are met
- **Access Control:** Only authorized parties can perform sensitive operations

---

## Fully Homomorphic Encryption (FHE)

### What is FHE?

Fully Homomorphic Encryption allows computations on encrypted data without decryption. In TimeLock Inheritance:

- Beneficiary addresses are encrypted client-side
- Amounts are encrypted client-side
- Contract stores encrypted data
- Only authorized parties can decrypt

### Zama fhEVM Implementation

**Technology Stack:**
- **Zama fhEVM:** FHE-enabled Ethereum Virtual Machine
- **TFHE-rs:** Rust library for FHE operations
- **euint128:** 128-bit encrypted unsigned integers

**Encryption Process:**

```typescript
// 1. Initialize FHE SDK
const fheInstance = await initializeFHE();

// 2. Prepare data
const addressHash = hashAddressTo128Bits(beneficiaryAddress);
const amountValue = parseEther(amount);

// 3. Create encrypted input
const input = fheInstance.createEncryptedInput(contractAddress, userAddress);
input.add128(addressHash);
const encrypted = await input.encrypt();

// 4. Extract encrypted data and proof
const encryptedData = encrypted.handles[0];
const inputProof = encrypted.inputProof;

// 5. Submit to blockchain
await contract.addBeneficiary(vaultId, index, encryptedData, inputProof);
```

### Encryption Security Properties

**Confidentiality:**
- Encrypted data is indistinguishable from random
- No information leakage about plaintext
- Quantum-resistant (lattice-based cryptography)

**Integrity:**
- Input proofs ensure data hasn't been tampered with
- Zero-knowledge proofs validate encryption correctness
- Contract verifies proofs before accepting data

**Access Control:**
- `FHE.allow()` grants decryption permissions
- Only authorized addresses can decrypt
- Permissions managed on-chain

### Address Hashing

**Why Hash Addresses?**

Ethereum addresses are 160 bits, but FHE operations are optimized for power-of-2 sizes (128, 256, etc.).

**Implementation:**

```solidity
// Hash address to 128 bits
function hashAddressTo128(address addr) internal pure returns (uint128) {
    return uint128(uint256(keccak256(abi.encodePacked(addr))));
}
```

**Security Analysis:**

- **Collision Resistance:** 2^128 space makes collisions astronomically unlikely
- **Preimage Resistance:** Cannot reverse hash to find original address
- **Trade-off:** Slight theoretical collision risk for massive gas savings

**Collision Probability:**

With 1 billion beneficiaries:
- Probability of collision: ~2.7 × 10^-20 (negligible)
- More likely to win lottery 5 times in a row

---

## Smart Contract Security

### Access Control Mechanisms

**Creator-Only Functions:**

```solidity
modifier onlyCreator(uint256 vaultId) {
    require(msg.sender == vaults[vaultId].creator, "Not creator");
    _;
}

function addBeneficiary(...) external onlyCreator(vaultId) {...}
function emergencyUnlock(...) external onlyCreator(vaultId) {...}
```

**Beneficiary-Only Functions:**

```solidity
function claimInheritance(uint256 vaultId) external {
    // Decrypt beneficiary address
    address beneficiaryAddr = decryptAddress(vaultId, beneficiaryIndex);
    require(msg.sender == beneficiaryAddr, "Not beneficiary");
    // ... claim logic
}
```

**Time-Based Access:**

```solidity
function unlockStage(uint256 vaultId) external {
    Vault storage vault = vaults[vaultId];
    uint256 timeSinceFirst = block.timestamp - vault.firstUnlockTime;
    uint256 stagesPassed = timeSinceFirst / 365 days;
    require(stagesPassed > vault.stagesUnlocked, "Stage not ready");
    // ... unlock logic
}
```

### Reentrancy Protection

**Current Implementation:**

Uses checks-effects-interactions pattern:

```solidity
function claimInheritance(uint256 vaultId) external {
    // Checks
    require(!beneficiary.claimed, "Already claimed");
    require(vault.stagesUnlocked > 0, "Not unlocked");
    
    // Effects
    beneficiary.claimed = true;
    
    // Interactions
    payable(msg.sender).transfer(amount);
}
```

**Recommendation:** Add ReentrancyGuard for extra protection:

```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract TimeLockInheritance is ReentrancyGuard {
    function claimInheritance(uint256 vaultId) external nonReentrant {
        // ... claim logic
    }
}
```

### Integer Overflow Protection

Solidity 0.8.x has built-in overflow protection:

```solidity
// Automatically reverts on overflow
uint256 total = vault.totalAmount + newAmount;
```

### Input Validation

All user inputs are validated:

```solidity
function createVault(...) external payable {
    require(totalAmount > 0, "Amount must be positive");
    require(beneficiaryCount > 0, "Need at least one beneficiary");
    require(firstUnlockTime > block.timestamp, "Unlock time in past");
    require(msg.value == totalAmount, "Incorrect ETH sent");
    // ...
}
```

---

## Access Control

### Permission Matrix

| Function | Creator | Beneficiary | Anyone | Time Lock |
|----------|---------|-------------|--------|-----------|
| createVault | ✓ | - | - | - |
| addBeneficiary | ✓ | - | - | - |
| emergencyUnlock | ✓ | - | - | - |
| unlockStage | ✓ | - | - | ✓ |
| claimInheritance | - | ✓ | - | ✓ |
| getVault | - | - | ✓ | - |

### Decryption Permissions

**Granting Access:**

```solidity
// Creator can decrypt all beneficiary data
FHE.allow(beneficiary.encryptedAddress, vaults[vaultId].creator);
FHE.allow(beneficiary.encryptedAmount, vaults[vaultId].creator);
```

**Decryption Process:**

```solidity
// Only authorized addresses can decrypt
function claimInheritance(uint256 vaultId) external {
    // Contract decrypts for verification
    address beneficiaryAddr = FHE.decrypt(beneficiary.encryptedAddress);
    uint128 amount = FHE.decrypt(beneficiary.encryptedAmount);
    
    require(msg.sender == beneficiaryAddr, "Not authorized");
    // ...
}
```

---

## Threat Model

### Threat Actors

1. **Malicious Beneficiary**
   - Goal: Claim more than entitled amount
   - Mitigation: Encrypted amounts, access control

2. **Malicious Creator**
   - Goal: Steal funds after distribution
   - Mitigation: Time locks, immutable beneficiaries

3. **External Attacker**
   - Goal: Steal funds or decrypt data
   - Mitigation: FHE encryption, access control

4. **Network Attacker**
   - Goal: Front-run transactions
   - Mitigation: Encrypted data prevents front-running

### Attack Vectors

#### 1. Reentrancy Attack

**Attack:** Malicious beneficiary re-enters claim function.

**Mitigation:**
- Checks-effects-interactions pattern
- `claimed` flag set before transfer
- Consider adding ReentrancyGuard

**Risk Level:** Low

#### 2. Front-Running

**Attack:** Attacker observes pending transaction and submits own.

**Mitigation:**
- Encrypted data prevents meaningful front-running
- No MEV opportunities (no price oracles, no liquidations)

**Risk Level:** Very Low

#### 3. Timestamp Manipulation

**Attack:** Miner manipulates block.timestamp to unlock early.

**Mitigation:**
- Miners can only manipulate by ~15 seconds
- Unlock periods are in days/years
- Impact negligible

**Risk Level:** Very Low

#### 4. Denial of Service

**Attack:** Attacker prevents legitimate claims.

**Mitigation:**
- No external dependencies
- Simple claim logic
- Emergency unlock available

**Risk Level:** Low

#### 5. Encryption Oracle Attack

**Attack:** Attacker tries to decrypt data through contract calls.

**Mitigation:**
- FHE.allow() controls decryption permissions
- Only authorized addresses can decrypt
- No decryption oracle exposed

**Risk Level:** Very Low

#### 6. Hash Collision Attack

**Attack:** Find two addresses with same 128-bit hash.

**Mitigation:**
- 2^128 search space (computationally infeasible)
- Would require more energy than sun produces

**Risk Level:** Negligible

---

## Known Limitations

### 1. Creator Trust Assumption

**Limitation:** Creator can perform emergency unlock and potentially reclaim funds.

**Rationale:** Necessary for legitimate emergency scenarios (lost keys, legal requirements).

**Mitigation Options:**
- Multi-signature emergency unlock
- Time-delayed emergency unlock
- Governance-based unlock

### 2. Gas Costs

**Limitation:** FHE operations are gas-intensive.

**Impact:**
- Adding beneficiary: ~200,000 gas
- Higher than traditional transfers

**Mitigation:**
- Two-step creation reduces per-transaction cost
- Gas optimization ongoing

### 3. Browser Compatibility

**Limitation:** FHE SDK requires modern browser with WebAssembly support.

**Impact:** Older browsers may not work.

**Mitigation:**
- Clear browser requirements in docs
- Graceful error handling
- Fallback UI for unsupported browsers

### 4. Testnet Only

**Limitation:** Currently deployed on Sepolia testnet only.

**Impact:** Not suitable for real funds.

**Next Steps:**
- Security audit required
- Extensive testing period
- Gradual mainnet rollout

---

## Best Practices

### For Users

**Creating Vaults:**
- Use hardware wallet for large amounts
- Double-check beneficiary addresses
- Test with small amounts first
- Keep backup of vault ID

**Adding Beneficiaries:**
- Verify addresses carefully
- Ensure sufficient gas for transaction
- Wait for transaction confirmation
- Record beneficiary details securely

**Emergency Situations:**
- Use emergency unlock only when necessary
- Understand it's irreversible
- Communicate with beneficiaries

### For Developers

**Smart Contract Development:**
- Follow checks-effects-interactions pattern
- Validate all inputs
- Use latest Solidity version
- Add comprehensive tests

**Frontend Development:**
- Validate inputs client-side
- Handle FHE errors gracefully
- Show clear progress indicators
- Implement proper error messages

**Deployment:**
- Use hardware wallet for mainnet
- Verify contracts on Etherscan
- Test thoroughly on testnet
- Monitor contract after deployment

---

## Audit Recommendations

### Pre-Audit Checklist

- [ ] All tests passing (unit + integration)
- [ ] Code coverage > 90%
- [ ] No compiler warnings
- [ ] Documentation complete
- [ ] Known issues documented

### Audit Focus Areas

1. **FHE Implementation**
   - Correct encryption/decryption
   - Proof verification
   - Access control for decryption

2. **Access Control**
   - Creator permissions
   - Beneficiary verification
   - Time-based unlocking

3. **Fund Management**
   - Correct amount calculations
   - No fund loss scenarios
   - Proper transfer handling

4. **Edge Cases**
   - Zero beneficiaries
   - Duplicate beneficiaries
   - Extreme time values
   - Gas limit scenarios

### Recommended Auditors

- **Trail of Bits** - Smart contract security specialists
- **OpenZeppelin** - Ethereum security experts
- **Consensys Diligence** - Blockchain security audits
- **Zama** - FHE implementation review

---

## Security Incident Response

### Incident Classification

**Critical:** Funds at risk, immediate action required
**High:** Potential vulnerability, urgent fix needed
**Medium:** Security concern, fix in next release
**Low:** Minor issue, fix when convenient

### Response Procedure

1. **Detection**
   - Monitor contract events
   - Watch for unusual transactions
   - Community reports

2. **Assessment**
   - Classify severity
   - Determine impact
   - Identify affected users

3. **Containment**
   - Pause affected functions (if possible)
   - Communicate with users
   - Prepare fix

4. **Resolution**
   - Deploy fix (if contract upgradeable)
   - Or deploy new version
   - Migrate data if needed

5. **Post-Mortem**
   - Document incident
   - Analyze root cause
   - Improve processes

---

## Security Contact

For security issues, please contact:
- **Email:** security@yourdomain.com
- **PGP Key:** [Link to PGP key]
- **Bug Bounty:** [Link to bug bounty program]

**Please do not disclose security issues publicly until they have been addressed.**

---

## Changelog

### Version 1.0.0 (2025-10-30)
- Initial security documentation
- FHE implementation details
- Threat model analysis
- Best practices guide

---

**Last Updated:** 2025-10-30
