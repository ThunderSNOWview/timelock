import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import CompactConnectButton from '../components/CompactConnectButton';

export default function TimeLockLandingPage() {
  const navigate = useNavigate();
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b-4 border-yellow-400 bg-black sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-400 rounded-xl flex items-center justify-center">
                <span className="text-black text-base sm:text-xl">🏛️</span>
              </div>
              <h1 className="text-base sm:text-xl md:text-2xl font-bold text-yellow-400">
                TimeLock Inheritance
              </h1>
            </div>
            <CompactConnectButton />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-5xl sm:text-6xl font-bold mb-6 text-black">
            Secure Your Legacy
          </h2>
          <p className="text-xl text-gray-700 mb-8 leading-relaxed">
            Create encrypted inheritance vaults in two simple steps. Add beneficiaries privately after vault creation with full FHE encryption.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/create-vault')}
              className="px-8 py-4 bg-yellow-400 text-black rounded-xl font-bold text-lg shadow-xl hover:bg-yellow-300 transition-all transform hover:scale-105 border-2 border-black"
            >
              Create Vault 🏛️
            </button>
            <button
              onClick={() => navigate('/check-inheritance')}
              className="px-8 py-4 bg-white text-black border-2 border-black rounded-xl font-bold text-lg shadow-lg hover:bg-gray-100 transition-all transform hover:scale-105"
            >
              Check Inheritance 🔍
            </button>
          </div>

          {isConnected && (
            <button
              onClick={() => navigate('/my-vaults')}
              className="mt-4 px-6 py-3 text-black hover:text-gray-700 font-semibold transition-colors"
            >
              View My Vaults →
            </button>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h3 className="text-3xl font-bold text-center mb-16 text-black">
          How It Works
        </h3>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow border-2 border-black">
            <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center mb-6 mx-auto border-2 border-black">
              <span className="text-3xl">1️⃣</span>
            </div>
            <h4 className="text-xl font-bold mb-4 text-center text-black">Create Vault</h4>
            <p className="text-gray-700 text-center leading-relaxed">
              Set total amount, unlock mode, and number of beneficiary slots. Quick and low gas cost.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow border-2 border-black">
            <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center mb-6 mx-auto border-2 border-black">
              <span className="text-3xl">2️⃣</span>
            </div>
            <h4 className="text-xl font-bold mb-4 text-center text-black">Add Beneficiaries</h4>
            <p className="text-gray-700 text-center leading-relaxed">
              Add beneficiaries one-by-one with encrypted addresses and amounts. Each transaction is separate for lower gas.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow border-2 border-black">
            <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center mb-6 mx-auto border-2 border-black">
              <span className="text-3xl">3️⃣</span>
            </div>
            <h4 className="text-xl font-bold mb-4 text-center text-black">Unlock & Claim</h4>
            <p className="text-gray-700 text-center leading-relaxed">
              Choose staged (25% yearly) or one-time unlock. Beneficiaries claim when stages unlock.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-black rounded-3xl p-12 text-white border-4 border-yellow-400">
          <h3 className="text-3xl font-bold mb-12 text-center text-yellow-400">Key Features</h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="text-3xl">🔐</div>
              <div>
                <h4 className="font-bold text-lg mb-2 text-yellow-400">Fully Encrypted</h4>
                <p className="text-gray-300">Beneficiaries and amounts encrypted with Zama FHE technology</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-3xl">⏰</div>
              <div>
                <h4 className="font-bold text-lg mb-2 text-yellow-400">Flexible Unlocks</h4>
                <p className="text-gray-300">Choose staged (25% yearly over 4 years) or one-time unlock mode</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-3xl">🚨</div>
              <div>
                <h4 className="font-bold text-lg mb-2 text-yellow-400">Emergency Override</h4>
                <p className="text-gray-300">Creator can unlock all stages immediately if needed</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-3xl">🔔</div>
              <div>
                <h4 className="font-bold text-lg mb-2 text-yellow-400">On-Chain Events</h4>
                <p className="text-gray-300">Automatic notifications when stages unlock</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h3 className="text-3xl font-bold mb-6 text-black">
            Ready to Secure Your Legacy?
          </h3>
          <p className="text-xl text-gray-700 mb-8">
            Create your vault in seconds, add beneficiaries privately whenever you're ready
          </p>
          <button
            onClick={() => navigate('/create-vault')}
            className="px-10 py-5 bg-yellow-400 text-black rounded-xl font-bold text-xl shadow-2xl hover:bg-yellow-300 transition-all transform hover:scale-105 border-2 border-black"
          >
            Get Started →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-4 border-yellow-400 bg-black mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-300">
            <p className="mb-2">Built with ❤️ using Zama FHE • Powered by Ethereum Sepolia</p>
            <p className="text-sm">Secure, Private, Decentralized Inheritance</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
