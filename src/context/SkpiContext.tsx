import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  Certificate,
  SkpiOnChainRecord,
  SkpiSubmission,
  Student,
} from '../types/skpi';
import { deriveDeterministicPdaPreview, computeSha256Hex } from '../utils/crypto';
import { generateDeterministicSkpiPdf } from '../utils/pdfGenerator';

export const DEFAULT_KAPRODI_WALLET = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
export const DEFAULT_ADMIN_WALLET = '9pQrStUvWxYz123456789ABCDEFGHJKLMNPQRSTUVWXY';
export const SOLANA_PROGRAM_ID = 'SKP1TrAcE99xYzUvWxYz123456789ABCDEFGHJKLMNP';

const INITIAL_STUDENTS: Student[] = [
  {
    id: 'stu-0053',
    nim: 'G.231.24.0054',
    full_name: 'Budi Santoso',
    prodi: 'S1 Sistem Informasi - FTIK USM',
    wallet_address: '4mK9xPqL2wNvR8sT1uVyZaBcDeFgHiJkLmNoPqRsTuVw',
    angkatan: '2024',
  },
];

const INITIAL_CERTIFICATES: Certificate[] = [
  // Sertifikat Budi Santoso (Total 145 Poin, Integritas 95%)
  {
    id: 'cert-101',
    student_id: 'stu-0053',
    cert_number: '118/KOMP-WEB3/HIMATISI/IV/2026',
    activity_name: 'National Hackathon Web3 & Smart Contract Innovation',
    category: 'Lomba & Kompetisi',
    role: 'Juara 1 / Ketua',
    level: 'Nasional',
    points: 65,
    ai_ocr_matched: true,
    ai_regex_valid: true,
    ai_attendance_matched: true,
    ai_ela_score: 96,
    ormawa_verified_by: 'HIMATISI FTIK USM',
    forensic_notes: 'Nomor surat valid regex, presensi cocok 100%, struktur PDF bersih.',
    uploaded_at: '2026-10-12',
  },
  {
    id: 'cert-102',
    student_id: 'stu-0053',
    cert_number: '089/ORG-PENGURUS/HIMATISI/XII/2025',
    activity_name: 'Pengurus Inti Himpunan Mahasiswa Sistem Informasi (HIMATISI)',
    category: 'Organisasi Mahasiswa',
    role: 'Juara 1 / Ketua',
    level: 'Universitas / Fakultas',
    points: 45,
    ai_ocr_matched: true,
    ai_regex_valid: true,
    ai_attendance_matched: true,
    ai_ela_score: 95,
    ormawa_verified_by: 'BEM FTIK USM',
    forensic_notes: 'SK Kepengurusan tervalidasi pada daftar hadir Ormawa.',
    uploaded_at: '2026-10-14',
  },
  {
    id: 'cert-103',
    student_id: 'stu-0053',
    cert_number: '042/PAN-SEMNAS/FTIK-USM/X/2025',
    activity_name: 'Seminar Nasional Cybersecurity FTIK USM 2025',
    category: 'Kepanitiaan',
    role: 'Juara 2 / Sekretaris / Bendahara',
    level: 'Nasional',
    points: 35,
    ai_ocr_matched: true,
    ai_regex_valid: true,
    ai_attendance_matched: true,
    ai_ela_score: 94,
    ormawa_verified_by: 'BEM FTIK USM',
    forensic_notes: 'Metadata XRef PDF asli, tanda tangan digital terverifikasi.',
    uploaded_at: '2026-10-15',
  },
];

const INITIAL_SUBMISSIONS: SkpiSubmission[] = [
  {
    skpi_id: 'SKPI-FTIK-2026-0053',
    student_id: 'stu-0053',
    total_points: 145,
    ai_integrity_score: 95,
    sha256_hash: '', // Diisi otomatis secara deterministik saat inisialisasi
    kaprodi_wallet: DEFAULT_KAPRODI_WALLET,
    admin_wallet: DEFAULT_ADMIN_WALLET,
    solana_tx_signature:
      '5xY9kLmN2pQrStUvWxYz123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnop1234567890devnet',
    approval_timestamp: 1762084800,
    status: 'VERIFIED_ONCHAIN',
  },
];

