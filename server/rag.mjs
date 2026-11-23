import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, 'data', 'pengetahuan-lokal.json');

const KATA_UMUM = new Set([
  'yang',
  'dan',
  'dari',
  'ini',
  'itu',
  'apa',
  'apakah',
  'gimana',
  'bagaimana',
  'dengan',
  'untuk',
  'atau',
  'nggak',
  'tidak',
  'kalau',
  'ada',
  'adalah',
  'saya',
  'aku',
  'kamu',
  'bisa',
  'produk',
  'masih',
  'skpi',
  'sertifikat',
  'dokumen',
  'mahasiswa',
]);

function bacaDataPengetahuan() {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function pecahKata(teks) {
  return String(teks || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((k) => k.length >= 3 && !KATA_UMUM.has(k));
}

function kataCocok(kataTanya, kataCatatan) {
  if (kataTanya === kataCatatan) return true;
  if (kataTanya.length >= 4 && kataCatatan.startsWith(kataTanya)) return true;
  if (kataCatatan.length >= 4 && kataTanya.startsWith(kataCatatan)) return true;
  return false;
}

/**
 * Mencari catatan pengetahuan lokal SKPI berdasarkan kecocokan kata kunci (Tanpa Database Vektor - Langkah 10)
 */
export function cariCatatan(pertanyaan, maks = 3) {
  const daftarCatatan = bacaDataPengetahuan();
  const kataPertanyaan = pecahKata(pertanyaan);

  if (kataPertanyaan.length === 0) {
    return [];
  }

  const hasilSkor = daftarCatatan
    .map((catatan) => {
      const gabunganCatatan = [
        ...pecahKata(catatan.judul),
        ...catatan.kata_kunci.flatMap((k) => pecahKata(k)),
        ...pecahKata(catatan.isi),
      ];

      let skor = 0;
      for (const kt of kataPertanyaan) {
        const cocok = gabunganCatatan.some((kc) => kataCocok(kt, kc));
        if (cocok) {
          skor += 1;
        }
      }

      return { catatan, skor };
    })
    .filter((item) => item.skor > 0)
    .sort((a, b) => b.skor - a.skor)
    .slice(0, maks)
    .map((item) => item.catatan);

  return hasilSkor;
}

/**
 * Menyusun konteks teks dari daftar catatan pengetahuan lokal untuk ditempel ke prompt AI
 */
export function susunKonteks(daftar) {
  return daftar
    .map(
      (item) =>
        `[${item.id}] ${item.judul} (${item.jenis}; sumber: ${item.sumber})\n${item.isi}`
    )
    .join('\n\n');
}
