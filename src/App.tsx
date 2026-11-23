import React, { useMemo } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';

import { SkpiProvider } from './context/SkpiContext';
import { Navbar } from './components/Navbar';
import { PublicVerificationPage } from './pages/PublicVerificationPage';
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import { ValidatorDashboardPage } from './pages/ValidatorDashboardPage';

export const App: React.FC = () => {
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          <SkpiProvider>
            <BrowserRouter>
              <div className="min-h-screen flex flex-col bg-white text-slate-900 bg-grid-orange">
                <Navbar />
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<PublicVerificationPage />} />
                    <Route path="/student/dashboard" element={<StudentDashboardPage />} />
                    <Route path="/validator/dashboard" element={<ValidatorDashboardPage />} />
                  </Routes>
                </main>
                <footer className="border-t-2 border-orange-100 bg-white py-6 text-xs text-slate-600">
                  <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-600" />
                      <span>
                        <strong className="text-slate-900 font-bold">SKPITrace FTIK USM</strong> — Sistem Verifikasi SKPI & Portofolio Mahasiswa Terdesentralisasi
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-medium text-orange-700 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full">
                      SHA-256 Cryptographic Hash &bull; Solana Devnet Multi-Signature
                    </span>
                  </div>
                </footer>
              </div>
            </BrowserRouter>
          </SkpiProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default App;
