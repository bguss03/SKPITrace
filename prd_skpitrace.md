# Product Requirements Document (PRD): SKPITrace

## 1. Ringkasan Produk (Product Overview)
* **Nama Produk:** SKPITrace
* **Deskripsi Singkat:** Platform berbasis web (*dApp*) untuk memverifikasi keaslian dokumen Surat Keterangan Pendamping Ijazah (SKPI) dan sertifikat portofolio mahasiswa menggunakan pemeriksaan awal *Artificial Intelligence* (AI), pengesahan kolektif komunitas akademik, serta pencatatan bukti integritas (*SHA-256 Hash*) di jaringan *Blockchain* Solana.
* **Masalah Utama:** Lamanya proses validasi manual berkas SKPI dan sertifikat saat pendaftaran yudisium, serta tingginya risiko manipulasi file PDF oleh mahasiswa agar memenuhi syarat poin minimum kelulusan.
* **Tujuan Produk:** Mempercepat proses validasi berkas yudisium menjadi hitungan detik melalui pencocokan *hash* kriptografi dan kode QR secara otomatis tanpa harus memeriksa keaslian dokumen satu per satu secara manual.

---

## 2. Arsitektur Teknologi (Tech Stack)

| Lapisan (Layer) | Teknologi & Library | Fungsi Utama |
| :--- | :--- | :--- |
| **Frontend Framework** | React.js (Vite + TypeScript), Tailwind CSS | Antarmuka web responsif (*mobile-first*) dengan komponen *reusable*. |
| **Web3 / Wallet Integration** | `@solana/web3.js`, `@solana/wallet-adapter-react`, `@coral-xyz/anchor` | Koneksi ke jaringan **Solana Devnet**, manajemen *wallet* (Phantom/Solflare), dan pemanggilan instruksi *smart contract*. |
| **Blockchain & Smart Contract** | Solana (Devnet), Rust + Anchor Framework | Menyimpan *account state* `SkpiRecord`, memvalidasi aturan poin/integritas, dan mencatat *multi-signature* validator. |
| **PDF Generator & Local State** | `pdf-lib`, Browser `localStorage` | Menghasilkan file PDF SKPI resmi ber-QR Code secara langsung di *browser* dan menyimpan *state* pengajuan tanpa memerlukan database/storage eksternal. |
| **Hashing & Cryptography** | Web Crypto API (`crypto.subtle.digest('SHA-256')`) | Menghitung *hash* kriptografi file PDF secara konsisten di *browser*. |
| **AI Pre-Screening (MVP)** | Tesseract.js (OCR) + Simulasi ELA / Forensik Metadata PDF (`pdf-lib`) | Mengekstrak nomor surat/nama dari sertifikat dan memberikan skor indikasi keaslian visual dokumen. |
| **QR Code Utility** | `qrcode.react` & `html5-qrcode` | Mencetak QR Code identitas SKPI dan memindai QR Code saat verifikasi yudisium. |

---

## 3. Peran Pengguna (User Roles & Personas)

1. **Mahasiswa (Applicant):**
   * Mengunggah sertifikat kegiatan penunjang dan mengajukan draf SKPI.
   * Memantau status verifikasi, akumulasi poin kredit SKPI, dan mengunduh PDF SKPI final ber-QR Code.
2. **Verifikator Komunitas Akademik (Ormawa / Kaprodi):**
   * Memeriksa hasil *pre-screening* AI pada sertifikat mahasiswa.
   * Memvalidasi kehadiran kegiatan (Ormawa) dan kesesuaian bobot poin kredit SKPI (Kaprodi).
   * Menandatangani (*sign*) persetujuan tahap pertama menggunakan *Solana Wallet*.
3. **Admin Akademik Fakultas:**
   * Melakukan verifikasi akhir dokumen SKPI yang telah disetujui Kaprodi.
   * Menandatangani transaksi *Multi-Signature* kedua untuk mengunci *SHA-256 Hash* dokumen SKPI ke dalam *Smart Contract* Solana Devnet.
4. **Panitia Yudisium / Verifikator Publik:**
   * Mengunggah file PDF SKPI yang diajukan mahasiswa atau memindai QR Code untuk mengecek kecocokan *hash* dengan data di Solana Devnet secara instan (tanpa perlu *login* atau *connect wallet*).

---

## 4. Kebutuhan Fungsional (Functional Requirements)

### Modul 1: Pengajuan SKPI & AI Pre-Screening (Role: Mahasiswa)
* **FR-01 (Unggah Sertifikat):** Mahasiswa dapat mengunggah file PDF/Gambar sertifikat beserta klaim kategori kegiatan (Kepanitiaan, Lomba, Pelatihan), tingkat kegiatan, dan peran.
* **FR-02 (Pemeriksaan AI Otomatis):** Saat file diunggah, sistem menjalankan pemeriksaan awal:
  * **OCR & Validasi Nomor Surat:** Mengekstrak teks nomor sertifikat dan mencocokkannya dengan pola *regex* baku organisasi/fakultas (contoh: `No/Kode/FTIK-USM/Bulan-Romawi/Tahun`).
  * **Forensik Metadata & Piksel (ELA):** Memeriksa apakah file PDF memiliki indikasi *image splicing* (tempelan nama/tanda tangan) dan menghasilkan `ai_integrity_score` ($0-100\%$).
  * **Fuzzy Matching Kehadiran:** Mencocokkan Nama dan NIM hasil OCR dengan tabel daftar hadir kegiatan kampus.
