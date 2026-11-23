/**
 * Menghitung SHA-256 Hash (64 karakter heksadesimal) menggunakan Web Crypto API
 */
export async function computeSha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const buffer: ArrayBuffer =
    data instanceof Uint8Array
      ? (data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer)
      : data;
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Menghitung SHA-256 Hash langsung dari objek File yang diunggah pengguna
 */
export async function computeFileSha256Hex(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  return computeSha256Hex(arrayBuffer);
}

/**
 * Menghasilkan alamat PDA deterministik bergaya Base58 untuk SkpiRecord
 */
export async function deriveDeterministicPdaPreview(skpiId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`skpi_record:${skpiId}:SKP1TrAcE99xYzUvWxYz123456789ABCDEFGHJKLMNP`);
  const hex = await computeSha256Hex(data);
  const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = 'SKP1';
  for (let i = 0; i < 40; i++) {
    const byteVal = parseInt(hex.slice((i * 2) % 60, ((i * 2) % 60) + 2), 16);
    result += base58Chars[byteVal % base58Chars.length];
  }
  return result;
}
