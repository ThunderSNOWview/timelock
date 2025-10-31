import { WagmiConfig } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { wagmiConfig, chains } from './config/wagmi';
import TimeLockLandingPage from './pages/TimeLockLandingPage';
import TimeLockCreatePage from './pages/TimeLockCreatePage';
import TimeLockMyVaultsPage from './pages/TimeLockMyVaultsPage';
import TimeLockVaultDetailPage from './pages/TimeLockVaultDetailPage';
import TimeLockCheckInheritancePage from './pages/TimeLockCheckInheritancePage';
import { ChainGuard } from './components/ChainGuard';

import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

function AppContent() {
  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1f2937',
            color: '#f3f4f6',
          },
        }}
      />
      
      <ChainGuard>
        <Router>
          <Routes>
            <Route path="/" element={<TimeLockLandingPage />} />
            <Route path="/create-vault" element={<TimeLockCreatePage />} />
            <Route path="/my-vaults" element={<TimeLockMyVaultsPage />} />
            <Route path="/vault/:id" element={<TimeLockVaultDetailPage />} />
            <Route path="/check-inheritance" element={<TimeLockCheckInheritancePage />} />
          </Routes>
        </Router>
      </ChainGuard>
    </>
  );
}

function App() {
  return (
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          chains={chains}
          modalSize="compact"
          coolMode
        >
          <AppContent />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}

export default App;