* **FR-03 (Kalkulasi Poin Otomatis):** Sistem menghitung estimasi poin kredit SKPI berdasarkan pedoman akademik dan memberi *flag* peringatan (`HIGH_RISK_TAMPERED`) jika skor integritas AI $< 80\%$.

### Modul 2: Verifikasi Komunitas & Multi-Signature (Role: Kaprodi & Admin Akademik)
* **FR-04 (Dashboard Antrean Verifikasi):** Menampilkan daftar pengajuan SKPI berstatus `PENDING` beserta skor AI, rincian sertifikat, dan total poin.
* **FR-05 (Penanganan Sengketa / Hierarki Keputusan):** Jika AI memberi *flag* anomali visual, validator tetap dapat meloloskan dokumen secara manual apabila mahasiswa telah menunjukkan bukti sertifikat fisik asli (keputusan manusia di atas indikasi awal AI).
* **FR-06 (Generate PDF Final & SHA-256 Hashing):** Setelah sertifikat disetujui, sistem men-*generate* file PDF SKPI final secara dinamis di *browser* (`pdf-lib`), menyematkan QR Code unik (`skpi_id`), dan menghitung nilai *SHA-256 Hash* (64 karakter heksadesimal).
* **FR-07 (On-Chain Recording via Multi-Sig):**
  * **Sign 1 (Kaprodi):** Menandatangani persetujuan poin dan substansi akademik via *wallet*.
  * **Sign 2 (Admin Akademik):** Menandatangani pengesahan final dan memicu transaksi penyimpanan ke *Smart Contract* Solana Devnet.

### Modul 3: Portal Verifikasi Instan Yudisium (Role: Panitia Yudisium)
* **FR-08 (Verifikasi via Upload File PDF):** Panitia mengunggah file PDF SKPI yang dikumpulkan mahasiswa. Sistem menghitung ulang *SHA-256 Hash* file tersebut di *browser*, lalu membandingkannya langsung dengan `document_sha256_hash` yang tercatat di Solana Devnet.
* **FR-09 (Verifikasi via Scan QR Code):** Panitia memindai QR Code pada lembar SKPI untuk menarik data transaksi dan status `SkpiRecord` dari Solana Devnet.
* **FR-10 (Indikator Hasil Verifikasi):**
  * **Status Valid (Hijau):** Muncul jika *hash* $100\%$ identik, poin $\ge 100$, dan memiliki minimal 2 *signature* validator sah.
  * **Status Tampered / Invalid (Merah):** Muncul instan jika file PDF telah dimodifikasi (bahkan 1 karakter/piksel) sehingga menghasilkan `HASH MISMATCH`.

---

## 5. Spesifikasi Teknis Smart Contract (Solana / Anchor)

### Struktur Account State (`SkpiRecord`)
```rust
#[account]
pub struct SkpiRecord {
    pub skpi_id: String,                   // Contoh: "SKPI-FTIK-2026-0053"
    pub document_sha256_hash: String,      // 64 karakter hex SHA-256 dari PDF SKPI final
    pub ai_integrity_score: u8,            // Skor pemeriksaan awal AI (0 - 100)
    pub total_skpi_points: u16,            // Total poin kredit SKPI mahasiswa
    pub approval_timestamp: i64,           // Unix timestamp pengesahan
    pub validator_wallets: Vec<Pubkey>,    // Daftar Public Key Wallet (Kaprodi & Admin)
    pub is_valid_for_yudisium: bool,       // Bernilai true jika memenuhi seluruh syarat
}
```

### Aturan Validasi On-Chain (Instructions & Constraints)
1. **Validasi Skor AI:** `require!(ai_integrity_score >= 80, SkpiError::DocumentTamperingSuspected)`
2. **Validasi Syarat Poin Yudisium:** `require!(total_skpi_points >= 100, SkpiError::InsufficientSkpiPoints)`
3. **Validasi Format Hash:** `require!(document_sha256_hash.len() == 64, SkpiError::InvalidDocumentHashFormat)`
4. **Validasi Konsensus Akademik:** `require!(validator_wallets.len() >= 2, SkpiError::InsufficientAcademicSignatures)`

---

## 6. Struktur Data Aplikasi (Client-Side State Tanpa Database Eksternal)

Aplikasi berjalan sebagai *serverless dApp* murni tanpa ketergantungan pada *Off-Chain Storage* atau *Database* eksternal. Data sesi dan simulasi alur kerja disimpan secara lokal di *browser* (`localStorage`) dan terhubung ke *state* `SkpiRecord` pada jaringan Solana Devnet:

