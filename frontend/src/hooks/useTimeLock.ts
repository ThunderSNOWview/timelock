import { usePublicClient, useWalletClient, useAccount } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { useState, useEffect } from 'react';
import TimeLockABI from '../abi/TimeLockInheritanceABI.json';
import { initializeFHE, encryptAddress } from '../utils/fhe';

const CONTRACT_ADDRESS = import.meta.env.VITE_TIMELOCK_CONTRACT_ADDRESS;

export interface Vault {
  id: bigint;
  creator: string;
  totalAmount: bigint;
  firstUnlockTime: bigint;
  stagesUnlocked: bigint;
  emergencyUnlocked: boolean;
  isActive: boolean;
  beneficiaryCount: bigint;
  unlockMode: number; // 0 = ONE_TIME, 1 = STAGED
}

export interface Beneficiary {
  address: string;
  amount: string;
}

export function useTimeLock() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const [fheInstance, setFheInstance] = useState<any>(null);

  useEffect(() => {
    initializeFHE().then(setFheInstance);
  }, []);

  // Create a new vault (Step 1: Create vault without beneficiaries)
  const createVault = async (
    firstUnlockTime: number,
    unlockMode: 'ONE_TIME' | 'STAGED',
    beneficiaryCount: number,
    totalAmount: string,
    onProgress?: (step: string) => void
  ) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not initialized');
    }

    onProgress?.('Creating vault...');

    // Convert unlock mode to number (0 = ONE_TIME, 1 = STAGED)
    const unlockModeNum = unlockMode === 'ONE_TIME' ? 0 : 1;

    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: TimeLockABI.abi,
      functionName: 'createVault',
      args: [
        BigInt(firstUnlockTime),
        unlockModeNum,
        BigInt(beneficiaryCount)
      ],
      value: parseEther(totalAmount),
      gas: BigInt(500000),
    });

    await publicClient?.waitForTransactionReceipt({ hash });

    // Get vault ID from event logs
    const receipt = await publicClient?.getTransactionReceipt({ hash });
    const vaultId = receipt?.logs[0]?.topics[1];

    onProgress?.('Vault created!');
    return vaultId ? BigInt(vaultId) : null;
  };

  // Add a beneficiary to a vault (Step 2: Add beneficiaries one by one)
  const addBeneficiary = async (
    vaultId: bigint,
    beneficiaryIndex: number,
    beneficiary: Beneficiary,
    onProgress?: (step: string) => void
  ) => {
    if (!walletClient || !address || !fheInstance) {
      throw new Error('Wallet or FHE not initialized');
    }

    onProgress?.(`Encrypting address...`);

    // Encrypt address
    const { encryptedData: encAddr, inputProof: addrProof } = await encryptAddress(
      fheInstance,
      beneficiary.address,
      CONTRACT_ADDRESS
    );

    onProgress?.(`Encrypting amount...`);

    // Encrypt amount
    const amountBigInt = BigInt(parseEther(beneficiary.amount).toString());
    const amountHash = amountBigInt & ((1n << 128n) - 1n);
    
    const amountInput = fheInstance.createEncryptedInput(CONTRACT_ADDRESS, address);
    amountInput.add128(amountHash);
    const encryptedAmount = await amountInput.encrypt();

    const amountHandleBytes = encryptedAmount.handles[0] as Uint8Array;
    const amountHandleHex = '0x' + Array.from(amountHandleBytes).map(b => (b as number).toString(16).padStart(2, '0')).join('');

    // Convert proofs to proper format
    const addrProofBytes = typeof addrProof === 'string' 
      ? addrProof 
      : '0x' + Array.from(addrProof as Uint8Array).map(b => (b as number).toString(16).padStart(2, '0')).join('');
    
    const amountProofBytes = encryptedAmount.inputProof instanceof Uint8Array
      ? '0x' + Array.from(encryptedAmount.inputProof).map(b => (b as number).toString(16).padStart(2, '0')).join('')
      : encryptedAmount.inputProof;

    onProgress?.(`Submitting transaction...`);

    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: TimeLockABI.abi,
      functionName: 'addBeneficiary',
      args: [
        vaultId,
        BigInt(beneficiaryIndex),
        encAddr as `0x${string}`,
        amountHandleHex as `0x${string}`,
        addrProofBytes as `0x${string}`,
        amountProofBytes as `0x${string}`
      ],
      gas: BigInt(1000000),
    });

    await publicClient?.waitForTransactionReceipt({ hash });
    onProgress?.(`Beneficiary ${beneficiaryIndex + 1} added!`);
  };

  // Emergency unlock
  const emergencyUnlock = async (vaultId: bigint) => {
    if (!walletClient) throw new Error('Wallet not connected');

    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: TimeLockABI.abi,
      functionName: 'emergencyUnlock',
      args: [vaultId],
      gas: BigInt(500000),
    });

    await publicClient?.waitForTransactionReceipt({ hash });
  };

  // Claim inheritance
  const claimInheritance = async (vaultId: bigint, onProgress?: (step: string) => void) => {
    if (!walletClient) throw new Error('Wallet not connected');

    onProgress?.('Claiming inheritance...');

    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: TimeLockABI.abi,
      functionName: 'claimInheritance',
      args: [vaultId],
      gas: BigInt(1000000),
    });

    await publicClient?.waitForTransactionReceipt({ hash });
    onProgress?.('Claimed successfully!');
  };

  // Get vault details
  const getVault = async (vaultId: bigint): Promise<Vault | null> => {
    try {
      const vault = await publicClient?.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: TimeLockABI.abi,
        functionName: 'getVault',
        args: [vaultId],
      }) as any;

      if (!vault) return null;

      return {
        id: vault.id,
        creator: vault.creator,
        totalAmount: vault.totalAmount,
        firstUnlockTime: vault.firstUnlockTime,
        stagesUnlocked: vault.stagesUnlocked,
        emergencyUnlocked: vault.emergencyUnlocked,
        isActive: vault.isActive,
        beneficiaryCount: vault.beneficiaryCount,
        unlockMode: vault.unlockMode,
      };
    } catch (error) {
      console.error('Error fetching vault:', error);
      return null;
    }
  };

  // Get creator's vaults
  const getCreatorVaults = async (creator: string): Promise<bigint[]> => {
    try {
      const vaultIds = await publicClient?.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: TimeLockABI.abi,
        functionName: 'getCreatorVaults',
        args: [creator],
      }) as bigint[];

      return vaultIds || [];
    } catch (error) {
      console.error('Error fetching creator vaults:', error);
      return [];
    }
  };

  // Get beneficiary's vaults
  const getBeneficiaryVaults = async (beneficiary: string): Promise<bigint[]> => {
    try {
      const vaultIds = await publicClient?.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: TimeLockABI.abi,
        functionName: 'getBeneficiaryVaults',
        args: [beneficiary],
      }) as bigint[];

      return vaultIds || [];
    } catch (error) {
      console.error('Error fetching beneficiary vaults:', error);
      return [];
    }
  };

  // Check inheritance eligibility
  const checkInheritance = async (vaultId: bigint) => {
    try {
      const result = await publicClient?.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: TimeLockABI.abi,
        functionName: 'checkInheritance',
        args: [vaultId],
      }) as any;

      return {
        isBeneficiary: result[0],
        claimableAmount: result[1],
        totalAmount: result[2],
      };
    } catch (error) {
      console.error('Error checking inheritance:', error);
      return { isBeneficiary: false, claimableAmount: 0n, totalAmount: 0n };
    }
  };

  // Get all vaults
  const getAllVaults = async (): Promise<Vault[]> => {
    try {
      const vaultCount = await publicClient?.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: TimeLockABI.abi,
        functionName: 'vaultCount',
      }) as bigint;

      const vaults: Vault[] = [];
      for (let i = 1n; i <= vaultCount; i++) {
        const vault = await getVault(i);
        if (vault && vault.isActive) {
          vaults.push(vault);
        }
      }

      return vaults;
    } catch (error) {
      console.error('Error fetching all vaults:', error);
      return [];
    }
  };

  return {
    createVault,
    addBeneficiary,
    emergencyUnlock,
    claimInheritance,
    getVault,
    getCreatorVaults,
    getBeneficiaryVaults,
    checkInheritance,
    getAllVaults,
    fheInstance,
  };
}