interface SkpiContextType {
  students: Student[];
  certificates: Certificate[];
  submissions: SkpiSubmission[];
  onChainRecords: Record<string, SkpiOnChainRecord>;
  activeStudentId: string;
  setActiveStudentId: (id: string) => void;
  activeValidatorRole: 'KAPRODI' | 'ADMIN_AKADEMIK';
  setActiveValidatorRole: (role: 'KAPRODI' | 'ADMIN_AKADEMIK') => void;
  simulatedWalletAddress: string;
  isReady: boolean;
  addStudent: (data: {
    nim: string;
    full_name: string;
    prodi: string;
    angkatan: string;
    wallet_address?: string;
  }) => Promise<{ success: boolean; message: string; student?: Student }>;
  addCertificate: (cert: Omit<Certificate, 'id' | 'uploaded_at'>) => Promise<void>;
  deleteCertificate: (certId: string) => Promise<void>;
  approveKaprodiSign1: (skpiId: string, signerWallet: string) => Promise<{ success: boolean; message: string }>;
  finalizeAdminSign2OnChain: (
    skpiId: string,
    signerWallet: string
  ) => Promise<{ success: boolean; message: string; txSignature?: string }>;
  applyHumanOverride: (skpiId: string, note: string) => Promise<void>;
  rejectSubmission: (skpiId: string, reason: string) => void;
  generateOfficialPdfForSubmission: (
    skpiId: string,
    tamperOneCharacter?: boolean
  ) => Promise<{ pdfBytes: Uint8Array; sha256Hash: string; filename: string }>;
  resetDemoState: () => Promise<void>;
}

const SkpiContext = createContext<SkpiContextType | undefined>(undefined);

const STORAGE_KEY_STUDENTS = 'skpitrace_students_v2';
const STORAGE_KEY_CERTS = 'skpitrace_certs_v2';
const STORAGE_KEY_SUBS = 'skpitrace_subs_v2';
const STORAGE_KEY_ONCHAIN = 'skpitrace_onchain_v2';

