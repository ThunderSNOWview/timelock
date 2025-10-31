import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { metaMaskWallet, rainbowWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets';
import { configureChains, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { infuraProvider } from 'wagmi/providers/infura';

const { chains, publicClient } = configureChains(
  [sepolia],
  [
    infuraProvider({ apiKey: import.meta.env.VITE_INFURA_API_KEY || 'demo' }),
    publicProvider()
  ]
);

const connectors = connectorsForWallets([
  {
    groupName: 'Recommended',
    wallets: [
      metaMaskWallet({ chains, projectId: 'YOUR_PROJECT_ID' }),
      rainbowWallet({ chains, projectId: 'YOUR_PROJECT_ID' }),
      walletConnectWallet({ chains, projectId: 'YOUR_PROJECT_ID' }),
    ],
  },
]);

export const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient
});

export { chains };
