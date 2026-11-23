# SKPITrace — Platform Verifikasi SKPI & Portofolio Mahasiswa Berbasis AI & Solana Devnet

## 1. Nama Project
**SKPITrace**

## 2. Deskripsi Singkat
**SKPITrace** adalah aplikasi web terdesentralisasi (*dApp*) untuk memverifikasi keaslian dokumen **Surat Keterangan Pendamping Ijazah (SKPI)** dan sertifikat kegiatan mahasiswa menggunakan pemeriksaan awal *Artificial Intelligence* (AI Pre-Screening), asisten tanya-jawab berbasis **RAG & AI Agent (Google Gemini)**, konsensus pengesahan komunitas akademik (*Multi-Signature* Kaprodi & Admin Fakultas), serta pencatatan bukti integritas (`SHA-256 Hash`) pada jaringan **Solana Devnet**.

## 3. Masalah yang Diselesaikan
* Lamanya proses pemeriksaan manual berkas SKPI dan sertifikat kegiatan mahasiswa saat pendaftaran yudisium.
* Risiko manipulasi file PDF sertifikat atau pengubahan poin kredit SKPI oleh oknum agar memenuhi syarat minimum kelulusan (100 poin).
* Kurangnya transparansi dan kemudahan bagi panitia yudisium maupun pihak publik untuk mengecek apakah dokumen PDF SKPI benar-benar telah disahkan oleh Kaprodi dan Admin Fakultas tanpa mengalami perubahan 1 karakter pun sejak diterbitkan.

## 4. Target Pengguna
1. **Mahasiswa (Applicant):** Mengunggah sertifikat kegiatan, melihat estimasi poin & hasil *AI Pre-Screening*, serta mengunduh PDF SKPI resmi ber-QR Code.
2. **Validator Akademik (Kaprodi & Admin Fakultas):** Memeriksa antrean berkas SKPI, melakukan *override* verifikasi fisik jika terjadi sengketa skor AI, dan menandatangani persetujuan *Multi-Signature (2/2)*.
3. **Panitia Yudisium / Verifikator Publik:** Memverifikasi file PDF SKPI atau memindai QR Code secara instan tanpa perlu login atau menghubungkan wallet, dibantu oleh **Asisten AI (RAG & Agent)**.

## 5. Fitur Utama (Maksimal 5 Fitur)
1. **Unggah Sertifikat & AI Pre-Screening (OCR, Regex Nomor Surat, & Forensik ELA):** Memeriksa pola nomor surat (`No/Kode/FTIK-USM/Bulan-Romawi/Tahun`), struktur metadata PDF, dan menghitung skor integritas AI (`0-100%`) beserta kalkulasi poin SKPI otomatis.
2. **Dashboard Validator & Multi-Signature (Kaprodi + Admin Fakultas):** Mengelola antrean pengajuan SKPI dengan aturan konsensus 2 validator berbeda serta mekanisme *Hierarki Keputusan Manusia* (verifikasi fisik di atas indikasi AI).
3. **Generator PDF SKPI Deterministik Ber-QR Code & SHA-256 Hashing:** Menghasilkan dokumen PDF SKPI resmi di browser menggunakan `pdf-lib` dan menghitung `SHA-256 Cryptographic Hash` (64 karakter hex) via Web Crypto API.
4. **Portal Verifikasi Instan Panitia Yudisium (Upload PDF & Scan QR):** Membandingkan `SHA-256 Hash` file yang diunggah dengan bukti `SkpiRecord` di Solana Devnet (dilengkapi simulator 1-klik: *Uji PDF Asli* vs *Uji PDF Diedit 1 Karakter*).
5. **Asisten AI Web3 (`TanyaAI` RAG & `CekKeaslianAI` Agent dengan Google Gemini):**
   * **RAG (`/api/tanya-rag`):** Menjawab pertanyaan pedoman SKPI berdasarkan catatan pengetahuan lokal (`[SKPI-01]` s/d `[SKPI-06]`).
   * **AI Agent (`/api/agent`):** Mengecek bukti hash dokumen ke Solana Devnet menggunakan *tool calling* `cek_bukti_onchain` dan `cari_pengetahuan_lokal` tanpa mengirim file asli ke server dan tanpa pernah memvonis dokumen pasti asli/palsu.