export const SkpiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [certificates, setCertificates] = useState<Certificate[]>(INITIAL_CERTIFICATES);
  const [submissions, setSubmissions] = useState<SkpiSubmission[]>(INITIAL_SUBMISSIONS);
  const [onChainRecords, setOnChainRecords] = useState<Record<string, SkpiOnChainRecord>>({});
  const [activeStudentId, setActiveStudentId] = useState<string>('stu-0053');
  const [activeValidatorRole, setActiveValidatorRole] = useState<'KAPRODI' | 'ADMIN_AKADEMIK'>(
    'KAPRODI'
  );
  const [isReady, setIsReady] = useState<boolean>(false);

  const simulatedWalletAddress =
    activeValidatorRole === 'KAPRODI' ? DEFAULT_KAPRODI_WALLET : DEFAULT_ADMIN_WALLET;

  // Hitung ulang SHA-256 PDF deterministik untuk seluruh submission & inisialisasi On-Chain Record
  const hydrateHashesAndOnChain = async (
    certsInput: Certificate[],
    subsInput: SkpiSubmission[],
    existingOnChain?: Record<string, SkpiOnChainRecord>,
    studentsInput?: Student[]
  ) => {
    const activeStudentsList = studentsInput || students;
    const updatedSubs: SkpiSubmission[] = [];
    const nextOnChain: Record<string, SkpiOnChainRecord> = { ...(existingOnChain || {}) };

    for (const sub of subsInput) {
      const stu =
        activeStudentsList.find((s) => s.id === sub.student_id) ||
        INITIAL_STUDENTS.find((s) => s.id === sub.student_id) ||
        activeStudentsList[0];
      const stuCerts = certsInput.filter((c) => c.student_id === sub.student_id);
      const { sha256Hash } = await generateDeterministicSkpiPdf({
        student: stu,
        submission: sub,
        certificates: stuCerts,
        tamperOneCharacter: false,
      });

      const hydratedSub: SkpiSubmission = {
        ...sub,
        sha256_hash: sha256Hash,
      };
      updatedSubs.push(hydratedSub);

      if (hydratedSub.status === 'VERIFIED_ONCHAIN') {
        const pda = await deriveDeterministicPdaPreview(hydratedSub.skpi_id);
        nextOnChain[hydratedSub.skpi_id] = {
          skpi_id: hydratedSub.skpi_id,
          pda_address: pda,
          document_sha256_hash: sha256Hash,
          ai_integrity_score: hydratedSub.ai_integrity_score,
          total_skpi_points: hydratedSub.total_points,
          approval_timestamp: hydratedSub.approval_timestamp,
          validator_wallets: [hydratedSub.kaprodi_wallet, hydratedSub.admin_wallet].filter(Boolean),
          is_valid_for_yudisium: true,
          solana_tx_signature: hydratedSub.solana_tx_signature,
        };

        // Sinkronkan bukti on-chain ke memori server AI Agent (jika backend sedang berjalan)
        fetch('/api/sync-bukti', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hashHex: sha256Hash,
            skpi_id: hydratedSub.skpi_id,
            pencatat: hydratedSub.kaprodi_wallet,
            validator_kedua: hydratedSub.admin_wallet,
            total_poin: hydratedSub.total_points,
            skor_ai: hydratedSub.ai_integrity_score,
            timestamp: hydratedSub.approval_timestamp,
            pda_address: pda,
            tx_signature: hydratedSub.solana_tx_signature,
          }),
        }).catch(() => {});
      }
    }

    setStudents(activeStudentsList);
    setSubmissions(updatedSubs);
    setOnChainRecords(nextOnChain);
    localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(activeStudentsList));
    localStorage.setItem(STORAGE_KEY_CERTS, JSON.stringify(certsInput));
    localStorage.setItem(STORAGE_KEY_SUBS, JSON.stringify(updatedSubs));
    localStorage.setItem(STORAGE_KEY_ONCHAIN, JSON.stringify(nextOnChain));
    setIsReady(true);
  };

  useEffect(() => {
    const savedStudents = localStorage.getItem(STORAGE_KEY_STUDENTS);
    const savedCerts = localStorage.getItem(STORAGE_KEY_CERTS);
    const savedSubs = localStorage.getItem(STORAGE_KEY_SUBS);
    const savedOnChain = localStorage.getItem(STORAGE_KEY_ONCHAIN);

    if (savedCerts && savedSubs) {
      try {
        const parsedStudents = savedStudents ? JSON.parse(savedStudents) : INITIAL_STUDENTS;
        const parsedCerts = JSON.parse(savedCerts);
        const parsedSubs = JSON.parse(savedSubs);
        const parsedOnChain = savedOnChain ? JSON.parse(savedOnChain) : {};
        hydrateHashesAndOnChain(parsedCerts, parsedSubs, parsedOnChain, parsedStudents);
        return;
      } catch {
        // Fallback ke default
      }
    }
    hydrateHashesAndOnChain(INITIAL_CERTIFICATES, INITIAL_SUBMISSIONS, {}, INITIAL_STUDENTS);
  }, []);

  const addStudent = async (data: {
    nim: string;
    full_name: string;
    prodi: string;
    angkatan: string;
    wallet_address?: string;
  }): Promise<{ success: boolean; message: string; student?: Student }> => {
    const cleanNim = data.nim.trim().toUpperCase();
    const cleanName = data.full_name.trim();
    if (!cleanNim || !cleanName) {
      return { success: false, message: 'NIM dan Nama Lengkap mahasiswa wajib diisi.' };
    }

    const exists = students.some((s) => s.nim.toUpperCase() === cleanNim);
    if (exists) {
      return { success: false, message: `Mahasiswa dengan NIM ${cleanNim} sudah terdaftar.` };
    }

    const suffixDigits = cleanNim.replace(/[^0-9]/g, '').slice(-4) || String(students.length + 1).padStart(4, '0');
    const newStudentId = `stu-${Date.now()}`;
    const skpiCandidate = `SKPI-FTIK-2026-${suffixDigits}`;
    const uniqueSkpiId = submissions.some((s) => s.skpi_id === skpiCandidate)
      ? `${skpiCandidate}-${String(students.length + 1)}`
      : skpiCandidate;

    const newStudent: Student = {
      id: newStudentId,
      nim: cleanNim,
      full_name: cleanName,
      prodi: data.prodi.trim() || 'S1 Sistem Informasi - FTIK USM',
      angkatan: data.angkatan.trim() || '2024',
      wallet_address:
        data.wallet_address?.trim() ||
        `StuWallet${suffixDigits}xYz123456789ABCDEFGHJKLMNPQRST`,
    };

    const newSubmission: SkpiSubmission = {
      skpi_id: uniqueSkpiId,
      student_id: newStudentId,
      total_points: 0,
      ai_integrity_score: 0,
      sha256_hash: '',
      kaprodi_wallet: '',
      admin_wallet: '',
      solana_tx_signature: '',
      approval_timestamp: Math.floor(Date.now() / 1000),
      status: 'PENDING',
    };

    const nextStudents = [...students, newStudent];
    const nextSubs = [...submissions, newSubmission];

    await hydrateHashesAndOnChain(certificates, nextSubs, onChainRecords, nextStudents);
    setActiveStudentId(newStudentId);

    return {
      success: true,
      message: `Mahasiswa "${cleanName}" (${cleanNim}) berhasil didaftarkan dengan ID Dokumen ${uniqueSkpiId}! Silakan tambahkan sertifikat kegiatannya.`,
      student: newStudent,
    };
  };

  const addCertificate = async (newCertData: Omit<Certificate, 'id' | 'uploaded_at'>) => {
    const newCert: Certificate = {
      ...newCertData,
      id: `cert-${Date.now()}`,
      uploaded_at: new Date().toISOString().slice(0, 10),
    };

    const nextCerts = [...certificates, newCert];
    setCertificates(nextCerts);

    const studentCerts = nextCerts.filter((c) => c.student_id === newCert.student_id);
    const totalPoints = studentCerts.reduce((acc, c) => acc + c.points, 0);
    const avgAiScore = Math.round(
      studentCerts.reduce((acc, c) => acc + c.ai_ela_score, 0) / studentCerts.length
    );

    const nextSubs = submissions.map((sub) => {
      if (sub.student_id !== newCert.student_id) return sub;
      return {
        ...sub,
        total_points: totalPoints,
        ai_integrity_score: avgAiScore,
        kaprodi_wallet: '',
        admin_wallet: '',
        solana_tx_signature: '',
        status: 'PENDING' as const,
      };
    });

    await hydrateHashesAndOnChain(nextCerts, nextSubs, onChainRecords, students);
  };

  const deleteCertificate = async (certId: string) => {
    const targetCert = certificates.find((c) => c.id === certId);
    if (!targetCert) return;

    const nextCerts = certificates.filter((c) => c.id !== certId);
    setCertificates(nextCerts);

    const studentCerts = nextCerts.filter((c) => c.student_id === targetCert.student_id);
    const totalPoints = studentCerts.reduce((acc, c) => acc + c.points, 0);
    const avgAiScore =
      studentCerts.length > 0
        ? Math.round(
            studentCerts.reduce((acc, c) => acc + c.ai_ela_score, 0) / studentCerts.length
          )
        : 0;

    const nextSubs = submissions.map((sub) => {
      if (sub.student_id !== targetCert.student_id) return sub;
      return {
        ...sub,
        total_points: totalPoints,
        ai_integrity_score: avgAiScore,
        kaprodi_wallet: '',
        admin_wallet: '',
        solana_tx_signature: '',
        status: 'PENDING' as const,
      };
    });

    await hydrateHashesAndOnChain(nextCerts, nextSubs, onChainRecords, students);
  };

  const applyHumanOverride = async (skpiId: string, note: string) => {
    const nextSubs = submissions.map((sub) => {
      if (sub.skpi_id !== skpiId) return sub;
      return {
        ...sub,
        ai_integrity_score: Math.max(85, sub.ai_integrity_score),
        human_override_approved: true,
        human_override_note: note,
      };
    });
    await hydrateHashesAndOnChain(certificates, nextSubs, onChainRecords);
  };

  const approveKaprodiSign1 = async (
    skpiId: string,
    signerWallet: string
  ): Promise<{ success: boolean; message: string }> => {
    const sub = submissions.find((s) => s.skpi_id === skpiId);
    if (!sub) return { success: false, message: 'Data pengajuan SKPI tidak ditemukan.' };

    // Validasi On-Chain Constraint 1: ai_integrity_score >= 80
    if (sub.ai_integrity_score < 80) {
      return {
        success: false,
        message:
          'SkpiError::DocumentTamperingSuspected — Skor integritas dokumen < 80%. Lakukan verifikasi fisik sertifikat asli (Override Manual) atau tolak pengajuan.',
      };
    }

    // Validasi On-Chain Constraint 2: total_skpi_points >= 100
    if (sub.total_points < 100) {
      return {
        success: false,
        message:
          'SkpiError::InsufficientSkpiPoints — Total poin SKPI belum mencapai syarat minimum yudisium (100 poin).',
      };
    }

    const nextSubs = submissions.map((item) => {
      if (item.skpi_id !== skpiId) return item;
      return {
        ...item,
        kaprodi_wallet: signerWallet,
        status: 'KAPRODI_APPROVED' as const,
      };
    });

    await hydrateHashesAndOnChain(certificates, nextSubs, onChainRecords);
    return {
      success: true,
      message: `Sign 1 (Kaprodi) berhasil ditandatangani oleh wallet ${signerWallet.slice(
        0,
        8
      )}... Status kini KAPRODI_APPROVED dan siap untuk Sign 2 (Admin Akademik).`,
    };
  };

  const finalizeAdminSign2OnChain = async (
    skpiId: string,
    signerWallet: string
  ): Promise<{ success: boolean; message: string; txSignature?: string }> => {
    const sub = submissions.find((s) => s.skpi_id === skpiId);
    if (!sub) return { success: false, message: 'Data pengajuan SKPI tidak ditemukan.' };

    if (!sub.kaprodi_wallet) {
      return {
        success: false,
        message:
          'SkpiError::InsufficientAcademicSignatures — Pengajuan wajib ditandatangani oleh Kaprodi (Sign 1) terlebih dahulu.',
      };
    }

    if (sub.kaprodi_wallet === signerWallet) {
      return {
        success: false,
        message:
          'SkpiError::DuplicateValidatorSignature — Wallet Admin Akademik harus berbeda dari Wallet Kaprodi (Multi-Signature 2/2).',
      };
    }

    if (sub.ai_integrity_score < 80) {
      return {
        success: false,
        message: 'SkpiError::DocumentTamperingSuspected — Skor integritas dokumen di bawah 80%.',
      };
    }

    if (sub.total_points < 100) {
      return {
        success: false,
        message: 'SkpiError::InsufficientSkpiPoints — Total poin SKPI di bawah 100.',
      };
    }

    const txDigest = await computeSha256Hex(
      new TextEncoder().encode(`${skpiId}:${sub.kaprodi_wallet}:${signerWallet}:${Date.now()}`)
    );
    const txSignature = `5SolDevnet${txDigest.slice(0, 52)}Tx`;

    const updatedSubTemp: SkpiSubmission = {
      ...sub,
      admin_wallet: signerWallet,
      solana_tx_signature: txSignature,
      status: 'VERIFIED_ONCHAIN',
    };

    const nextSubs = submissions.map((item) => (item.skpi_id === skpiId ? updatedSubTemp : item));
    await hydrateHashesAndOnChain(certificates, nextSubs, onChainRecords);

    return {
      success: true,
      message: `Multi-Signature (2/2) selesai! SHA-256 Hash dokumen resmi telah dikunci ke Smart Contract Solana Devnet.`,
      txSignature,
    };
  };

  const rejectSubmission = (skpiId: string, _reason: string) => {
    const nextSubs = submissions.map((item) =>
      item.skpi_id === skpiId ? { ...item, status: 'REJECTED' as const } : item
    );
    setSubmissions(nextSubs);
    localStorage.setItem(STORAGE_KEY_SUBS, JSON.stringify(nextSubs));
  };

  const generateOfficialPdfForSubmission = async (
    skpiId: string,
    tamperOneCharacter = false
  ): Promise<{ pdfBytes: Uint8Array; sha256Hash: string; filename: string }> => {
    const sub = submissions.find((s) => s.skpi_id === skpiId);
    if (!sub) throw new Error('Submission not found');
    const student = students.find((s) => s.id === sub.student_id)!;
    const stuCerts = certificates.filter((c) => c.student_id === sub.student_id);

    const { pdfBytes, sha256Hash } = await generateDeterministicSkpiPdf({
      student,
      submission: sub,
      certificates: stuCerts,
      tamperOneCharacter,
    });

    const suffix = tamperOneCharacter ? 'TAMPERED_EDIT_1_KARAKTER' : 'RESMI_ASLI';
    const filename = `${sub.skpi_id}_${student.nim.replace(/\./g, '')}_${suffix}.pdf`;
    return { pdfBytes, sha256Hash, filename };
  };

  const resetDemoState = async () => {
    localStorage.removeItem(STORAGE_KEY_STUDENTS);
    localStorage.removeItem(STORAGE_KEY_CERTS);
    localStorage.removeItem(STORAGE_KEY_SUBS);
    localStorage.removeItem(STORAGE_KEY_ONCHAIN);
    setStudents(INITIAL_STUDENTS);
    setCertificates(INITIAL_CERTIFICATES);
    setActiveStudentId(INITIAL_STUDENTS[0].id);
    await hydrateHashesAndOnChain(INITIAL_CERTIFICATES, INITIAL_SUBMISSIONS, {}, INITIAL_STUDENTS);
  };

  return (
    <SkpiContext.Provider
      value={{
        students,
        certificates,
        submissions,
        onChainRecords,
        activeStudentId,
        setActiveStudentId,
        activeValidatorRole,
        setActiveValidatorRole,
        simulatedWalletAddress,
        isReady,
        addStudent,
        addCertificate,
        deleteCertificate,
        approveKaprodiSign1,
        finalizeAdminSign2OnChain,
        applyHumanOverride,
        rejectSubmission,
        generateOfficialPdfForSubmission,
        resetDemoState,
      }}
    >
      {children}
    </SkpiContext.Provider>
  );
};

export function useSkpi() {
  const ctx = useContext(SkpiContext);
  if (!ctx) throw new Error('useSkpi must be used inside SkpiProvider');
  return ctx;
}
