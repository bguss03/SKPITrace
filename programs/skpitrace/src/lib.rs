use anchor_lang::prelude::*;

declare_id!("SKP1TrAcE99xYzUvWxYz123456789ABCDEFGHJKLMNP");

#[program]
pub mod skpitrace {
    use super::*;

    /// Tahap 1 Multi-Signature: Persetujuan Kaprodi atas substansi akademik & poin kredit SKPI
    pub fn approve_kaprodi(
        ctx: Context<ApproveKaprodi>,
        skpi_id: String,
        document_sha256_hash: String,
        ai_integrity_score: u8,
        total_skpi_points: u16,
    ) -> Result<()> {
        require!(
            ai_integrity_score >= 80,
            SkpiError::DocumentTamperingSuspected
        );
        require!(
            total_skpi_points >= 100,
            SkpiError::InsufficientSkpiPoints
        );
        require!(
            document_sha256_hash.len() == 64,
            SkpiError::InvalidDocumentHashFormat
        );

        let record = &mut ctx.accounts.skpi_record;
        record.skpi_id = skpi_id;
        record.document_sha256_hash = document_sha256_hash;
        record.ai_integrity_score = ai_integrity_score;
        record.total_skpi_points = total_skpi_points;
        record.approval_timestamp = Clock::get()?.unix_timestamp;
        record.validator_wallets = vec![ctx.accounts.kaprodi_signer.key()];
        record.is_valid_for_yudisium = false; // Menunggu Sign 2 dari Admin Akademik

        Ok(())
    }

    /// Tahap 2 Multi-Signature: Pengesahan Final Admin Akademik Fakultas & Penguncian Hash On-Chain
    pub fn finalize_skpi_onchain(
        ctx: Context<FinalizeSkpiOnchain>,
        expected_sha256_hash: String,
    ) -> Result<()> {
        let record = &mut ctx.accounts.skpi_record;
        let admin_key = ctx.accounts.admin_signer.key();

        // Pastikan hash dokumen tidak berubah antara Sign 1 dan Sign 2
        require!(
            record.document_sha256_hash == expected_sha256_hash,
            SkpiError::InvalidDocumentHashFormat
        );
        require!(
            record.document_sha256_hash.len() == 64,
            SkpiError::InvalidDocumentHashFormat
        );

        // Pastikan Admin berbeda wallet dengan Kaprodi (Multi-Sig murni)
        require!(
            !record.validator_wallets.contains(&admin_key),
            SkpiError::DuplicateValidatorSignature
        );

        record.validator_wallets.push(admin_key);

        // Aturan Validasi On-Chain Sesuai Spesifikasi PRD Bagian 5
        require!(
            record.ai_integrity_score >= 80,
            SkpiError::DocumentTamperingSuspected
        );
        require!(
            record.total_skpi_points >= 100,
            SkpiError::InsufficientSkpiPoints
        );
        require!(
            record.validator_wallets.len() >= 2,
            SkpiError::InsufficientAcademicSignatures
        );

        record.approval_timestamp = Clock::get()?.unix_timestamp;
        record.is_valid_for_yudisium = true;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(skpi_id: String)]
pub struct ApproveKaprodi<'info> {
    #[account(
        init_if_needed,
        payer = kaprodi_signer,
        space = 8 + 64 + 128 + 1 + 2 + 8 + (4 + 32 * 4) + 1,
        seeds = [b"skpi_record", skpi_id.as_bytes()],
        bump
    )]
    pub skpi_record: Account<'info, SkpiRecord>,
    #[account(mut)]
    pub kaprodi_signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeSkpiOnchain<'info> {
    #[account(
        mut,
        seeds = [b"skpi_record", skpi_record.skpi_id.as_bytes()],
        bump
    )]
    pub skpi_record: Account<'info, SkpiRecord>,
    #[account(mut)]
    pub admin_signer: Signer<'info>,
}

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

#[error_code]
pub enum SkpiError {
    #[msg("Skor integritas AI di bawah ambang batas aman (< 80%). Indikasi manipulasi dokumen.")]
    DocumentTamperingSuspected,
    #[msg("Total poin kredit SKPI belum memenuhi syarat minimum kelulusan yudisium (< 100 poin).")]
    InsufficientSkpiPoints,
    #[msg("Format SHA-256 Hash dokumen tidak valid (wajib 64 karakter heksadesimal).")]
    InvalidDocumentHashFormat,
    #[msg("Konsensus akademik belum terpenuhi (wajib minimal 2 signature validator sah: Kaprodi & Admin).")]
    InsufficientAcademicSignatures,
    #[msg("Wallet validator ini sudah menandatangani pengajuan SKPI yang sama.")]
    DuplicateValidatorSignature,
}
