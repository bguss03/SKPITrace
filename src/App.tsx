import React, { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import '@solana/wallet-adapter-react-ui/styles.css';

import { SkpiProvider } from './context/SkpiContext';
import { Navbar } from './components/Navbar';
import { PublicVerificationPage } from './pages/PublicVerificationPage';
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import { ValidatorDashboardPage } from './pages/ValidatorDashboardPage';

const UnauthorizedOrNotFoundPage: React.FC = () => {
  const location = useLocation();
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="rounded-2xl border-2 border-orange-800 bg-orange-50/40 p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-900 text-white shadow-sm">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <span className="inline-flex items-center rounded-full bg-orange-900 px-3 py-1 font-mono text-xs font-extrabold text-white">
          403 / 404 — AKSES DITOLAK
        </span>
        <h1 className="mt-3 text-2xl font-extrabold text-slate-900">
          Rute Tidak Terotorisasi atau Halaman Tidak Ditemukan
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
          Permintaan akses ke URL{' '}
          <code className="rounded border border-orange-300 bg-white px-2 py-0.5 font-mono font-bold text-orange-800">
            {location.pathname}
          </code>{' '}
          ditolak oleh sistem keamanan rute SKPITrace. Pastikan Anda mengakses halaman sesuai hak akses
          yang terdaftar.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-orange-700 transition shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Portal Yudisium</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

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
                    <Route path="/validator/dashboard/:skpiId" element={<ValidatorDashboardPage />} />
                    <Route path="*" element={<UnauthorizedOrNotFoundPage />} />
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