1. **Entitas `Student`:**
   * `id` (String), `nim` (String - contoh: `G.231.24.0053`), `full_name` (String), `prodi` (String), `wallet_address` (String, Opsional).
2. **Entitas `Certificate`:**
   * `id` (String), `student_id` (String), `cert_number` (String), `activity_name` (String), `category` (String), `role` (String), `level` (String), `points` (Number), `ai_ocr_matched` (Boolean), `ai_ela_score` (Number), `ormawa_verified_by` (String).
3. **Entitas `SkpiSubmission`:**
   * `skpi_id` (String - contoh: `SKPI-FTIK-2026-0053`), `student_id` (String), `total_points` (Number), `ai_integrity_score` (Number), `sha256_hash` (String), `kaprodi_wallet` (String), `admin_wallet` (String), `solana_tx_signature` (String), `status` (`PENDING` | `KAPRODI_APPROVED` | `VERIFIED_ONCHAIN` | `REJECTED`).

---

## 7. Struktur Halaman & UI/UX (Sitemap & Wireframe Flow)

Antarmuka dibangun secara *responsive* (*mobile-first*) dengan komponen *loading state* saat transaksi blockchain berlangsung dan *error/tamper state* yang kontras:

1. **`/` (Landing & Public Verification Page):**
   * *Dropzone* unggah file PDF SKPI untuk pengecekan keaslian instan oleh Panitia Yudisium.
   * Tombol **"Scan QR Code"** menggunakan kamera perangkat.
   * Kartu Hasil Pemeriksaan: menampilkan Status Keaslian (Hijau/Merah), Ringkasan Mahasiswa, Skor Integritas AI, Daftar Wallet Pengesah (Kaprodi & Admin), Perbandingan *SHA-256 Hash* (File Diunggah vs Blockchain), dan tautan langsung ke **Solana Explorer (Devnet)**.
2. **`/student/dashboard` (Dashboard Mahasiswa):**
   * Bar progres poin SKPI (contoh: `145 / 100 Poin Minimum Yudisium`).
   * Form unggah sertifikat baru dengan *preview* hasil pembacaan OCR & skor integritas AI secara langsung.
   * Tombol unduh PDF SKPI Resmi (aktif setelah berstatus `VERIFIED_ONCHAIN`).
3. **`/validator/dashboard` (Dashboard Kaprodi, Ormawa, & Admin Akademik):**
   * Tombol **Connect Solana Wallet** (`WalletMultiButton`) di pojok kanan atas.
   * Tabel pengajuan SKPI mahasiswa lengkap dengan *badge* indikator AI (`Aman >= 80%` atau `Perlu Cek Fisik < 80%`).
   * Modal detail pemeriksaan berkas dan tombol **"Sign & Approve to Solana Devnet"**.

---

## 8. Kebutuhan Non-Fungsional & Keamanan

* **Privasi On-Chain (Zero-PII On-Chain):** Informasi identitas pribadi mahasiswa (Nama, NIM) tidak dipublikasikan ke *smart contract* publik; blockchain hanya mencatat `skpi_id`, nilai *SHA-256 Hash* satu arah (*one-way cryptographic hash*), skor AI, total poin, dan *public key* pengesah.
* **Determinisme Hash PDF:** Pembuatan PDF SKPI menggunakan `pdf-lib` secara deterministik dan perhitungan *SHA-256 Hash* dilakukan menggunakan Web Crypto API (`crypto.subtle.digest('SHA-256')`), sehingga perubahan 1 byte pun pada file PDF akan mengubah nilai *hash* secara drastis (*avalanche effect*).
* **Transparansi Batasan MVP:** Sistem menggunakan jaringan **Solana Devnet** dan data sintetis lokal untuk keperluan demonstrasi alur kerja tanpa ketergantungan server backend/database eksternal dan tanpa biaya transaksi uang asli.

---

## 9. Tahapan Implementasi (Development Milestones)

1. **Fase 1 (Setup & Core Client Engine):** Inisialisasi proyek React.js + TypeScript + Tailwind CSS, manajemen *state* lokal, generator PDF SKPI dinamis (`pdf-lib`), dan fitur unggah PDF disertai kalkulasi `SHA-256` di *browser*.
2. **Fase 2 (AI Pre-Screening Module):** Integrasi modul OCR (`tesseract.js`) untuk pembacaan pola nomor surat sertifikat dan analisis integritas visual/metadata PDF (`ai_integrity_score`) beserta kalkulator poin SKPI.
3. **Fase 3 (Smart Contract & Web3 Integration):** Penulisan program Rust/Anchor `SkpiRecord` untuk Solana Devnet, serta integrasi `@solana/wallet-adapter-react` dan alur *Multi-Signature* (Kaprodi & Admin Akademik) pada halaman validator.
4. **Fase 4 (Verification Portal & Testing):** Pembuatan halaman publik pencocokan *hash* & QR Code untuk panitia yudisium, diikuti pengujian skenario dokumen asli (*100% Identik*) vs dokumen yang sengaja diedit 1 huruf (*Tampered / Hash Mismatch*).