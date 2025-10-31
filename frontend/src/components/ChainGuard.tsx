import { useEffect } from 'react';
import { useNetwork, useSwitchNetwork } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import toast from 'react-hot-toast';

interface ChainGuardProps {
  children: React.ReactNode;
}

export function ChainGuard({ children }: ChainGuardProps) {
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();

  const isWrongChain = chain && chain.id !== sepolia.id;

  useEffect(() => {
    if (isWrongChain) {
      toast.error(
        `Wrong network detected. Please switch to Sepolia.`,
        { duration: 5000 }
      );
    }
  }, [isWrongChain]);

  if (isWrongChain) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md mx-4 p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center text-center">
            {/* Warning Icon */}
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Wrong Network
            </h3>

            {/* Current Chain Info */}
            <div className="mb-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Currently connected to:
              </p>
              <p className="text-base font-semibold text-gray-900 dark:text-white">
                {chain?.name || 'Unknown Network'}
              </p>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              This app requires the <span className="font-semibold text-purple-600 dark:text-purple-400">Sepolia Testnet</span> to function properly.
            </p>

            {/* Switch Button */}
            {switchNetwork ? (
              <button
                onClick={() => switchNetwork(sepolia.id)}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Switch to Sepolia
              </button>
            ) : (
              <div className="w-full px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium rounded-lg text-sm">
                Please switch to Sepolia manually in your wallet
              </div>
            )}

            {/* Help Text */}
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-500">
              Need help? Check your wallet's network settings
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
