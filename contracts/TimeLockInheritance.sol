// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, externalEuint128, euint128, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title TimeLockInheritance
 * @notice Encrypted inheritance vaults with staggered releases
 * @dev Beneficiaries and amounts encrypted until unlock using FHE
 */
contract TimeLockInheritance is SepoliaConfig {
    
    // Constants
    uint256 public constant UNLOCK_INTERVAL = 365 days; // 1 year between stages
    uint256 public constant TOTAL_STAGES = 4; // 25% per stage
    
    // Enums
    enum UnlockMode {
        ONE_TIME,    // All funds unlock at once
        STAGED       // Funds unlock in 4 stages over 4 years
    }
    
    // Structs
    struct Vault {
        uint256 id;
        address creator;
        uint256 totalAmount;
        uint256 firstUnlockTime;
        uint256 stagesUnlocked;
        bool emergencyUnlocked;
        bool isActive;
        uint256 beneficiaryCount;
        UnlockMode unlockMode;
    }
    
    struct Beneficiary {
        euint128 encryptedAddress;
        euint128 encryptedAmount;
        uint256 totalClaimed;
    }
    
    // State Variables
    mapping(uint256 => Vault) public vaults;
    mapping(uint256 => mapping(uint256 => Beneficiary)) private beneficiaries;
    mapping(address => uint256[]) public creatorVaults;
    mapping(address => uint256[]) public beneficiaryVaults;
    
    uint256 public vaultCount;
    
    // Events
    event VaultCreated(uint256 indexed vaultId, address indexed creator, uint256 totalAmount, uint256 firstUnlockTime);
    event StageUnlocked(uint256 indexed vaultId, uint256 stage, uint256 timestamp);
    event EmergencyUnlock(uint256 indexed vaultId, uint256 timestamp);
    event InheritanceClaimed(uint256 indexed vaultId, address indexed beneficiary, uint256 amount, uint256 stage);
    event BeneficiaryAdded(uint256 indexed vaultId, uint256 beneficiaryIndex);
    
    // Modifiers
    modifier vaultExists(uint256 vaultId) {
        require(vaultId > 0 && vaultId <= vaultCount, "Vault does not exist");
        require(vaults[vaultId].isActive, "Vault is not active");
        _;
    }
    
    modifier onlyCreator(uint256 vaultId) {
        require(vaults[vaultId].creator == msg.sender, "Not vault creator");
        _;
    }
    
    /**
     * @notice Create a new inheritance vault
     * @param firstUnlockTime Timestamp for first unlock
     * @param unlockMode ONE_TIME (0) or STAGED (1)
     * @param beneficiaryCount Number of beneficiaries (to be added later)
     */
    function createVault(
        uint256 firstUnlockTime,
        UnlockMode unlockMode,
        uint256 beneficiaryCount
    ) external payable returns (uint256) {
        require(msg.value > 0, "Must deposit ETH");
        require(firstUnlockTime > block.timestamp, "Unlock time must be in future");
        require(beneficiaryCount > 0, "Must have at least one beneficiary");
        
        vaultCount++;
        
        vaults[vaultCount] = Vault({
            id: vaultCount,
            creator: msg.sender,
            totalAmount: msg.value,
            firstUnlockTime: firstUnlockTime,
            stagesUnlocked: 0,
            emergencyUnlocked: false,
            isActive: true,
            beneficiaryCount: beneficiaryCount,
            unlockMode: unlockMode
        });
        
        creatorVaults[msg.sender].push(vaultCount);
        
        emit VaultCreated(vaultCount, msg.sender, msg.value, firstUnlockTime);
        return vaultCount;
    }
    
    /**
     * @notice Add a beneficiary to a vault (one at a time to save gas)
     * @param vaultId Vault ID
     * @param beneficiaryIndex Index of this beneficiary (0-based)
     * @param encryptedAddress Encrypted beneficiary address
     * @param encryptedAmount Encrypted amount for this beneficiary
     * @param addressProof FHE proof for address
     * @param amountProof FHE proof for amount
     */
    function addBeneficiary(
        uint256 vaultId,
        uint256 beneficiaryIndex,
        externalEuint128 encryptedAddress,
        externalEuint128 encryptedAmount,
        bytes calldata addressProof,
        bytes calldata amountProof
    ) external vaultExists(vaultId) onlyCreator(vaultId) {
        require(beneficiaryIndex < vaults[vaultId].beneficiaryCount, "Invalid beneficiary index");
        require(beneficiaries[vaultId][beneficiaryIndex].totalClaimed == 0, "Beneficiary already added");
        
        euint128 encAddr = FHE.fromExternal(encryptedAddress, addressProof);
        euint128 encAmount = FHE.fromExternal(encryptedAmount, amountProof);
        
        beneficiaries[vaultId][beneficiaryIndex] = Beneficiary({
            encryptedAddress: encAddr,
            encryptedAmount: encAmount,
            totalClaimed: 0
        });
        
        FHE.allowThis(encAddr);
        FHE.allowThis(encAmount);
        FHE.allow(encAddr, msg.sender);
        FHE.allow(encAmount, msg.sender);
        
        emit BeneficiaryAdded(vaultId, beneficiaryIndex);
    }
    
    /**
     * @notice Emergency unlock by creator
     * @param vaultId Vault ID to unlock
     */
    function emergencyUnlock(uint256 vaultId) 
        external 
        vaultExists(vaultId) 
        onlyCreator(vaultId) 
    {
        require(!vaults[vaultId].emergencyUnlocked, "Already emergency unlocked");
        
        vaults[vaultId].emergencyUnlocked = true;
        vaults[vaultId].stagesUnlocked = TOTAL_STAGES;
        
        emit EmergencyUnlock(vaultId, block.timestamp);
    }
    
    /**
     * @notice Claim inheritance for a specific stage
     * @param vaultId Vault ID
     */
    function claimInheritance(uint256 vaultId) 
        external 
        vaultExists(vaultId) 
    {
        Vault storage vault = vaults[vaultId];
        
        // Calculate current unlocked stages
        uint256 currentStage = _getCurrentStage(vaultId);
        require(currentStage > 0, "No stages unlocked yet");
        
        // Update vault stages if needed
        if (currentStage > vault.stagesUnlocked && !vault.emergencyUnlocked) {
            for (uint256 i = vault.stagesUnlocked; i < currentStage; i++) {
                emit StageUnlocked(vaultId, i + 1, block.timestamp);
            }
            vault.stagesUnlocked = currentStage;
        }
        
        // Find beneficiary and calculate claimable amount
        (bool found, uint256 beneficiaryIndex, uint256 claimableAmount) = _findBeneficiaryAndCalculateClaim(vaultId, msg.sender);
        
        require(found, "Not a beneficiary");
        require(claimableAmount > 0, "Nothing to claim");
        
        // Update claimed amount
        beneficiaries[vaultId][beneficiaryIndex].totalClaimed += claimableAmount;
        
        // Transfer funds
        (bool success, ) = msg.sender.call{value: claimableAmount}("");
        require(success, "Transfer failed");
        
        // Add to beneficiary tracking if first claim
        if (beneficiaries[vaultId][beneficiaryIndex].totalClaimed == claimableAmount) {
            beneficiaryVaults[msg.sender].push(vaultId);
        }
        
        emit InheritanceClaimed(vaultId, msg.sender, claimableAmount, vault.stagesUnlocked);
    }
    
    /**
     * @notice Check if address is a beneficiary and get claimable amount
     * @param vaultId Vault ID
     * @return isBeneficiary Whether caller is a beneficiary
     * @return claimableAmount Amount available to claim
     * @return totalAmount Total allocated amount
     */
    function checkInheritance(uint256 vaultId) 
        external 
        view 
        vaultExists(vaultId) 
        returns (bool isBeneficiary, uint256 claimableAmount, uint256 totalAmount) 
    {
        (bool found, uint256 beneficiaryIndex, uint256 claimable) = _findBeneficiaryAndCalculateClaim(vaultId, msg.sender);
        
        if (!found) {
            return (false, 0, 0);
        }
        
        // Calculate total allocated (need to decrypt - only works for beneficiary)
        uint256 total = 0; // Would need FHE decryption here
        
        return (true, claimable, total);
    }
    
    /**
     * @notice Get vault details
     * @param vaultId Vault ID
     * @return Vault struct
     */
    function getVault(uint256 vaultId) 
        external 
        view 
        vaultExists(vaultId) 
        returns (Vault memory) 
    {
        return vaults[vaultId];
    }
    
    /**
     * @notice Get vaults created by an address
     * @param creator Creator address
     * @return Array of vault IDs
     */
    function getCreatorVaults(address creator) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return creatorVaults[creator];
    }
    
    /**
     * @notice Get vaults where address is beneficiary
     * @param beneficiary Beneficiary address
     * @return Array of vault IDs
     */
    function getBeneficiaryVaults(address beneficiary) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return beneficiaryVaults[beneficiary];
    }
    
    /**
     * @notice Get encrypted beneficiary data (creator only)
     * @param vaultId Vault ID
     * @param beneficiaryIndex Index of beneficiary
     * @return Encrypted address and amount
     */
    function getEncryptedBeneficiary(uint256 vaultId, uint256 beneficiaryIndex) 
        external 
        view 
        vaultExists(vaultId) 
        onlyCreator(vaultId) 
        returns (euint128, euint128) 
    {
        require(beneficiaryIndex < vaults[vaultId].beneficiaryCount, "Invalid index");
        Beneficiary storage ben = beneficiaries[vaultId][beneficiaryIndex];
        return (ben.encryptedAddress, ben.encryptedAmount);
    }
    
    /**
     * @notice Calculate current unlocked stage based on time
     * @param vaultId Vault ID
     * @return Current stage (0-4 for staged, 0 or 4 for one-time)
     */
    function _getCurrentStage(uint256 vaultId) private view returns (uint256) {
        Vault storage vault = vaults[vaultId];
        
        if (vault.emergencyUnlocked) {
            return TOTAL_STAGES;
        }
        
        if (block.timestamp < vault.firstUnlockTime) {
            return 0;
        }
        
        // ONE_TIME mode: unlock all at once
        if (vault.unlockMode == UnlockMode.ONE_TIME) {
            return TOTAL_STAGES;
        }
        
        // STAGED mode: unlock progressively
        uint256 timeElapsed = block.timestamp - vault.firstUnlockTime;
        uint256 stage = (timeElapsed / UNLOCK_INTERVAL) + 1;
        
        return stage > TOTAL_STAGES ? TOTAL_STAGES : stage;
    }
    
    /**
     * @notice Find beneficiary and calculate claimable amount
     * @param vaultId Vault ID
     * @param beneficiaryAddr Address to check
     * @return found Whether beneficiary was found
     * @return index Beneficiary index
     * @return claimable Amount available to claim
     */
    function _findBeneficiaryAndCalculateClaim(uint256 vaultId, address beneficiaryAddr) 
        private 
        view 
        returns (bool found, uint256 index, uint256 claimable) 
    {
        Vault storage vault = vaults[vaultId];
        uint256 currentStage = _getCurrentStage(vaultId);
        
        if (currentStage == 0) {
            return (false, 0, 0);
        }
        
        // In a real implementation, we'd decrypt and compare addresses
        // For now, this is a placeholder - actual FHE comparison would be needed
        // This would require the beneficiary to provide proof they can decrypt
        
        // Simplified: Check if address matches any beneficiary
        // Real implementation would use FHE equality check
        
        return (false, 0, 0); // Placeholder
    }
}
