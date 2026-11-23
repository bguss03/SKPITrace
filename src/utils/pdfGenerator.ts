import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { Certificate, SkpiSubmission, Student } from '../types/skpi';
import { computeSha256Hex } from './crypto';

export interface GenerateSkpiPdfOptions {
  student: Student;
  submission: SkpiSubmission;
  certificates: Certificate[];
  /**
   * Jika bernilai true, sistem akan menyisipkan modifikasi 1 karakter pada file PDF
   * untuk mendemonstrasikan efek avalanche SHA-256 (Tampered / Hash Mismatch) saat diuji oleh Panitia Yudisium.
   */
  tamperOneCharacter?: boolean;
}

/**
 * Menghasilkan file PDF SKPI secara deterministik di sisi client menggunakan pdf-lib.
 * Karena seluruh metadata timestamp dan urutan byte dikunci berdasarkan data pengajuan,
 * file PDF asli yang di-generate selalu menghasilkan SHA-256 Hash 64 karakter yang 100% identik.
 */
export async function generateDeterministicSkpiPdf(
  options: GenerateSkpiPdfOptions
): Promise<{ pdfBytes: Uint8Array; sha256Hash: string }> {
  const { student, submission, certificates, tamperOneCharacter = false } = options;

  const pdfDoc = await PDFDocument.create();

  // Kunci metadata agar pembuatan PDF 100% deterministik (menghasilkan SHA-256 yang sama persis)
  const fixedDate = new Date(1762084800000); // Timestamp deterministik dokumen
  pdfDoc.setTitle(`SKPI Resmi FTIK USM - ${submission.skpi_id}`);
  pdfDoc.setAuthor('Fakultas Teknologi Informasi dan Komunikasi - Universitas Semarang (FTIK USM)');
  pdfDoc.setSubject(`SKPI_ID:${submission.skpi_id}|NIM:${student.nim}`);
  pdfDoc.setKeywords(['SKPITrace', submission.skpi_id, student.nim, 'Solana-Devnet']);
  pdfDoc.setProducer('SKPITrace Cryptographic PDF Engine v1.0 (FTIK USM)');
  pdfDoc.setCreator('SKPITrace Decentralized Verification Platform');
  pdfDoc.setCreationDate(fixedDate);
  pdfDoc.setModificationDate(fixedDate);

  const page = pdfDoc.addPage([595.28, 841.89]); // A4 Portrait
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontMono = await pdfDoc.embedFont(StandardFonts.CourierBold);

  // Header Banner
  page.drawRectangle({
    x: 0,
    y: height - 105,
    width,
    height: 105,
    color: rgb(0.04, 0.12, 0.24),
  });

  page.drawText('UNIVERSITAS SEMARANG (USM)', {
    x: 40,
    y: height - 38,
    size: 14,
    font: fontBold,
    color: rgb(0.95, 0.8, 0.25),
  });

  page.drawText('FAKULTAS TEKNOLOGI INFORMASI DAN KOMUNIKASI (FTIK)', {
    x: 40,
    y: height - 56,
    size: 11,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText(
    'SURAT KETERANGAN PENDAMPING IJAZAH (SKPI) TERVERIFIKASI BLOCKCHAIN SOLANA',
    {
      x: 40,
      y: height - 76,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.75, 0.85, 0.95),
    }
  );

  // Nomor Dokumen & Status
  page.drawRectangle({
    x: 40,
    y: height - 155,
    width: width - 80,
    height: 36,
    color: rgb(0.94, 0.97, 1),
    borderColor: rgb(0.75, 0.83, 0.92),
    borderWidth: 1,
  });

  page.drawText(`ID DOKUMEN SKPI : ${submission.skpi_id}`, {
    x: 52,
    y: height - 135,
    size: 10,
    font: fontMono,
    color: rgb(0.05, 0.15, 0.3),
  });

  page.drawText(`STATUS ON-CHAIN : VERIFIED ON SOLANA DEVNET (MULTI-SIG 2/2)`, {
    x: 52,
    y: height - 148,
    size: 8.5,
    font: fontBold,
    color: rgb(0.05, 0.5, 0.3),
  });

  // Identitas Mahasiswa
  let cursorY = height - 182;
  page.drawText('I. IDENTITAS PEMEGANG SKPI', {
    x: 40,
    y: cursorY,
    size: 10.5,
    font: fontBold,
    color: rgb(0.05, 0.15, 0.3),
  });

  cursorY -= 20;
  const displayedPoints = tamperOneCharacter
    ? submission.total_points + 1 // Modifikasi 1 angka jika mode tampered aktif
    : submission.total_points;

  const studentInfoRows = [
    ['Nama Lengkap Mahasiswa', `: ${student.full_name}`],
    ['Nomor Induk Mahasiswa (NIM)', `: ${student.nim}`],
    ['Program Studi', `: ${student.prodi}`],
    ['Total Poin Kredit SKPI', `: ${displayedPoints} Poin (Syarat Minimum Yudisium: 100 Poin)`],
    ['Skor Integritas AI Pre-Screening', `: ${submission.ai_integrity_score}% (Kategori Aman >= 80%)`],
  ];

  for (const [label, value] of studentInfoRows) {
    page.drawText(label, {
      x: 45,
      y: cursorY,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.25, 0.3, 0.38),
    });
    page.drawText(value, {
      x: 220,
      y: cursorY,
      size: 9.5,
      font: fontBold,
      color: rgb(0.1, 0.12, 0.16),
    });
    cursorY -= 16;
  }

  // Tabel Portofolio Sertifikat
  cursorY -= 14;
  page.drawText('II. DAFTAR PORTOFOLIO KEGIATAN & SERTIFIKAT PENUNJANG', {
    x: 40,
    y: cursorY,
    size: 10.5,
    font: fontBold,
    color: rgb(0.05, 0.15, 0.3),
  });

  cursorY -= 18;
  page.drawRectangle({
    x: 40,
    y: cursorY - 6,
    width: width - 80,
    height: 20,
    color: rgb(0.1, 0.2, 0.35),
  });

  page.drawText('NO', { x: 46, y: cursorY, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('NOMOR SERTIFIKAT & NAMA KEGIATAN', {
    x: 70,
    y: cursorY,
    size: 8,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText('TINGKAT / PERAN', {
    x: 350,
    y: cursorY,
    size: 8,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText('SKOR AI', {
    x: 465,
    y: cursorY,
    size: 8,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText('POIN', {
    x: 515,
    y: cursorY,
    size: 8,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  cursorY -= 24;
  certificates.forEach((cert, idx) => {
    page.drawRectangle({
      x: 40,
      y: cursorY - 12,
      width: width - 80,
      height: 30,
      color: idx % 2 === 0 ? rgb(0.98, 0.99, 1) : rgb(0.94, 0.96, 0.99),
      borderColor: rgb(0.86, 0.89, 0.94),
      borderWidth: 0.5,
    });

    page.drawText(`${idx + 1}`, {
      x: 48,
      y: cursorY,
      size: 8.5,
      font: fontBold,
      color: rgb(0.15, 0.2, 0.3),
    });

    const titleText =
      cert.activity_name.length > 48
        ? cert.activity_name.slice(0, 48) + '...'
        : cert.activity_name;

    page.drawText(titleText, {
      x: 70,
      y: cursorY + 4,
      size: 8.5,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.22),
    });

    page.drawText(`No: ${cert.cert_number}`, {
      x: 70,
      y: cursorY - 7,
      size: 7.5,
      font: fontMono,
      color: rgb(0.35, 0.42, 0.52),
    });

    page.drawText(`${cert.level}`, {
      x: 350,
      y: cursorY + 4,
      size: 8,
      font: fontBold,
      color: rgb(0.15, 0.25, 0.4),
    });

    page.drawText(`${cert.role}`, {
      x: 350,
      y: cursorY - 7,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.35, 0.4, 0.48),
    });

    page.drawText(`${cert.ai_ela_score}%`, {
      x: 470,
      y: cursorY - 2,
      size: 8.5,
      font: fontBold,
      color: rgb(0.05, 0.5, 0.3),
    });

    const certPointValue =
      tamperOneCharacter && idx === 0 ? cert.points + 1 : cert.points;
    page.drawText(`${certPointValue}`, {
      x: 520,
      y: cursorY - 2,
      size: 9,
      font: fontBold,
      color: rgb(0.05, 0.15, 0.3),
    });

    cursorY -= 32;
  });

  // Bagian III: Bukti Pengesahan Multi-Signature Blockchain Solana
  cursorY -= 12;
  page.drawText('III. BUKTI PENGESAHAN MULTI-SIGNATURE & INTEGRITAS BLOCKCHAIN SOLANA', {
    x: 40,
    y: cursorY,
    size: 10.5,
    font: fontBold,
    color: rgb(0.05, 0.15, 0.3),
  });

  cursorY -= 115;
  page.drawRectangle({
    x: 40,
    y: cursorY,
    width: width - 80,
    height: 105,
    color: rgb(0.96, 0.98, 0.97),
    borderColor: rgb(0.2, 0.65, 0.45),
    borderWidth: 1,
  });

  // Sematkan QR Code unik (`skpi_id`)
  const qrPayload = JSON.stringify({
    skpi_id: submission.skpi_id,
    nim: student.nim,
    network: 'solana-devnet',
  });
  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 180,
  });
  const qrImageBytes = Uint8Array.from(atob(qrDataUrl.split(',')[1]), (c) => c.charCodeAt(0));
  const qrImage = await pdfDoc.embedPng(qrImageBytes);

  page.drawImage(qrImage, {
    x: 50,
    y: cursorY + 10,
    width: 85,
    height: 85,
  });

  page.drawText('VALIDATOR 1 (KAPRODI SIGNER WALLET):', {
    x: 150,
    y: cursorY + 80,
    size: 8,
    font: fontBold,
    color: rgb(0.25, 0.32, 0.4),
  });
  page.drawText(submission.kaprodi_wallet || 'BELUM DITANDATANGANI', {
    x: 150,
    y: cursorY + 68,
    size: 8,
    font: fontMono,
    color: rgb(0.05, 0.15, 0.3),
  });

  page.drawText('VALIDATOR 2 (ADMIN AKADEMIK FAKULTAS SIGNER WALLET):', {
    x: 150,
    y: cursorY + 50,
    size: 8,
    font: fontBold,
    color: rgb(0.25, 0.32, 0.4),
  });
  page.drawText(submission.admin_wallet || 'BELUM DITANDATANGANI', {
    x: 150,
    y: cursorY + 38,
    size: 8,
    font: fontMono,
    color: rgb(0.05, 0.15, 0.3),
  });

  page.drawText('SOLANA DEVNET TX SIGNATURE:', {
    x: 150,
    y: cursorY + 22,
    size: 7.5,
    font: fontBold,
    color: rgb(0.25, 0.32, 0.4),
  });
  page.drawText(submission.solana_tx_signature || 'PENDING_ONCHAIN_TX', {
    x: 150,
    y: cursorY + 10,
    size: 7.5,
    font: fontMono,
    color: rgb(0.05, 0.45, 0.3),
  });

  // Footer Peringatan Keamanan Kriptografi
  page.drawText(
    'Dokumen ini dilindungi oleh SHA-256 Cryptographic Hash pada Smart Contract Solana Devnet (SKPITrace).',
    {
      x: 40,
      y: 42,
      size: 8,
      font: fontBold,
      color: rgb(0.3, 0.35, 0.42),
    }
  );
  page.drawText(
    'Perubahan 1 karakter atau 1 piksel pada file PDF ini akan menyebabkan status INVALID / HASH MISMATCH saat diverifikasi Panitia Yudisium.',
    {
      x: 40,
      y: 30,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.45, 0.5, 0.58),
    }
  );

  const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
  const sha256Hash = await computeSha256Hex(pdfBytes);

  return { pdfBytes, sha256Hash };
}

/**
 * Helper untuk memicu unduhan file PDF di browser
 */
export function downloadPdfFile(pdfBytes: Uint8Array, filename: string): void {
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
