import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useTimeLock, Vault } from '../hooks/useTimeLock';
import { formatEther } from 'viem';
import toast from 'react-hot-toast';

export default function TimeLockCheckInheritancePage() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { getBeneficiaryVaults, claimInheritance } = useTimeLock();
  
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [claimingVaultId, setClaimingVaultId] = useState<bigint | null>(null);

  useEffect(() => {
    if (address) {
      loadVaults();
    }
  }, [address]);

  const loadVaults = async () => {
    if (!address) return;
    
    try {
      setIsLoading(true);
      const vaultData = await getBeneficiaryVaults(address);
      setVaults(vaultData);
    } catch (error) {
      console.error('Error loading vaults:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaim = async (vaultId: bigint) => {
    setClaimingVaultId(vaultId);
    try {
      await claimInheritance(vaultId);
      toast.success('Inheritance claimed successfully!');
      await loadVaults();
    } catch (error: any) {
      console.error('Error claiming:', error);
      toast.error(error.message || 'Failed to claim inheritance');
    } finally {
      setClaimingVaultId(null);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600">
                ←
              </button>
              <span className="text-xl font-semibold text-gray-900">Check Inheritance</span>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {!isConnected ? (
          <div className="text-center py-12 text-gray-500">
            Connect wallet to check your inheritance
          </div>
        ) : isLoading ? (
          <div className="text-center py-12 text-gray-400">
            Checking for inheritance...
          </div>
        ) : vaults.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No inheritance found for your address
          </div>
        ) : (
          <div className="space-y-3">
            {vaults.map((vault) => (
              <div
                key={vault.id.toString()}
                className="border border-gray-200 rounded-lg p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Vault #{vault.id.toString()}</div>
                    <div className="text-2xl font-semibold text-gray-900">
                      {formatEther(vault.totalAmount)} ETH
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                    {vault.unlockMode === 0 ? '⚡ One-Time' : '📊 Staged'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <div className="text-gray-500">Unlock Date</div>
                    <div className="font-medium text-gray-900">
                      {new Date(Number(vault.firstUnlockTime) * 1000).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Status</div>
                    <div className="font-medium text-gray-900">
                      {vault.emergencyUnlocked ? '🚨 Emergency' : vault.isActive ? '✓ Active' : '✗ Inactive'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleClaim(vault.id)}
                  disabled={claimingVaultId === vault.id}
                  className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {claimingVaultId === vault.id ? 'Claiming...' : 'Claim Inheritance'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
