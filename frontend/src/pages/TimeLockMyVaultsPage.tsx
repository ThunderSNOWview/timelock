import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useTimeLock, Vault } from '../hooks/useTimeLock';
import { formatEther } from 'viem';

export default function TimeLockMyVaultsPage() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { getCreatorVaults } = useTimeLock();
  
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (address) {
      loadVaults();
    }
  }, [address]);

  const loadVaults = async () => {
    if (!address) return;
    
    try {
      setIsLoading(true);
      const vaultData = await getCreatorVaults(address);
      setVaults(vaultData);
    } catch (error) {
      console.error('Error loading vaults:', error);
    } finally {
      setIsLoading(false);
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
              <span className="text-xl font-semibold text-gray-900">My Vaults</span>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {!isConnected ? (
          <div className="text-center py-12 text-gray-500">
            Connect wallet to view your vaults
          </div>
        ) : isLoading ? (
          <div className="text-center py-12 text-gray-400">
            Loading vaults...
          </div>
        ) : vaults.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No vaults yet</p>
            <button
              onClick={() => navigate('/create')}
              className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Create Your First Vault
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {vaults.map((vault) => (
              <button
                key={vault.id.toString()}
                onClick={() => navigate(`/vault/${vault.id}`)}
                className="w-full border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors text-left"
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
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Beneficiaries</div>
                    <div className="font-medium text-gray-900">{vault.beneficiaryCount.toString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Unlock Date</div>
                    <div className="font-medium text-gray-900">
                      {new Date(Number(vault.firstUnlockTime) * 1000).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Status</div>
                    <div className="font-medium text-gray-900">
                      {vault.emergencyUnlocked ? '🚨' : vault.isActive ? '✓' : '✗'}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
