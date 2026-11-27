import React, { useState } from 'react';
import {
  GraduationCap,
  CheckCircle2,
  Download,
  FileCheck,
  Award,
  ShieldAlert,
  ShieldCheck,
  PlusCircle,
  UserPlus,
  Trash2,
  X,
  FileSearch,
} from 'lucide-react';
import { useSkpi } from '../context/SkpiContext';
import {
  ActivityCategory,
  ActivityLevel,
  ActivityRole,
  AiPreScreeningResult,
} from '../types/skpi';
import { calculateSkpiPoints, runAiPreScreening } from '../utils/aiScreening';
import { downloadPdfFile } from '../utils/pdfGenerator';

export const StudentDashboardPage: React.FC = () => {
  const {
    students,
    certificates,
    submissions,
    activeStudentId,
    setActiveStudentId,
    addStudent,
    addCertificate,
    deleteCertificate,
    generateOfficialPdfForSubmission,
  } = useSkpi();

  const activeStudent = students.find((s) => s.id === activeStudentId) || students[0];
  const studentCerts = certificates.filter((c) => c.student_id === activeStudent.id);
  const studentSub =
    submissions.find((s) => s.student_id === activeStudent.id) || submissions[0];

  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [newNim, setNewNim] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newProdi, setNewProdi] = useState('S1 Sistem Informasi - FTIK USM');
  const [newAngkatan, setNewAngkatan] = useState('2024');
  const [newWallet, setNewWallet] = useState('');
  const [studentFormError, setStudentFormError] = useState<string | null>(null);

  const [certNumber, setCertNumber] = useState('');
  const [activityName, setActivityName] = useState('');
  const [category, setCategory] = useState<ActivityCategory>('Pelatihan & Seminar');
  const [level, setLevel] = useState<ActivityLevel>('Nasional');
  const [role, setRole] = useState<ActivityRole>('Peserta / Partisipan');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const [isScreening, setIsScreening] = useState(false);
  const [screeningResult, setScreeningResult] = useState<AiPreScreeningResult | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const estimatedPoints = calculateSkpiPoints(category, level, role);
  const progressPercent = Math.min(100, Math.round((studentSub.total_points / 100) * 100));

  const handleCreateNewStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentFormError(null);
    const res = await addStudent({
      nim: newNim,
      full_name: newFullName,
      prodi: newProdi,
      angkatan: newAngkatan,
      wallet_address: newWallet,
    });
    if (!res.success) {
      setStudentFormError(res.message);
      return;
    }
    setNewNim('');
    setNewFullName('');
    setNewWallet('');
    setShowAddStudentForm(false);
    setScreeningResult(null);
    setToastMessage(res.message);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleRunPreScreening = async () => {
    setIsScreening(true);
    try {
      const result = await runAiPreScreening({
        file: uploadedFile,
        certNumberInput: certNumber,
        studentName: activeStudent.full_name,
        studentNim: activeStudent.nim,
        activityName,
        category,
        level,
        role,
        simulateTampering: false,
      });
      setScreeningResult(result);
    } finally {
      setIsScreening(false);
    }
  };

  const handleSubmitCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCertNo = certNumber.trim();
    const cleanActName = activityName.trim();
    if (!cleanCertNo || !cleanActName) {
      setToastMessage('Validasi Form: Nomor Surat Sertifikat dan Nama Kegiatan wajib diisi.');
      return;
    }
    if (
      /<script\b|javascript:|onerror=|onload=|private\s*key|seed\s*phrase/i.test(
        `${cleanCertNo} ${cleanActName}`
      )
    ) {
      setToastMessage(
        'Validasi Keamanan: Input ditolak karena mengandung skrip berbahaya atau kata kunci rahasia (private key/seed phrase).'
      );
      return;
    }

    let currentScreen = screeningResult;
    if (!currentScreen) {
      currentScreen = await runAiPreScreening({
        file: uploadedFile,
        certNumberInput: certNumber,
        studentName: activeStudent.full_name,
        studentNim: activeStudent.nim,
        activityName,
        category,
        level,
        role,
        simulateTampering: false,
      });
      setScreeningResult(currentScreen);
    }

    await addCertificate({
      student_id: activeStudent.id,
      cert_number: certNumber.trim(),
      activity_name: activityName.trim(),
      category,
      role,
      level,
      points: currentScreen.calculatedPoints,
      ai_ocr_matched: currentScreen.attendanceMatched || currentScreen.regexValid,
      ai_regex_valid: currentScreen.regexValid,
      ai_attendance_matched: currentScreen.attendanceMatched,
      ai_ela_score: currentScreen.integrityScore,
      ormawa_verified_by: currentScreen.matchedRoster?.organizer || 'Menunggu Verifikasi Ormawa',
      forensic_notes: currentScreen.forensicDetails.join(' | '),
    });

    setToastMessage(
      `Sertifikat "${activityName}" (+${currentScreen.calculatedPoints} Poin, Skor Integritas: ${currentScreen.integrityScore}%) berhasil ditambahkan ke portofolio SKPI!`
    );
    setCertNumber('');
    setActivityName('');
    setScreeningResult(null);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleDownloadSkpiPdf = async () => {
    const { pdfBytes, filename } = await generateOfficialPdfForSubmission(
      studentSub.skpi_id,
      false
    );
    downloadPdfFile(pdfBytes, filename);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Top Bar: Pilih Profil Mahasiswa */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border-2 border-orange-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-600 text-white shadow-sm">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">
              Dashboard Portofolio & Pengajuan SKPI Mahasiswa
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              Unggah sertifikat kegiatan, jalankan pemeriksaan struktur dokumen (OCR & ELA), dan unduh PDF SKPI
              resmi ber-QR Code.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="text-xs font-bold text-slate-700">Mahasiswa Aktif:</label>
          <select
            value={activeStudent.id}
            onChange={(e) => {
              setActiveStudentId(e.target.value);
              setScreeningResult(null);
            }}
            className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs sm:text-sm font-bold text-slate-900 focus:border-orange-600 focus:outline-none"
          >
            {students.map((stu) => {
              const sub = submissions.find((s) => s.student_id === stu.id);
              return (
                <option key={stu.id} value={stu.id}>
                  {stu.nim} — {stu.full_name} ({sub?.status})
                </option>
              );
            })}
          </select>

          <button
            type="button"
            onClick={() => {
              setShowAddStudentForm(!showAddStudentForm);
              setStudentFormError(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-orange-700 transition shadow-sm"
          >
            {showAddStudentForm ? (
              <>
                <X className="h-4 w-4" />
                <span>Tutup Form</span>
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                <span>+ Tambah Mahasiswa Baru</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Form Tambah Mahasiswa Baru */}
      {showAddStudentForm && (
        <div className="mb-6 rounded-2xl border-2 border-orange-300 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-orange-100 pb-3">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-orange-600" />
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                  Registrasi Data Mahasiswa Baru
                </h2>
                <p className="text-xs text-slate-600">
                  Mahasiswa yang ditambahkan akan otomatis memiliki akun portofolio SKPI sendiri dan masuk ke antrean Validator.
                </p>
              </div>
            </div>
          </div>

          {studentFormError && (
            <div className="mb-4 rounded-xl border border-orange-300 bg-orange-50 px-3.5 py-2.5 text-xs font-bold text-orange-900">
              {studentFormError}
            </div>
          )}

          <form onSubmit={handleCreateNewStudent} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                NIM Mahasiswa *
              </label>
              <input
                type="text"
                required
                value={newNim}
                onChange={(e) => setNewNim(e.target.value)}
                placeholder="Misal: G.231.24.0199"
                className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-orange-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Lengkap *
              </label>
              <input
                type="text"
                required
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="Misal: Rina Permata"
                className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-orange-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Program Studi
              </label>
              <select
                value={newProdi}
                onChange={(e) => setNewProdi(e.target.value)}
                className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-orange-600 focus:outline-none"
              >
                <option value="S1 Sistem Informasi - FTIK USM">
                  S1 Sistem Informasi - FTIK USM
                </option>
                <option value="S1 Teknik Informatika - FTIK USM">
                  S1 Teknik Informatika - FTIK USM
                </option>
                <option value="S1 Ilmu Komunikasi - FTIK USM">
                  S1 Ilmu Komunikasi - FTIK USM
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Angkatan
              </label>
              <input
                type="text"
                value={newAngkatan}
                onChange={(e) => setNewAngkatan(e.target.value)}
                placeholder="2024"
                className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-orange-600 focus:outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-orange-700 transition"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Simpan Mahasiswa</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {toastMessage && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border-2 border-orange-300 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-900">
          <CheckCircle2 className="h-5 w-5 text-orange-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Status Card & Progress Bar Poin SKPI */}
      <div className="mb-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 rounded-2xl border-2 border-orange-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-orange-700">
                Akumulasi Poin Kredit SKPI ({activeStudent.full_name} — {activeStudent.nim})
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">
                  {studentSub.total_points}
                </span>
                <span className="text-sm font-semibold text-slate-500">
                  / 100 Poin Minimum Yudisium
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                  studentSub.ai_integrity_score >= 80
                    ? 'bg-orange-50 text-orange-700 border border-orange-200'
                    : 'bg-orange-900 text-white'
                }`}
              >
                Skor Integritas Rata-rata: {studentSub.ai_integrity_score}%
              </span>
              <span
                className={`rounded-full px-3 py-1 font-mono text-xs font-extrabold ${
                  studentSub.status === 'VERIFIED_ONCHAIN'
                    ? 'bg-orange-600 text-white'
                    : 'bg-orange-100 text-orange-800 border border-orange-300'
                }`}
              >
                {studentSub.status}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-4 w-full overflow-hidden rounded-full bg-orange-50 p-0.5 border border-orange-200">
            <div
              className="h-full rounded-full bg-orange-600 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <span>
              ID Dokumen SKPI:{' '}
              <strong className="font-mono text-slate-900">{studentSub.skpi_id}</strong>
            </span>
            <span>
              SHA-256 Dokumen:{' '}
              <strong className="font-mono text-orange-700">
                {studentSub.sha256_hash.slice(0, 24)}...
              </strong>
            </span>
          </div>
        </div>

        {/* Unduh PDF SKPI Resmi Card */}
        <div className="lg:col-span-4 rounded-2xl border-2 border-orange-100 bg-white p-6 flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-orange-600" />
              <span>Dokumen PDF SKPI Resmi Ber-QR Code</span>
            </h3>
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
              Tombol unduh PDF SKPI resmi aktif setelah disahkan oleh Kaprodi (Sign 1) dan Admin
              Akademik (Sign 2) ke Solana Devnet.
            </p>
          </div>

          <div className="mt-4">
            <button
              disabled={studentSub.status !== 'VERIFIED_ONCHAIN'}
              onClick={handleDownloadSkpiPdf}
              className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${
                studentSub.status === 'VERIFIED_ONCHAIN'
                  ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-sm'
                  : 'cursor-not-allowed bg-orange-100 text-orange-400'
              }`}
            >
              <Download className="h-4 w-4" />
              <span>
                {studentSub.status === 'VERIFIED_ONCHAIN'
                  ? 'Unduh PDF SKPI Resmi (VERIFIED_ONCHAIN)'
                  : `Menunggu Pengesahan (${studentSub.status})`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Form Unggah Sertifikat & Daftar Sertifikat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Unggah Sertifikat & Pra-Verifikasi Forensik */}
        <div className="lg:col-span-6 rounded-2xl border-2 border-orange-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-orange-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <FileSearch className="h-4 w-4 text-orange-600" />
                <span>Unggah Sertifikat & Pemeriksaan Forensik</span>
              </h2>
              <p className="text-xs text-slate-500">
                Ekstraksi Nomor Surat, Forensik Struktur ELA, & Kalkulator Poin SKPI
              </p>
            </div>
            <span className="rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1 font-mono text-xs font-extrabold text-orange-700">
              Estimasi: +{estimatedPoints} Poin
            </span>
          </div>

          <form onSubmit={handleSubmitCertificate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                File Sertifikat (PDF / Gambar JPG/PNG) — Opsional untuk Analisis Metadata/OCR
              </label>
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setUploadedFile(f);
                }}
                className="block w-full rounded-xl border border-orange-200 bg-orange-50/30 px-3 py-2 text-xs text-slate-700 file:mr-3 file:rounded-lg file:border file:border-orange-200 file:bg-white file:px-3 file:py-1 file:text-xs file:font-bold file:text-orange-700"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor Surat Sertifikat (Hasil OCR / Input)
                </label>
                <input
                  type="text"
                  required
                  value={certNumber}
                  onChange={(e) => setCertNumber(e.target.value)}
                  placeholder="Contoh: 042/PAN-SEMNAS/FTIK-USM/X/2025"
                  className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-orange-600 focus:outline-none"
                />
                <span className="mt-1 block text-[10px] text-slate-500">
                  Pola Baku: No/Kode/FTIK-USM|BEM-USM|HIMATISI/Bulan-Romawi/Tahun
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Kegiatan / Prestasi
                </label>
                <input
                  type="text"
                  required
                  value={activityName}
                  onChange={(e) => setActivityName(e.target.value)}
                  className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-orange-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kategori Kegiatan
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ActivityCategory)}
                  className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs text-slate-900"
                >
                  <option value="Lomba & Kompetisi">Lomba & Kompetisi</option>
                  <option value="Kepanitiaan">Kepanitiaan</option>
                  <option value="Pelatihan & Seminar">Pelatihan & Seminar</option>
                  <option value="Organisasi Mahasiswa">Organisasi Mahasiswa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tingkat Kegiatan
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as ActivityLevel)}
                  className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs text-slate-900"
                >
                  <option value="Internasional">Internasional</option>
                  <option value="Nasional">Nasional</option>
                  <option value="Regional / Provinsi">Regional / Provinsi</option>
                  <option value="Universitas / Fakultas">Universitas / Fakultas</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Peran / Capaian
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as ActivityRole)}
                  className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs text-slate-900"
                >
                  <option value="Juara 1 / Ketua">Juara 1 / Ketua</option>
                  <option value="Juara 2 / Sekretaris / Bendahara">
                    Juara 2 / Sekretaris / Bendahara
                  </option>
                  <option value="Juara 3 / Koordinator Divisi">
                    Juara 3 / Koordinator Divisi
                  </option>
                  <option value="Finalis / Anggota Panitia">Finalis / Anggota Panitia</option>
                  <option value="Peserta / Partisipan">Peserta / Partisipan</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleRunPreScreening()}
                disabled={isScreening}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-orange-600 bg-white px-4 py-2.5 text-xs font-extrabold text-orange-700 hover:bg-orange-50 transition"
              >
                <FileSearch className="h-4 w-4" />
                <span>
                  {isScreening ? 'Memeriksa Dokumen...' : '1. Periksa Struktur Sertifikat'}
                </span>
              </button>

              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-orange-700 transition shadow-sm"
              >
                <PlusCircle className="h-4 w-4" />
                <span>2. Simpan & Ajukan Sertifikat</span>
              </button>
            </div>
          </form>

          {/* Preview Hasil Pembacaan OCR & Skor Integritas Dokumen */}
          {screeningResult && (
            <div
              className={`mt-5 rounded-xl border-2 p-4 ${
                screeningResult.isHighRiskTampered
                  ? 'border-orange-800 bg-orange-50/60'
                  : 'border-orange-300 bg-orange-50/30'
              }`}
            >
              <div className="flex items-center justify-between border-b border-orange-200 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  {screeningResult.isHighRiskTampered ? (
                    <ShieldAlert className="h-5 w-5 text-orange-800" />
                  ) : (
                    <ShieldCheck className="h-5 w-5 text-orange-600" />
                  )}
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                    Hasil Audit Forensik Sertifikat
                  </span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 font-mono text-xs font-extrabold ${
                    screeningResult.isHighRiskTampered
                      ? 'bg-orange-900 text-white'
                      : 'bg-orange-600 text-white'
                  }`}
                >
                  {screeningResult.isHighRiskTampered
                    ? `HIGH_RISK_TAMPERED (${screeningResult.integrityScore}%)`
                    : `AMAN / VERIFIED (${screeningResult.integrityScore}%)`}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3 text-center text-xs">
                <div className="rounded-lg border border-orange-200 bg-white p-2">
                  <div className="text-[10px] font-semibold text-slate-500">Regex Nomor Surat</div>
                  <div
                    className={`font-extrabold mt-0.5 ${
                      screeningResult.regexValid ? 'text-orange-600' : 'text-orange-900'
                    }`}
                  >
                    {screeningResult.regexValid ? 'VALID' : 'INVALID'}
                  </div>
                </div>
                <div className="rounded-lg border border-orange-200 bg-white p-2">
                  <div className="text-[10px] font-semibold text-slate-500">Skor ELA & Metadata</div>
                  <div
                    className={`font-extrabold mt-0.5 ${
                      screeningResult.elaScore >= 80 ? 'text-orange-600' : 'text-orange-900'
                    }`}
                  >
                    {screeningResult.elaScore}%
                  </div>
                </div>
                <div className="rounded-lg border border-orange-200 bg-white p-2">
                  <div className="text-[10px] font-semibold text-slate-500">Presensi Kegiatan</div>
                  <div className="font-extrabold mt-0.5 text-orange-700">
                    {screeningResult.attendanceMatched ? 'COCOK 100%' : 'PERLU CEK ORMAWA'}
                  </div>
                </div>
              </div>

              <ul className="space-y-1 text-[11px] text-slate-700">
                {screeningResult.forensicDetails.map((detail, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-orange-600 font-bold mt-0.5">&bull;</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Daftar Sertifikat Mahasiswa */}
        <div className="lg:col-span-6 rounded-2xl border-2 border-orange-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-orange-100 pb-3">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Award className="h-4 w-4 text-orange-600" />
              <span>Daftar Sertifikat Portofolio ({studentCerts.length} Berkas)</span>
            </h2>
            <span className="font-mono text-xs text-orange-700 font-extrabold">
              Total: {studentSub.total_points} Poin
            </span>
          </div>

          <div className="space-y-3">
            {studentCerts.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-orange-200 bg-orange-50/30 p-8 text-center">
                <Award className="mx-auto h-8 w-8 text-orange-400 mb-2" />
                <p className="text-xs font-bold text-slate-800">
                  Belum ada sertifikat kegiatan untuk {activeStudent.full_name}.
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Silakan isi formulir di sebelah kiri lalu klik "2. Simpan & Ajukan Sertifikat" untuk menambahkan sertifikat.
                </p>
              </div>
            )}
            {studentCerts.map((cert) => {
              const isHighRisk = cert.ai_ela_score < 80;
              return (
                <div
                  key={cert.id}
                  className={`rounded-xl border p-4 transition ${
                    isHighRisk
                      ? 'border-orange-400 bg-orange-50/60'
                      : 'border-orange-200 bg-white hover:border-orange-300'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">{cert.activity_name}</h3>
                      <p className="font-mono text-xs text-slate-500 mt-0.5">
                        No. Surat: {cert.cert_number}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-extrabold ${
                          isHighRisk
                            ? 'bg-orange-900 text-white'
                            : 'bg-orange-50 text-orange-700 border border-orange-200'
                        }`}
                      >
                        Integritas: {cert.ai_ela_score}%
                      </span>
                      <span className="rounded-lg bg-orange-600 px-2.5 py-0.5 font-mono text-xs font-extrabold text-white">
                        +{cert.points} Poin
                      </span>
                      <button
                        type="button"
                        title="Hapus Sertifikat"
                        onClick={() => deleteCertificate(cert.id)}
                        className="rounded-lg border border-orange-200 bg-white p-1.5 text-slate-500 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                    <span className="rounded border border-orange-200 bg-orange-50/50 px-2 py-0.5 text-slate-700">
                      {cert.category}
                    </span>
                    <span className="rounded border border-orange-200 bg-orange-50/50 px-2 py-0.5 text-slate-700">
                      Tingkat {cert.level}
                    </span>
                    <span className="rounded border border-orange-200 bg-orange-50/50 px-2 py-0.5 text-slate-700">
                      Peran: {cert.role}
                    </span>
                    <span className="rounded border border-orange-200 bg-orange-100/70 px-2 py-0.5 text-orange-800">
                      Validator: {cert.ormawa_verified_by}
                    </span>
                  </div>

                  <p className="mt-2 text-[11px] text-slate-600 border-t border-orange-100 pt-2">
                    {cert.forensic_notes}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