## 6. Teknologi yang Digunakan
* **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons.
* **Backend AI & Agent:** Node.js (`http` server lokal di `127.0.0.1:3001`), **Google Gemini API (`gemini-2.5-flash` / `gemini-2.5-pro`)** dengan *Native Function Calling (Tools)* dan pencarian RAG kata kunci lokal.
* **Web3 & Kriptografi:** `@solana/web3.js`, `@solana/wallet-adapter-react` (Phantom & Solflare), Rust/Anchor Smart Contract (`programs/skpitrace/src/lib.rs`), Web Crypto API (`crypto.subtle.digest('SHA-256')`), `pdf-lib`, `qrcode.react`, `html5-qrcode`.

## 7. Cara Menjalankan Project

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Siapkan API Key Google Gemini di Backend (`server/.env`):**
   Salin `server/.env.example` menjadi `server/.env`, lalu isi `GEMINI_API_KEY` Anda:
   ```env
   GEMINI_API_KEY=isi_api_key_gemini_anda_di_sini
   GEMINI_MODEL=gemini-2.5-flash
   SOLANA_RPC_URL=https://api.devnet.solana.com
   ```
   *(Catatan Keamanan: File `server/.env` sudah dimasukkan ke `.gitignore` agar kunci rahasia tidak pernah terkirim ke browser maupun ke repository GitHub).*
3. **Jalankan Backend Server AI (Terminal 1):**
   ```bash
   npm run server
   ```
   Server akan berjalan di `http://127.0.0.1:3001`.
4. **Jalankan Frontend Web React (Terminal 2):**
   ```bash
   npm run dev
   ```
   Buka URL yang muncul di terminal (misalnya `http://localhost:5173`).

## 8. Data yang Masih Berupa Dummy
* Data profil mahasiswa (`Budi Santoso - G.231.24.0053`, `Siti Rahmawati - G.211.24.0088`, `Andi Pratama - G.231.24.0112`).
* Daftar sertifikat kegiatan, daftar hadir Ormawa (`CAMPUS_ATTENDANCE_ROSTER`), dan catatan pengetahuan lokal (`server/data/pengetahuan-lokal.json` berisi `[SKPI-01]` s/d `[SKPI-06]`).
* Alamat wallet default validator Kaprodi (`7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU`) dan Admin Akademik Fakultas (`9pQrStUvWxYz123456789ABCDEFGHJKLMNPQRSTUVWXY`).

## 9. Fitur Blockchain yang Masih Berupa Simulasi
* Pencatatan transaksi pengesahan *Multi-Signature* pada tahap prototipe menggunakan **Solana Devnet Simulation** (state lokal browser & registri bukti Devnet) sehingga pengguna dapat mendemokan seluruh alur kerja *Sign 1 (Kaprodi)*, *Sign 2 (Admin)*, dan pengecekan `cek_bukti_onchain` secara langsung tanpa biaya transaksi uang asli.
* Backend AI Agent berjalan secara **Read-Only** (hanya membaca koneksi RPC Solana Devnet dan registri bukti tanpa memegang *private key* atau *seed phrase*).

## 10. Batasan Project & Etika AI
* **AI Hanya Penyidik, Bukan Hakim:** Sesuai prinsip keamanan Web3, AI (`TanyaAI` & `CekKeaslianAI`) dilarang memvonis dokumen *"pasti asli"* atau *"pasti palsu"*. AI hanya melaporkan status pencatatan hash di blockchain, siapa wallet pencatatnya, dan mengutip indikator `[SKPI-01]` s/d `[SKPI-06]`. Keputusan akhir tetap berada di tangan Kaprodi dan Panitia Yudisium.
* **Zero-PII & Privasi Dokumen:** Saat mengecek keaslian dengan AI Agent, file PDF tidak diunggah ke server maupun ke Google Gemini; browser hanya menghitung dan mengirimkan 64 karakter hex `SHA-256 Hash`.

## 11. Informasi Pemilihan Model AI (Untuk Laporan UTS)
* **Model yang Dipakai:** `gemini-2.5-flash` (dapat diubah ke `gemini-2.5-pro` melalui `GEMINI_MODEL` di `server/.env`).
* **Alasan Pemilihan:** Berstatus *production* pada ekosistem Google Gemini Pro, memiliki kecepatan respons tinggi, mendukung *Native Function/Tool Calling* (`cek_bukti_onchain` dan `cari_pengetahuan_lokal`) dengan sangat akurat, serta patuh pada *System Instruction* bahasa Indonesia untuk tidak memvonis dokumen dan selalu mengutip ID catatan `[SKPI-xx]`.
