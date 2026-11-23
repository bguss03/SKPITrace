import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  UploadCloud,
  QrCode,
  FileText,
  ExternalLink,
  Camera,
  Lock,
  KeyRound,
  Search,
  Award,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useSkpi, SOLANA_PROGRAM_ID } from '../context/SkpiContext';
import { computeFileSha256Hex } from '../utils/crypto';
import { QRCodeSVG } from 'qrcode.react';
import { TanyaAI } from '../components/TanyaAI';
import { CekKeaslianAI } from '../components/CekKeaslianAI';

interface VerificationOutcome {
  mode: 'PDF_UPLOAD' | 'QR_SCAN';
  fileName?: string;
  uploadedSha256: string;
  matchedSkpiId: string;
  isValid: boolean;
  reason: string;
  tamperedDiffDetected: boolean;
}

export const PublicVerificationPage: React.FC = () => {
  const {
    students,
    submissions,
    certificates,
    onChainRecords,
  } = useSkpi();

  const [isDragging, setIsDragging] = useState(false);
  const [isHashing, setIsHashing] = useState(false);
  const [selectedSkpiId, setSelectedSkpiId] = useState<string>('SKPI-FTIK-2026-0053');
  const [outcome, setOutcome] = useState<VerificationOutcome | null>(null);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [qrInputManual, setQrInputManual] = useState('SKPI-FTIK-2026-0053');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleVerifyUploadedFile = async (file: File) => {
    setIsHashing(true);
    try {
      const uploadedHash = await computeFileSha256Hex(file);

      const exactMatchRecord = Object.values(onChainRecords).find(
        (rec) => rec.document_sha256_hash.toLowerCase() === uploadedHash.toLowerCase()
      );

      if (exactMatchRecord) {
        setSelectedSkpiId(exactMatchRecord.skpi_id);
        const validPoints = exactMatchRecord.total_skpi_points >= 100;
        const validScore = exactMatchRecord.ai_integrity_score >= 80;
        const validSigs = exactMatchRecord.validator_wallets.length >= 2;

        setOutcome({
          mode: 'PDF_UPLOAD',
          fileName: file.name,
          uploadedSha256: uploadedHash,
          matchedSkpiId: exactMatchRecord.skpi_id,
          isValid: validPoints && validScore && validSigs && exactMatchRecord.is_valid_for_yudisium,
          reason:
            'SHA-256 Hash file PDF 100% IDENTIK dengan catatan Smart Contract Solana Devnet. Memenuhi syarat poin >= 100 dan 2 Signature Validator Sah.',
          tamperedDiffDetected: false,
        });
      } else {
        const detectedId =
          Object.keys(onChainRecords).find((id) =>
            file.name.toUpperCase().includes(id.toUpperCase())
          ) || selectedSkpiId;

        setSelectedSkpiId(detectedId);
        setOutcome({
          mode: 'PDF_UPLOAD',
          fileName: file.name,
          uploadedSha256: uploadedHash,
          matchedSkpiId: detectedId,
          isValid: false,
          reason:
            'HASH MISMATCH TERDETEKSI! File PDF ini telah dimodifikasi (berbeda minimal 1 karakter/piksel/byte) dari dokumen resmi yang dikunci di Solana Devnet.',
          tamperedDiffDetected: true,
        });
      }
    } finally {
      setIsHashing(false);
    }
  };

  const handleVerifyByQrCode = (rawQrValue: string) => {
    let parsedSkpiId = rawQrValue.trim();
    try {
      const parsed = JSON.parse(rawQrValue);
      if (parsed.skpi_id) parsedSkpiId = parsed.skpi_id;
    } catch {
      // Gunakan string langsung jika bukan JSON
    }

    const onChainRec = onChainRecords[parsedSkpiId];
    if (onChainRec) {
      setSelectedSkpiId(parsedSkpiId);
      setOutcome({
        mode: 'QR_SCAN',
        fileName: `QR Scan: ${parsedSkpiId}`,
        uploadedSha256: onChainRec.document_sha256_hash,
        matchedSkpiId: parsedSkpiId,
        isValid:
          onChainRec.is_valid_for_yudisium &&
          onChainRec.total_skpi_points >= 100 &&
          onChainRec.validator_wallets.length >= 2,
        reason:
          'QR Code Terverifikasi! Data ditarik langsung dari state SkpiRecord pada jaringan Solana Devnet.',
        tamperedDiffDetected: false,
      });
    } else {
      setOutcome({
        mode: 'QR_SCAN',
        fileName: `QR Scan: ${parsedSkpiId}`,
        uploadedSha256: 'TIDAK_DITEMUKAN_DI_BLOCKCHAIN',
        matchedSkpiId: parsedSkpiId,
        isValid: false,
        reason: `ID SKPI "${parsedSkpiId}" belum terdaftar atau belum disahkan pada Smart Contract Solana Devnet.`,
        tamperedDiffDetected: true,
      });
    }
  };

  const startCameraScanner = async () => {
    setCameraError(null);
    setQrScannerOpen(true);
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode('qr-reader-container');
        scannerRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            html5QrCode.stop().catch(() => {});
            setQrScannerOpen(false);
            handleVerifyByQrCode(decodedText);
          },
          () => {}
        );
      } catch {
        setCameraError(
          'Kamera tidak dapat diakses pada perangkat ini. Gunakan pemindai QR instan di bawah untuk menguji payload QR SKPI.'
        );
      }
    }, 150);
  };

  const stopCameraScanner = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().catch(() => {});
    }
    setQrScannerOpen(false);
  };

  const activeRecord = outcome ? onChainRecords[outcome.matchedSkpiId] : onChainRecords[selectedSkpiId];
  const activeSubmission = submissions.find(
    (s) => s.skpi_id === (outcome ? outcome.matchedSkpiId : selectedSkpiId)
  );
  const activeStudent = students.find((s) => s.id === activeSubmission?.student_id);
  const activeCerts = certificates.filter((c) => c.student_id === activeStudent?.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Hero Banner */}
      <div className="mb-8 rounded-2xl border-2 border-orange-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-300 bg-orange-50 px-3.5 py-1 text-xs font-extrabold text-orange-700">
            <Award className="h-3.5 w-3.5" />
            <span>PORTAL PANITIA YUDISIUM & VERIFIKASI PUBLIK</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Verifikasi Keaslian SKPI dalam{' '}
            <span className="text-orange-600 underline decoration-orange-300 decoration-4 underline-offset-4">
              Hitungan Detik
            </span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
            Unggah file PDF SKPI yang dikumpulkan mahasiswa atau pindai kode QR. Sistem menghitung ulang{' '}
            <code className="rounded border border-orange-200 bg-orange-50 px-1.5 py-0.5 font-mono text-xs font-bold text-orange-700">
              SHA-256 Cryptographic Hash
            </code>{' '}
            secara langsung di browser dan mencocokkannya dengan catatan{' '}
            <code className="rounded border border-orange-200 bg-orange-50 px-1.5 py-0.5 font-mono text-xs font-bold text-orange-700">
              SkpiRecord
            </code>{' '}
            di jaringan <strong>Solana Devnet</strong>.
          </p>
        </div>
      </div>

      {/* Main Verification Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload Dropzone & QR Scanner */}
        <div className="lg:col-span-5 space-y-6">
          {/* Dropzone Unggah File PDF */}
          <div className="rounded-2xl border-2 border-orange-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-orange-600" />
                <span>Verifikasi via Upload PDF SKPI</span>
              </h2>
              <span className="font-mono text-[11px] font-bold text-orange-700">SHA-256 Lokal</span>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleVerifyUploadedFile(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                isDragging
                  ? 'border-orange-600 bg-orange-50'
                  : 'border-orange-300 bg-orange-50/30 hover:border-orange-500 hover:bg-orange-50/70'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleVerifyUploadedFile(file);
                  e.target.value = '';
                }}
              />
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                <UploadCloud className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-slate-900">
                Klik atau seret file PDF SKPI mahasiswa ke sini
              </p>
              <p className="mt-1 text-xs text-slate-500">
                File dihitung nilai SHA-256 secara lokal tanpa diunggah ke server pihak ketiga
              </p>
              {isHashing && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">
                  <span className="h-2 w-2 animate-ping rounded-full bg-orange-600" />
                  Menghitung SHA-256 & Memeriksa Solana Devnet...
                </div>
              )}
            </div>
          </div>

          {/* Scan QR Code */}
          <div className="rounded-2xl border-2 border-orange-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <QrCode className="h-4 w-4 text-orange-600" />
                <span>Verifikasi via Scan QR Code</span>
              </h2>
              {!qrScannerOpen ? (
                <button
                  onClick={startCameraScanner}
                  className="flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700 hover:bg-orange-100 transition"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Buka Kamera QR</span>
                </button>
              ) : (
                <button
                  onClick={stopCameraScanner}
                  className="rounded-xl bg-orange-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-700"
                >
                  Tutup Kamera
                </button>
              )}
            </div>

            {qrScannerOpen && (
              <div className="mb-4 overflow-hidden rounded-xl border border-orange-200 bg-orange-50/40 p-3">
                <div id="qr-reader-container" className="mx-auto max-w-xs" />
                {cameraError && (
                  <p className="mt-2 text-xs text-orange-800 bg-orange-100 border border-orange-300 rounded-lg p-2.5">
                    {cameraError}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-4 rounded-xl border border-orange-200 bg-orange-50/30 p-3.5">
              <div className="rounded-lg border border-orange-200 bg-white p-2 shrink-0">
                <QRCodeSVG
                  value={JSON.stringify({
                    skpi_id: selectedSkpiId,
                    network: 'solana-devnet',
                  })}
                  size={74}
                />
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pindai / Masukkan ID QR Dokumen SKPI:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={qrInputManual}
                    onChange={(e) => setQrInputManual(e.target.value)}
                    placeholder="Contoh: SKPI-FTIK-2026-0053"
                    className="w-full rounded-xl border border-orange-200 bg-white px-3 py-1.5 font-mono text-xs font-semibold text-slate-900 focus:border-orange-600 focus:outline-none"
                  />
                  <button
                    onClick={() => handleVerifyByQrCode(qrInputManual)}
                    className="flex items-center gap-1 rounded-xl bg-orange-600 px-3.5 py-1.5 text-xs font-extrabold text-white hover:bg-orange-700 transition shrink-0"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>Cek QR</span>
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Klik &ldquo;Cek QR&rdquo; untuk menarik data transaksi dari Solana Devnet.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Indikator Hasil Verifikasi */}
        <div className="lg:col-span-7">
          {!outcome ? (
            <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orange-200 bg-white p-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 border border-orange-200">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Siap Memverifikasi Dokumen SKPI Mahasiswa
              </h3>
              <p className="mt-2 max-w-md text-xs sm:text-sm text-slate-600 leading-relaxed">
                Unggah file PDF SKPI pada area di samping atau masukkan kode QR dokumen untuk
                memeriksa pembuktian kriptografi SHA-256 secara langsung di jaringan Solana Devnet.
              </p>
            </div>
          ) : (
            <div
              className={`rounded-2xl border-2 p-6 shadow-sm transition-all bg-white ${
                outcome.isValid
                  ? 'border-orange-500'
                  : 'border-orange-800 bg-orange-50/30'
              }`}
            >
              {/* Status Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-orange-100 pb-5">
                <div className="flex items-start gap-3.5">
                  {outcome.isValid ? (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white shadow-sm">
                      <ShieldCheck className="h-7 w-7 stroke-[2.2]" />
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-900 text-white shadow-sm">
                      <ShieldAlert className="h-7 w-7 stroke-[2.2]" />
                    </div>
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-extrabold uppercase tracking-wider ${
                          outcome.isValid
                            ? 'bg-orange-600 text-white'
                            : 'bg-orange-900 text-white'
                        }`}
                      >
                        {outcome.isValid
                          ? 'STATUS VALID — 100% IDENTIK ON-CHAIN'
                          : 'STATUS TAMPERED / INVALID — HASH MISMATCH'}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-600">
                        {outcome.matchedSkpiId}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs sm:text-sm font-semibold text-slate-800">
                      {outcome.reason}
                    </p>
                  </div>
                </div>
              </div>

              {/* Perbandingan SHA-256 Hash */}
              <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50/40 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-orange-600" />
                    Perbandingan Kriptografi SHA-256 Hash (64 Karakter Hex)
                  </span>
                  <span
                    className={`font-mono text-xs font-extrabold px-2 py-0.5 rounded ${
                      outcome.isValid
                        ? 'bg-orange-600 text-white'
                        : 'bg-orange-900 text-white'
                    }`}
                  >
                    {outcome.isValid ? 'MATCH (100% IDENTICAL)' : 'MISMATCH (FILE ALTERED)'}
                  </span>
                </div>

                <div className="space-y-2.5 font-mono text-xs">
                  <div className="rounded-lg border border-orange-200 bg-white p-2.5">
                    <div className="text-[10px] font-sans font-semibold text-slate-500 mb-1">
                      1. SHA-256 File PDF yang Diunggah ({outcome.fileName}):
                    </div>
                    <div className="break-all font-bold text-orange-700">
                      {outcome.uploadedSha256}
                    </div>
                  </div>

                  <div className="rounded-lg border border-orange-200 bg-white p-2.5">
                    <div className="text-[10px] font-sans font-semibold text-slate-500 mb-1">
                      2. SHA-256 Tercatat pada Smart Contract Solana Devnet (
                      <code>document_sha256_hash</code>):
                    </div>
                    <div className="break-all font-bold text-slate-900">
                      {activeRecord?.document_sha256_hash || 'BELUM_TERCATAT_ONCHAIN'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ringkasan Mahasiswa & Parameter Validasi On-Chain */}
              {activeStudent && activeSubmission && (
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-orange-200 bg-white p-3.5">
                    <div className="text-[11px] font-semibold text-slate-500">Mahasiswa Pemegang SKPI</div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">
                      {activeStudent.full_name}
                    </div>
                    <div className="font-mono text-xs font-bold text-orange-600">{activeStudent.nim}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">{activeStudent.prodi}</div>
                  </div>

                  <div className="rounded-xl border border-orange-200 bg-white p-3.5">
                    <div className="text-[11px] font-semibold text-slate-500">Total Poin & Skor Audit</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-lg font-extrabold text-slate-900">
                        {activeSubmission.total_points} Poin
                      </span>
                      <span className="text-[11px] text-orange-600 font-bold">
                        (Syarat &ge; 100)
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      Skor Integritas Dokumen:{' '}
                      <strong className="text-orange-700">
                        {activeSubmission.ai_integrity_score}%
                      </strong>{' '}
                      (&ge; 80%)
                    </div>
                  </div>

                  <div className="rounded-xl border border-orange-200 bg-white p-3.5">
                    <div className="text-[11px] font-semibold text-slate-500">Konsensus Multi-Sig</div>
                    <div className="mt-1 flex items-center gap-1.5 text-sm font-extrabold text-orange-700">
                      <KeyRound className="h-4 w-4" />
                      <span>
                        {activeRecord?.validator_wallets.length || 0} / 2 Validator Sah
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      Status Yudisium:{' '}
                      {outcome.isValid ? (
                        <strong className="text-orange-600">LAYAK YUDISIUM</strong>
                      ) : (
                        <strong className="text-orange-900">DITOLAK / INVALID</strong>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Daftar Wallet Pengesah (Kaprodi & Admin Akademik) & Link Solana Explorer */}
              {activeRecord && (
                <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50/30 p-4">
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-slate-900">
                      Bukti Multi-Signature Validator & Akun PDA Solana Devnet
                    </span>
                    <a
                      href={`https://explorer.solana.com/tx/${activeRecord.solana_tx_signature}?cluster=devnet`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1 text-xs font-bold text-white hover:bg-orange-700 transition"
                    >
                      <span>Lihat di Solana Explorer</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded border border-orange-100 bg-white px-3 py-1.5">
                      <span className="text-slate-500 font-sans font-semibold">Sign 1 (Wallet Kaprodi):</span>
                      <span className="text-orange-700 font-bold break-all">
                        {activeRecord.validator_wallets[0]}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded border border-orange-100 bg-white px-3 py-1.5">
                      <span className="text-slate-500 font-sans font-semibold">Sign 2 (Wallet Admin Akademik):</span>
                      <span className="text-orange-700 font-bold break-all">
                        {activeRecord.validator_wallets[1]}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded border border-orange-100 bg-white px-3 py-1.5">
                      <span className="text-slate-500 font-sans font-semibold">Program ID / PDA Account:</span>
                      <span className="text-slate-800 font-semibold break-all">
                        {SOLANA_PROGRAM_ID.slice(0, 20)}... / {activeRecord.pda_address.slice(0, 20)}
                        ...
                      </span>
                    </div>
                  </div>

                  {activeCerts.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-orange-200">
                      <div className="text-[11px] font-bold text-slate-700 mb-1.5">
                        Rincian Sertifikat Terverifikasi ({activeCerts.length} Berkas):
                      </div>
                      <div className="space-y-1">
                        {activeCerts.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between text-xs bg-white border border-orange-100 rounded px-2.5 py-1.5"
                          >
                            <span className="text-slate-800 font-medium truncate pr-2">
                              {c.activity_name}{' '}
                              <span className="font-mono text-[10px] text-slate-500">
                                ({c.cert_number})
                              </span>
                            </span>
                            <span className="font-mono text-orange-600 font-extrabold shrink-0">
                              +{c.points} Poin
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bagian Pusat Informasi Pedoman & Pemeriksa Bukti On-Chain */}
      <div className="mt-10 border-t-2 border-orange-100 pt-8">
        <div className="mb-5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-300 bg-orange-50 px-3 py-1 text-xs font-extrabold text-orange-700">
            <span>PUSAT REGULASI & AUDIT TRANSAKSI ON-CHAIN</span>
          </span>
          <h2 className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-900">
            Pedoman Verifikasi SKPI & Inspektor Bukti On-Chain
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Gunakan panel di bawah ini untuk mencari ketentuan pedoman akademik SKPI FTIK USM atau memeriksa status pencatatan hash dokumen secara langsung di jaringan Solana Devnet.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TanyaAI endpoint="/api/tanya-rag" />
          <CekKeaslianAI />
        </div>
      </div>
    </div>
  );
};
