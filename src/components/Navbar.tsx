import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  GraduationCap,
  FileCheck2,
  Layers,
} from 'lucide-react';
import { useSkpi } from '../context/SkpiContext';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { submissions } = useSkpi();

  const pendingCount = submissions.filter(
    (s) => s.status === 'PENDING' || s.status === 'KAPRODI_APPROVED'
  ).length;

  const navItems = [
    {
      path: '/',
      label: 'Portal Yudisium',
      icon: ShieldCheck,
    },
    {
      path: '/student/dashboard',
      label: 'Portofolio Mahasiswa',
      icon: GraduationCap,
    },
    {
      path: '/validator/dashboard',
      label: 'Validator Akademik',
      icon: FileCheck2,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
  ];

  return (
    <header className="sticky top-0 z-40 border-b-2 border-orange-100 bg-white/95 backdrop-blur-md">
      {/* Sub-bar Informasi Jaringan */}
      <div className="bg-orange-600 px-4 py-1.5 text-[11px] font-medium text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-orange-100" />
            <span>
              Arsitektur Verifikasi Dokumen: Generator PDF Deterministik &bull; Web Crypto SHA-256 &bull; Solana Devnet
            </span>
          </div>
          <span className="font-mono text-[10px] text-orange-100">
            Program ID: SKP1TrAcE99xYzUvWxYz123456789ABCDEFGHJKLMNP
          </span>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-600 text-white shadow-sm">
            <ShieldCheck className="h-6 w-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-slate-900">
                SKPI<span className="text-orange-600">Trace</span>
              </span>
              <span className="rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 font-mono text-[10px] font-bold text-orange-700">
                FTIK USM
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500">
              Audit Forensik Dokumen & Verifikasi SKPI On-Chain
            </p>
          </div>
        </Link>

        <nav className="flex flex-wrap items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-700 bg-white hover:bg-orange-50 hover:text-orange-700 border border-orange-200'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`ml-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold ${
                      isActive
                        ? 'bg-white text-orange-700'
                        : 'bg-orange-600 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
