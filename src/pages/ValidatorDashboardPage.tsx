import React, { useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  FileCheck2,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Code2,
  Eye,
  UserCheck,
  Wallet,
  CheckSquare,
  Lock,
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import {
  useSkpi,
  DEFAULT_KAPRODI_WALLET,
  DEFAULT_ADMIN_WALLET,
  SOLANA_PROGRAM_ID,
} from '../context/SkpiContext';
import { downloadPdfFile } from '../utils/pdfGenerator';

export const ValidatorDashboardPage: React.FC = () => {
  const {
    students,
    certificates,
    submissions,
    onChainRecords,
    activeValidatorRole,
    setActiveValidatorRole,
    simulatedWalletAddress,
    approveKaprodiSign1,
    finalizeAdminSign2OnChain,
    resetSubmissionForDemo,
    applyHumanOverride,
    rejectSubmission,
    generateOfficialPdfForSubmission,
  } = useSkpi();

  const { publicKey, connected } = useWallet();
  const { skpiId: routeSkpiId } = useParams<{ skpiId?: string }>();
  const [searchParams] = useSearchParams();

  const [selectedSkpiId, setSelectedSkpiId] = useState<string>('SKPI-FTIK-2026-0053');
  const [overrideNote, setOverrideNote] = useState<string>(
    'Telah dilakukan verifikasi fisik sertifikat asli & konfirmasi daftar hadir panitia pada tanggal 02 Nov 2026.'
  );
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [showContractCode, setShowContractCode] = useState(false);

  const effectiveSignerWallet =
    connected && publicKey
      ? activeValidatorRole === 'ADMIN_AKADEMIK' &&
        submissions.find((s) => s.skpi_id === selectedSkpiId)?.kaprodi_wallet ===
          publicKey.toBase58()
        ? DEFAULT_ADMIN_WALLET
        : publicKey.toBase58()
      : simulatedWalletAddress;

  const requestedIdFromUrl = routeSkpiId || searchParams.get('id');
  const isInvalidUrlId =
    Boolean(requestedIdFromUrl) && !submissions.some((s) => s.skpi_id === requestedIdFromUrl);
  const isUnauthorizedRole =
    activeValidatorRole === 'UNAUTHORIZED' || searchParams.get('role') === 'guest';

  const targetSkpiId = requestedIdFromUrl || selectedSkpiId;
  const activeSub =
    submissions.find((s) => s.skpi_id === targetSkpiId) || submissions[0] || null;
  const activeStudent = activeSub
    ? students.find((s) => s.id === activeSub.student_id) || null
    : null;
  const activeCerts = activeStudent
    ? certificates.filter((c) => c.student_id === activeStudent.id)
    : [];
  const activeOnChain = activeSub ? onChainRecords[activeSub.skpi_id] : undefined;

  const handleSign1Kaprodi = async () => {
    if (!activeSub) return;
    setIsSigning(true);
    setActionFeedback(null);
    try {
      const res = await approveKaprodiSign1(activeSub.skpi_id, effectiveSignerWallet);
      setActionFeedback({
        type: res.success ? 'success' : 'error',
        text: res.message,
      });
    } finally {
      setIsSigning(false);
    }
  };

  const handleSign2Admin = async () => {
    if (!activeSub) return;
    setIsSigning(true);
    setActionFeedback(null);
    try {
      const res = await finalizeAdminSign2OnChain(activeSub.skpi_id, effectiveSignerWallet);
      setActionFeedback({
        type: res.success ? 'success' : 'error',
        text: res.message,
      });
    } finally {
      setIsSigning(false);
    }
  };

  const handleOverrideLowScore = async () => {
    if (!activeSub) return;
    await applyHumanOverride(activeSub.skpi_id, overrideNote);
    setActionFeedback({
      type: 'success',
      text: `Hierarki Keputusan Verifikator diterapkan! Bukti fisik sertifikat divalidasi manual dan skor integritas disesuaikan menjadi 85% (Aman).`,
    });
  };

  const handleDownloadPreviewPdf = async () => {
    if (!activeSub) return;
    const { pdfBytes, filename } = await generateOfficialPdfForSubmission(
      activeSub.skpi_id,
      false
    );
    downloadPdfFile(pdfBytes, filename);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header Validator & Connect Solana Wallet */}
      <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border-2 border-orange-100 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white shadow-sm">
            <FileCheck2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">
              Dashboard Verifikator Akademik & Multi-Signature Solana
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              Antrean Verifikasi SKPI, Pemeriksaan Fisik Dokumen, dan Pengesahan Multi-Signature (Kaprodi + Admin Fakultas).
            </p>
          </div>
        </div>

        {/* Wallet Adapter Button & Validator Role Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-1.5 flex items-center gap-1">
            <button
              onClick={() => {
                setActiveValidatorRole('KAPRODI');
                setActionFeedback(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${
                activeValidatorRole === 'KAPRODI'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-orange-700'
              }`}
            >
              Peran: Kaprodi (Sign 1)
            </button>
            <button
              onClick={() => {
                setActiveValidatorRole('ADMIN_AKADEMIK');
                setActionFeedback(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${
                activeValidatorRole === 'ADMIN_AKADEMIK'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-orange-700'
              }`}
            >
              Peran: Admin Fakultas (Sign 2)
            </button>
            <button
              onClick={() => {
                setActiveValidatorRole('UNAUTHORIZED');
                setActionFeedback(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${
                activeValidatorRole === 'UNAUTHORIZED'
                  ? 'bg-orange-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-orange-900'
              }`}
            >
              Uji Akses: User Biasa (Non-Admin)
            </button>
          </div>

          <div className="solana-wallet-btn-wrapper">
            <WalletMultiButton className="!bg-orange-600 hover:!bg-orange-700 !rounded-xl !h-10 !text-xs !font-extrabold !px-4 !text-white" />
          </div>
        </div>
      </div>

      {/* Active Signer Banner */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-orange-200 bg-orange-50/40 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-orange-600" />
          <span className="font-semibold text-slate-600">
            Active Signer Wallet ({activeValidatorRole}):
          </span>
          <code className="rounded border border-orange-200 bg-white px-2 py-0.5 font-mono text-orange-700 font-bold">
            {effectiveSignerWallet}
          </code>
        </div>

        <button
          onClick={() => setShowContractCode(!showContractCode)}
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-orange-700 hover:text-orange-800"
        >
          <Code2 className="h-4 w-4" />
          <span>
            {showContractCode
              ? 'Tutup Spesifikasi Smart Contract Anchor'
              : 'Lihat Struktur Smart Contract Solana (SkpiRecord)'}
          </span>
        </button>
      </div>

      {/* Inspector Kode Smart Contract Rust / Anchor */}
      {showContractCode && activeSub && (
        <div className="mb-6 rounded-2xl border-2 border-orange-300 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-orange-700">
                programs/skpitrace/src/lib.rs — Solana Anchor Smart Contract (Devnet)
              </h3>
              <p className="text-xs text-slate-600">
                Aturan validasi on-chain: skor integritas &ge; 80, total_skpi_points &ge; 100,
                document_sha256_hash.len() == 64, validator_wallets.len() &ge; 2
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-slate-500">Program ID: {SOLANA_PROGRAM_ID}</span>
          </div>
          <pre className="overflow-x-auto rounded-xl border border-orange-200 bg-orange-50/40 p-4 font-mono text-xs text-slate-800 leading-relaxed">
{`#[account]
pub struct SkpiRecord {
    pub skpi_id: String,                   // Contoh: "${activeSub.skpi_id}"
    pub document_sha256_hash: String,      // "${activeSub.sha256_hash}"
    pub integrity_score: u8,               // ${activeSub.ai_integrity_score} (Wajib >= 80)
    pub total_skpi_points: u16,            // ${activeSub.total_points} (Wajib >= 100)
    pub approval_timestamp: i64,           // ${activeSub.approval_timestamp}
    pub validator_wallets: Vec<Pubkey>,    // [${activeSub.kaprodi_wallet ? `"${activeSub.kaprodi_wallet.slice(0,12)}..."` : ''}${activeSub.admin_wallet ? `, "${activeSub.admin_wallet.slice(0,12)}..."` : ''}]
    pub is_valid_for_yudisium: bool,       // ${activeSub.status === 'VERIFIED_ONCHAIN'}
}`}
          </pre>
        </div>
      )}

      {actionFeedback && (
        <div
          className={`mb-6 flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-xs sm:text-sm font-bold ${
            actionFeedback.type === 'success'
              ? 'border-orange-500 bg-orange-50 text-orange-900'
              : 'border-orange-800 bg-orange-100 text-orange-950'
          }`}
        >
          {actionFeedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-orange-600 shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 text-orange-900 shrink-0" />
          )}
          <span>{actionFeedback.text}</span>
        </div>
      )}

      {/* Proteksi Keamanan 1: Mengakses halaman admin tanpa role admin -> Ditolak */}
      {isUnauthorizedRole ? (
        <div className="rounded-2xl border-2 border-orange-800 bg-orange-50/50 p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-900 text-white shadow-sm">
            <Lock className="h-7 w-7" />
          </div>
          <span className="inline-flex items-center rounded-full bg-orange-900 px-3 py-0.5 font-mono text-xs font-extrabold text-white">
            403 FORBIDDEN — UNAUTHORIZED ROLE
          </span>
          <h2 className="mt-3 text-xl font-extrabold text-slate-900">
            Akses Ditolak: Anda Tidak Memiliki Role Validator Akademik
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-xs sm:text-sm text-slate-700 leading-relaxed">
            Halaman ini dilindungi kontrol akses berbasis peran (<em>Role-Based Access Control</em>).
            User biasa atau wallet yang tidak terdaftar di dalam registri{' '}
            <code className="rounded border border-orange-300 bg-white px-1.5 py-0.5 font-mono text-orange-900">
              PENCATAT_RESMI
            </code>{' '}
            ditolak untuk mengakses antrean pengesahan SKPI maupun mengirim transaksi Multi-Signature.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setActiveValidatorRole('KAPRODI')}
              className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-orange-700 transition"
            >
              Beralih ke Role Kaprodi (Terotorisasi)
            </button>
            <Link
              to="/"
              className="rounded-xl border border-orange-300 bg-white px-4 py-2 text-xs font-extrabold text-orange-800 hover:bg-orange-50 transition"
            >
              Kembali ke Portal Publik
            </Link>
          </div>
        </div>
      ) : isInvalidUrlId ? (
        /* Proteksi Keamanan 2: Mengubah ID di URL -> Akses ditolak */
        <div className="rounded-2xl border-2 border-orange-800 bg-orange-50/50 p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-900 text-white shadow-sm">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <span className="inline-flex items-center rounded-full bg-orange-900 px-3 py-0.5 font-mono text-xs font-extrabold text-white">
            403 / 404 — ID DOKUMEN TIDAK VALID
          </span>
          <h2 className="mt-3 text-xl font-extrabold text-slate-900">
            Akses Ditolak: ID Dokumen SKPI &ldquo;{requestedIdFromUrl}&rdquo; Tidak Terdaftar
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-xs sm:text-sm text-slate-700 leading-relaxed">
            Parameter ID dokumen di URL telah diubah atau tidak ditemukan dalam registri pengajuan
            program studi Anda. Sistem menolak akses untuk mencegah manipulasi referensi objek langsung
            (<em>IDOR Prevention</em>).
          </p>
          <div className="mt-5 flex justify-center">
            <Link
              to="/validator/dashboard"
              className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-orange-700 transition"
            >
              Kembali ke Antrean Validator Resmi
            </Link>
          </div>
        </div>
      ) : !activeSub || !activeStudent || submissions.length === 0 ? (
        /* Empty State: Saat data pengajuan belum tersedia */
        <div className="rounded-2xl border-2 border-dashed border-orange-200 bg-white p-10 text-center shadow-sm">
          <FileCheck2 className="mx-auto mb-3 h-10 w-10 text-orange-400" />
          <h2 className="text-base font-extrabold text-slate-900">
            Belum Ada Data Pengajuan SKPI di Antrean
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
            Saat ini belum ada berkas portofolio mahasiswa yang diajukan untuk diverifikasi. Silakan
            tambahkan data mahasiswa atau sertifikat melalui menu Portofolio Mahasiswa.
          </p>
        </div>
      ) : (
      /* Main Grid: Tabel Antrean Pengajuan SKPI & Panel Detail Pemeriksaan + Multi-Sig */
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tabel Antrean Verifikasi */}
        <div className="lg:col-span-5 rounded-2xl border-2 border-orange-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-orange-100 pb-3">
            <h2 className="text-base font-extrabold text-slate-900">
              Antrean Pengajuan SKPI Mahasiswa
            </h2>
            <span className="rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-xs font-bold text-orange-700">
              {submissions.length} Pengajuan
            </span>
          </div>

          <div className="space-y-3">
            {submissions.map((sub) => {
              const stu = students.find((s) => s.id === sub.student_id)!;
              const isSelected = sub.skpi_id === activeSub.skpi_id;
              const isDocSafe = sub.ai_integrity_score >= 80;
              const sigCount = [sub.kaprodi_wallet, sub.admin_wallet].filter(Boolean).length;

              return (
                <div
                  key={sub.skpi_id}
                  onClick={() => {
                    setSelectedSkpiId(sub.skpi_id);
                    setActionFeedback(null);
                  }}
                  className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                    isSelected
                      ? 'border-orange-600 bg-orange-50/40 shadow-sm'
                      : 'border-orange-100 bg-white hover:border-orange-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900">{stu.full_name}</span>
                        <span className="font-mono text-xs font-bold text-orange-600">{stu.nim}</span>
                      </div>
                      <p className="font-mono text-[11px] text-slate-500 mt-0.5">{sub.skpi_id}</p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-extrabold ${
                        sub.status === 'VERIFIED_ONCHAIN'
                          ? 'bg-orange-600 text-white'
                          : 'bg-orange-100 text-orange-800 border border-orange-300'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </div>

                  {/* Badge Indikator Integritas & Poin */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-extrabold ${
                        isDocSafe
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : 'bg-orange-900 text-white'
                      }`}
                    >
                      {isDocSafe ? (
                        <ShieldCheck className="h-3.5 w-3.5" />
                      ) : (
                        <ShieldAlert className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {isDocSafe
                          ? `Aman >= 80% (${sub.ai_integrity_score}%)`
                          : `Perlu Cek Fisik < 80% (${sub.ai_integrity_score}%)`}
                      </span>
                    </span>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-mono font-extrabold text-slate-900">
                        {sub.total_points} Poin
                      </span>
                      <span className="font-mono text-slate-500">
                        Multi-Sig: <strong className="text-orange-700">{sigCount}/2</strong>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel Detail Pemeriksaan Berkas & Penandatanganan Multi-Sig */}
        <div className="lg:col-span-7 rounded-2xl border-2 border-orange-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-orange-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-extrabold text-orange-600">
                  {activeSub.skpi_id}
                </span>
                <span className="text-orange-300">&bull;</span>
                <span className="text-xs font-medium text-slate-500">{activeStudent.prodi}</span>
              </div>
              <h2 className="mt-1 text-xl font-extrabold text-slate-900">
                {activeStudent.full_name} ({activeStudent.nim})
              </h2>
            </div>

            <button
              onClick={handleDownloadPreviewPdf}
              className="flex items-center gap-1.5 rounded-xl border-2 border-orange-200 bg-orange-50/50 px-3.5 py-2 text-xs font-extrabold text-orange-700 hover:bg-orange-100 transition"
            >
              <Eye className="h-4 w-4 text-orange-600" />
              <span>Preview & Unduh PDF SKPI</span>
            </button>
          </div>

          {/* Penanganan Sengketa / Verifikasi Fisik Manual */}
          {activeSub.ai_integrity_score < 80 && (
            <div className="mt-5 rounded-xl border-2 border-orange-400 bg-orange-50 p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-orange-800 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-xs sm:text-sm font-extrabold text-orange-950">
                    Peringatan Anomali Struktur Dokumen ({activeSub.ai_integrity_score}% &lt; 80%) —
                    Verifikasi Bukti Fisik Manual
                  </h3>
                  <p className="mt-1 text-xs text-orange-900 leading-relaxed">
                    Smart Contract Solana Devnet menolak pengajuan dengan skor integritas &lt; 80% (
                    <code>SkpiError::DocumentTamperingSuspected</code>). Validator berwenang meloloskan dokumen secara
                    manual apabila mahasiswa telah menunjukkan bukti sertifikat fisik asli.
                  </p>
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={overrideNote}
                      onChange={(e) => setOverrideNote(e.target.value)}
                      className="flex-1 rounded-xl border border-orange-300 bg-white px-3 py-1.5 text-xs text-slate-900"
                    />
                    <button
                      onClick={handleOverrideLowScore}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-orange-600 px-3.5 py-1.5 text-xs font-extrabold text-white hover:bg-orange-700 shrink-0"
                    >
                      <UserCheck className="h-4 w-4" />
                      <span>Validasi Bukti Fisik & Override Manual</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSub.human_override_approved && (
            <div className="mt-4 rounded-xl border border-orange-300 bg-orange-50 p-3 text-xs font-medium text-orange-900">
              <strong>Override Fisik Terverifikasi:</strong> {activeSub.human_override_note}
            </div>
          )}

          {/* Rincian Sertifikat yang Diajukan */}
          <div className="mt-5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2.5">
              Rincian Berkas Sertifikat & Skor Integritas ({activeCerts.length} Sertifikat — Total{' '}
              {activeSub.total_points} Poin)
            </h3>
            <div className="space-y-2">
              {activeCerts.map((cert) => (
                <div
                  key={cert.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-orange-200 bg-orange-50/20 p-3 text-xs"
                >
                  <div>
                    <div className="font-extrabold text-slate-900">{cert.activity_name}</div>
                    <div className="font-mono text-[11px] text-slate-500">
                      {cert.cert_number} &bull; {cert.level} &bull; {cert.role}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[11px] font-extrabold ${
                        cert.ai_ela_score >= 80
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : 'bg-orange-900 text-white'
                      }`}
                    >
                      Integritas: {cert.ai_ela_score}%
                    </span>
                    <span className="rounded bg-orange-600 px-2 py-0.5 font-mono font-extrabold text-white">
                      +{cert.points} Poin
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SHA-256 Hash Dokumen PDF Final */}
          <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50/40 p-4">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
              SHA-256 Cryptographic Hash PDF SKPI Final (64 Karakter Hex)
            </div>
            <div className="mt-1.5 break-all rounded-lg border border-orange-200 bg-white p-2.5 font-mono text-xs font-bold text-orange-700">
              {activeSub.sha256_hash}
            </div>
          </div>

          {/* Tahapan Multi-Signature On-Chain Recording (Sign 1 Kaprodi & Sign 2 Admin) */}
          <div className="mt-5 rounded-xl border-2 border-orange-100 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <KeyRound className="h-4 w-4 text-orange-600" />
                <span>Konsensus Akademik Multi-Signature (Solana Devnet)</span>
              </h3>
              {(activeSub.kaprodi_wallet || activeSub.status === 'VERIFIED_ONCHAIN') && (
                <button
                  type="button"
                  onClick={async () => {
                    await resetSubmissionForDemo(activeSub.skpi_id);
                    setActionFeedback({
                      type: 'success',
                      text: `Status ${activeSub.skpi_id} di-reset ke PENDING. Silakan klik Sign 1 (Kaprodi) lalu Sign 2 (Admin) untuk mendemokan alur Multi-Signature!`,
                    });
                  }}
                  className="rounded-lg border border-orange-300 bg-orange-50 px-2.5 py-1 text-[11px] font-extrabold text-orange-800 hover:bg-orange-100 transition"
                >
                  Uji Ulang Multi-Sig (Reset ke PENDING)
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {/* Box Sign 1 Kaprodi */}
              <div
                className={`rounded-xl border p-3.5 ${
                  activeSub.kaprodi_wallet
                    ? 'border-orange-400 bg-orange-50/50'
                    : 'border-orange-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold text-slate-900">1. Sign 1: Kaprodi</span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      activeSub.kaprodi_wallet
                        ? 'bg-orange-600 text-white'
                        : 'bg-orange-100 text-orange-800'
                    }`}
                  >
                    {activeSub.kaprodi_wallet ? 'SIGNED' : 'WAITING'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Validasi substansi akademik & bobot poin kredit SKPI (&ge; 100 Poin).
                </p>
                <div className="mt-2 font-mono text-[10px] font-bold text-orange-700 truncate">
                  {activeSub.kaprodi_wallet || `Default: ${DEFAULT_KAPRODI_WALLET.slice(0, 20)}...`}
                </div>
              </div>

              {/* Box Sign 2 Admin Akademik */}
              <div
                className={`rounded-xl border p-3.5 ${
                  activeSub.admin_wallet
                    ? 'border-orange-400 bg-orange-50/50'
                    : 'border-orange-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold text-slate-900">
                    2. Sign 2: Admin Akademik Fakultas
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      activeSub.admin_wallet
                        ? 'bg-orange-600 text-white'
                        : 'bg-orange-100 text-orange-800'
                    }`}
                  >
                    {activeSub.admin_wallet ? 'LOCKED ON-CHAIN' : 'WAITING'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Pengesahan final & pencatatan SHA-256 Hash ke Smart Contract Solana Devnet.
                </p>
                <div className="mt-2 font-mono text-[10px] font-bold text-orange-700 truncate">
                  {activeSub.admin_wallet || `Default: ${DEFAULT_ADMIN_WALLET.slice(0, 20)}...`}
                </div>
              </div>
            </div>

            {/* Tombol Eksekusi Transaksi Berdasarkan Peran / Status */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleSign1Kaprodi}
                disabled={isSigning || Boolean(activeSub.kaprodi_wallet)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${
                  activeSub.kaprodi_wallet
                    ? 'cursor-not-allowed bg-orange-100 text-orange-400'
                    : 'bg-orange-600 text-white hover:bg-orange-700 shadow-sm'
                }`}
              >
                <CheckSquare className="h-4 w-4" />
                <span>
                  {activeSub.kaprodi_wallet
                    ? 'Sign 1 (Kaprodi) Selesai'
                    : 'Sign 1: Setujui Poin (Wallet Kaprodi)'}
                </span>
              </button>

              <button
                onClick={handleSign2Admin}
                disabled={
                  isSigning ||
                  !activeSub.kaprodi_wallet ||
                  activeSub.status === 'VERIFIED_ONCHAIN'
                }
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${
                  !activeSub.kaprodi_wallet || activeSub.status === 'VERIFIED_ONCHAIN'
                    ? 'cursor-not-allowed bg-orange-100 text-orange-400'
                    : 'bg-orange-600 text-white hover:bg-orange-700 shadow-sm'
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>
                  {activeSub.status === 'VERIFIED_ONCHAIN'
                    ? 'Sign 2 Selesai (Tercatat di Solana Devnet)'
                    : 'Sign 2 & Kunci ke Solana Devnet (Admin)'}
                </span>
              </button>

              {activeSub.status !== 'VERIFIED_ONCHAIN' && (
                <button
                  onClick={() => {
                    rejectSubmission(activeSub.skpi_id, 'Ditolak oleh validator.');
                    setActionFeedback({
                      type: 'error',
                      text: `Pengajuan ${activeSub.skpi_id} telah ditandai REJECTED.`,
                    });
                  }}
                  className="rounded-xl border-2 border-orange-300 bg-white px-3.5 py-2.5 text-xs font-extrabold text-orange-800 hover:bg-orange-50 transition"
                >
                  Tolak
                </button>
              )}
            </div>

            {activeOnChain && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-orange-100 pt-3 text-xs">
                <span className="font-mono font-bold text-orange-700">
                  Tx Signature: {activeOnChain.solana_tx_signature.slice(0, 32)}...
                </span>
                <a
                  href={`https://explorer.solana.com/tx/${activeOnChain.solana_tx_signature}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-orange-600 hover:underline"
                >
                  <span>Buka Solana Explorer (Devnet)</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
