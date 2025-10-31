import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useTimeLock, Vault } from '../hooks/useTimeLock';
import { formatEther } from 'viem';
import toast from 'react-hot-toast';

export default function TimeLockVaultDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { getVault, emergencyUnlock, addBeneficiary: addBeneficiaryToVault } = useTimeLock();
  
  const [vault, setVault] = useState<Vault | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showAddBeneficiary, setShowAddBeneficiary] = useState(false);
  const [beneficiaryIndex, setBeneficiaryIndex] = useState(0);
  const [beneficiaryAddress, setBeneficiaryAddress] = useState('');
  const [beneficiaryAmount, setBeneficiaryAmount] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addingProgress, setAddingProgress] = useState('');

  useEffect(() => {
    if (id) {
      loadVault();
    }
  }, [id]);

  const loadVault = async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      const vaultData = await getVault(BigInt(id));
      setVault(vaultData);
    } catch (error) {
      console.error('Error loading vault:', error);
      toast.error('Failed to load vault');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmergencyUnlock = async () => {
    if (!vault || !id) return;

    const confirmed = window.confirm(
      'Are you sure you want to emergency unlock all stages? This cannot be undone.'
    );

    if (!confirmed) return;

    setIsUnlocking(true);
    try {
      await emergencyUnlock(BigInt(id));
      toast.success('Emergency unlock successful!');
      await loadVault();
    } catch (error: any) {
      console.error('Error emergency unlocking:', error);
      toast.error(error.message || 'Failed to emergency unlock');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleAddBeneficiary = async () => {
    if (!vault || !id) return;

    if (!beneficiaryAddress || !beneficiaryAmount) {
      toast.error('Please enter address and amount');
      return;
    }

    if (beneficiaryIndex >= Number(vault.beneficiaryCount)) {
      toast.error('Invalid beneficiary index');
      return;
    }

    setIsAdding(true);
    setAddingProgress('Preparing...');
    try {
      await addBeneficiaryToVault(
        BigInt(id),
        beneficiaryIndex,
        { address: beneficiaryAddress, amount: beneficiaryAmount },
        (step) => {
          setAddingProgress(step);
          toast.loading(step, { id: 'add-beneficiary' });
        }
      );
      toast.success('Beneficiary added successfully!', { id: 'add-beneficiary' });
      setBeneficiaryAddress('');
      setBeneficiaryAmount('');
      setBeneficiaryIndex(beneficiaryIndex + 1);
      setShowAddBeneficiary(false);
      setAddingProgress('');
    } catch (error: any) {
      console.error('Error adding beneficiary:', error);
      toast.error(error.message || 'Failed to add beneficiary', { id: 'add-beneficiary' });
      setAddingProgress('');
    } finally {
      setIsAdding(false);
    }
  };

  const isCreator = vault && address && vault.creator.toLowerCase() === address.toLowerCase();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-400">Loading vault...</div>
      </div>
    );
  }

  if (!vault) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-400">Vault not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/my-vaults')} className="text-gray-400 hover:text-gray-600">
                ←
              </button>
              <div>
                <div className="text-sm text-gray-500">Vault #{id}</div>
                <div className="text-xl font-semibold text-gray-900">{formatEther(vault.totalAmount)} ETH</div>
              </div>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-6">
          {/* Vault Info */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-500 mb-1">Unlock Mode</div>
                <div className="font-medium text-gray-900">
                  {vault.unlockMode === 0 ? '⚡ One-Time' : '📊 Staged'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Beneficiaries</div>
                <div className="font-medium text-gray-900">{vault.beneficiaryCount.toString()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">First Unlock</div>
                <div className="font-medium text-gray-900">
                  {new Date(Number(vault.firstUnlockTime) * 1000).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Status</div>
                <div className="font-medium text-gray-900">
                  {vault.emergencyUnlocked ? '🚨 Emergency' : vault.isActive ? '✓ Active' : '✗ Inactive'}
                </div>
              </div>
            </div>
          </div>

          {/* Add Beneficiaries */}
          {isCreator && (
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Beneficiaries</h3>
                <span className="text-sm text-gray-500">
                  {beneficiaryIndex}/{vault.beneficiaryCount.toString()}
                </span>
              </div>

              {beneficiaryIndex < Number(vault.beneficiaryCount) ? (
                <>
                  {!showAddBeneficiary ? (
                    <button
                      onClick={() => setShowAddBeneficiary(true)}
                      className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                    >
                      Add Beneficiary #{beneficiaryIndex + 1}
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Address
                        </label>
                        <input
                          type="text"
                          value={beneficiaryAddress}
                          onChange={(e) => setBeneficiaryAddress(e.target.value)}
                          placeholder="0x..."
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Amount (ETH)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={beneficiaryAmount}
                          onChange={(e) => setBeneficiaryAmount(e.target.value)}
                          placeholder="0.5"
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        />
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={handleAddBeneficiary}
                          disabled={isAdding}
                          className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                        >
                          {isAdding ? addingProgress || 'Adding...' : 'Add'}
                        </button>
                        <button
                          onClick={() => setShowAddBeneficiary(false)}
                          disabled={isAdding}
                          className="px-4 py-3 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  ✓ All beneficiaries added
                </div>
              )}
            </div>
          )}

          {/* Emergency Unlock */}
          {isCreator && !vault.emergencyUnlocked && (
            <div className="border border-red-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Emergency Actions</h3>
              <p className="text-sm text-gray-600 mb-4">
                Immediately unlock all stages for beneficiaries
              </p>
              <button
                onClick={handleEmergencyUnlock}
                disabled={isUnlocking}
                className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isUnlocking ? 'Unlocking...' : '🚨 Emergency Unlock'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
