export type ActivityCategory = 'Kepanitiaan' | 'Lomba & Kompetisi' | 'Pelatihan & Seminar' | 'Organisasi Mahasiswa';
export type ActivityLevel = 'Internasional' | 'Nasional' | 'Regional / Provinsi' | 'Universitas / Fakultas';
export type ActivityRole = 'Juara 1 / Ketua' | 'Juara 2 / Sekretaris / Bendahara' | 'Juara 3 / Koordinator Divisi' | 'Finalis / Anggota Panitia' | 'Peserta / Partisipan';

export type SubmissionStatus = 'PENDING' | 'KAPRODI_APPROVED' | 'VERIFIED_ONCHAIN' | 'REJECTED';

export interface Student {
  id: string;
  nim: string;
  full_name: string;
  prodi: string;
  wallet_address?: string;
  angkatan: string;
}

export interface Certificate {
  id: string;
  student_id: string;
  cert_number: string;
  activity_name: string;
  category: ActivityCategory;
  role: ActivityRole;
  level: ActivityLevel;
  points: number;
  ai_ocr_matched: boolean;
  ai_regex_valid: boolean;
  ai_attendance_matched: boolean;
  ai_ela_score: number;
  ormawa_verified_by: string;
  forensic_notes: string;
  uploaded_at: string;
}

export interface SkpiOnChainRecord {
  skpi_id: string;
  pda_address: string;
  document_sha256_hash: string;
  ai_integrity_score: number;
  total_skpi_points: number;
  approval_timestamp: number;
  validator_wallets: string[];
  is_valid_for_yudisium: boolean;
  solana_tx_signature: string;
}

export interface SkpiSubmission {
  skpi_id: string;
  student_id: string;
  total_points: number;
  ai_integrity_score: number;
  human_override_approved?: boolean;
  human_override_note?: string;
  sha256_hash: string;
  kaprodi_wallet: string;
  admin_wallet: string;
  solana_tx_signature: string;
  approval_timestamp: number;
  status: SubmissionStatus;
}

export interface AttendanceRosterEntry {
  cert_number: string;
  nim: string;
  full_name: string;
  activity_name: string;
  organizer: string;
  date: string;
}

export interface AiPreScreeningResult {
  extractedText: string;
  detectedCertNumber: string;
  regexValid: boolean;
  attendanceMatched: boolean;
  matchedRoster?: AttendanceRosterEntry;
  elaScore: number;
  metadataClean: boolean;
  integrityScore: number;
  isHighRiskTampered: boolean;
  calculatedPoints: number;
  forensicDetails: string[];
}
