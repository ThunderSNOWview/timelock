import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useTimeLock, Beneficiary } from '../hooks/useTimeLock';
import CompactConnectButton from '../components/CompactConnectButton';
import toast from 'react-hot-toast';

export default function TimeLockCreatePage() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { createVault } = useTimeLock();
  
  const [totalAmount, setTotalAmount] = useState('1');
  const [firstUnlockDate, setFirstUnlockDate] = useState('');
  const [unlockMode, setUnlockMode] = useState<'ONE_TIME' | 'STAGED'>('STAGED');
  const [beneficiaryCount, setBeneficiaryCount] = useState(1);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!firstUnlockDate) {
      toast.error('Please select unlock date');
      return;
    }

    if (beneficiaryCount < 1) {
      toast.error('Must have at least one beneficiary slot');
      return;
    }

    setIsCreating(true);

    try {
      const unlockTimestamp = Math.floor(new Date(firstUnlockDate).getTime() / 1000);
      
      const vaultId = await createVault(
        unlockTimestamp,
        unlockMode,
        beneficiaryCount,
        totalAmount,
        (step) => toast.loading(step, { id: 'create-vault' })
      );

      if (!vaultId) {
        throw new Error('Failed to get vault ID');
      }

      toast.success('Vault created! You can now add beneficiaries.', { id: 'create-vault' });
      navigate(`/vault/${vaultId}`);
    } catch (error: any) {
      console.error('Error creating vault:', error);
      toast.error(error.message || 'Failed to create vault', { id: 'create-vault' });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-black text-white shadow-xl border-b-4 border-yellow-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => navigate('/')}
                className="text-yellow-400 hover:text-yellow-300 transition-colors font-semibold text-sm sm:text-base"
              >
                ← Back
              </button>
              <h1 className="text-lg sm:text-2xl md:text-3xl font-bold">Create Vault</h1>
            </div>
            <CompactConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6 border-2 border-black">
          {/* Total Amount */}
          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Total Vault Amount (ETH)
            </label>
            <input
              type="number"
              step="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="w-full px-4 py-3 border-2 border-black rounded-xl focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400 focus:outline-none transition-all"
              placeholder="1.0"
            />
          </div>

          {/* Unlock Mode Selection */}
          <div>
            <label className="block text-sm font-semibold text-black mb-3">
              Unlock Mode
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setUnlockMode('STAGED')}
                className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all border-2 ${
                  unlockMode === 'STAGED'
                    ? 'bg-yellow-400 text-black border-black shadow-lg'
                    : 'bg-white text-black border-black hover:bg-gray-100'
                }`}
              >
                📊 Staged Release
              </button>
              <button
                onClick={() => setUnlockMode('ONE_TIME')}
                className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all border-2 ${
                  unlockMode === 'ONE_TIME'
                    ? 'bg-yellow-400 text-black border-black shadow-lg'
                    : 'bg-white text-black border-black hover:bg-gray-100'
                }`}
              >
                ⚡ One-Time Unlock
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {unlockMode === 'STAGED' ? '25% per year over 4 years' : '100% on unlock date'}
            </p>
          </div>

          {/* First Unlock Date */}
          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              {unlockMode === 'ONE_TIME' ? 'Unlock Date' : 'First Unlock Date'}
            </label>
            <input
              type="date"
              value={firstUnlockDate}
              onChange={(e) => setFirstUnlockDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border-2 border-black rounded-xl focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400 focus:outline-none transition-all"
            />
          </div>

          {/* Unlock Schedule Preview */}
          {firstUnlockDate && unlockMode === 'STAGED' && (
            <div className="bg-yellow-50 rounded-xl p-6 border-2 border-black">
              <h3 className="font-bold text-lg mb-4 text-black">Unlock Schedule</h3>
              <div className="space-y-3">
                {calculateUnlockDates().map((unlock) => (
                  <div key={unlock.stage} className="flex justify-between items-center">
                    <span className="text-black">
                      Stage {unlock.stage} ({unlock.percentage}%)
                    </span>
                    <span className="font-semibold text-black">
                      {unlock.date.toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {firstUnlockDate && unlockMode === 'ONE_TIME' && (
            <div className="bg-yellow-50 rounded-xl p-6 border-2 border-black">
              <h3 className="font-bold text-lg mb-4 text-black">Unlock Schedule</h3>
              <div className="flex justify-between items-center">
                <span className="text-black">
                  Full Amount (100%)
                </span>
                <span className="font-semibold text-black">
                  {new Date(firstUnlockDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}

          {/* Number of Beneficiaries */}
          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Number of Beneficiaries
            </label>
            <input
              type="number"
              min="1"
              value={beneficiaryCount}
              onChange={(e) => setBeneficiaryCount(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-3 border-2 border-black rounded-xl focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400 focus:outline-none transition-all"
              placeholder="1"
            />
            <p className="mt-2 text-sm text-gray-600">
              You'll add beneficiary details after creating the vault
            </p>
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreate}
            disabled={isCreating || !isConnected}
            className="w-full px-6 py-4 bg-yellow-400 text-black rounded-xl font-bold text-lg shadow-xl hover:bg-yellow-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed border-2 border-black"
          >
            {isCreating ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                Creating Vault...
              </span>
            ) : (
              'Create Vault 🏛️'
            )}
          </button>

          {!isConnected && (
            <p className="text-center text-gray-600 text-sm">
              Please connect your wallet to create a vault
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
