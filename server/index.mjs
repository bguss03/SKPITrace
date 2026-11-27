import http from 'node:http';
import { cariCatatan, susunKonteks } from './rag.mjs';
import {
  jalankanAgent,
  panggilGeminiGenerateContent,
  daftarkanBuktiOnchainSimulasi,
  PENCATAT_RESMI,
} from './agent.mjs';

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT) || 3001;
const MAX_BODY_BYTES = 20 * 1024; // Batas 20 KB sesuai Langkah 8
const PESAN_TIDAK_TERSEDIA =
  'Maaf, informasi tersebut belum tersedia dalam basis pengetahuan sistem.';

function getGeminiConfig() {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  const model = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
  return { apiKey, model };
}

function kirimJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

/**
 * Fungsi kirimError sesuai spesifikasi Langkah 8 (disesuaikan untuk Google Gemini API)
 */
function kirimError(res, err) {
  console.error('[Server AI Gemini Error]:', err);

  const status = err?.status || 500;
  const msg = String(err?.message || '');

  if (status === 429 || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate')) {
    return kirimJson(res, 429, {
      error: 'Kena batas pemakaian Gemini API. Tunggu sebentar lalu coba lagi.',
    });
  }

  if (
    status === 401 ||
    status === 403 ||
    msg.toLowerCase().includes('api key not valid') ||
    msg.toLowerCase().includes('api_key_invalid') ||
    msg.toLowerCase().includes('missing_api_key')
  ) {
    return kirimJson(res, 500, {
      error: 'API key Gemini salah atau belum diisi di server/.env (GEMINI_API_KEY=...).',
    });
  }

  if (
    err?.cause?.code === 'ENOTFOUND' ||
    err?.cause?.code === 'ECONNREFUSED' ||
    msg.toLowerCase().includes('fetch failed')
  ) {
    return kirimJson(res, 502, {
      error: 'Server nggak bisa menghubungi Google Gemini API. Cek koneksi internet.',
    });
  }

  if (status >= 400 && status < 500) {
    return kirimJson(res, 502, {
      error: `Gemini menolak permintaan: ${msg}`,
    });
  }

  return kirimJson(res, 500, {
    error: 'Server AI error. Cek terminal server.',
  });
}

function bacaBodyJson(req) {
  return new Promise((resolve, reject) => {
    let totalBytes = 0;
    const chunks = [];

    req.on('data', (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_BODY_BYTES) {
        const err = new Error('PAYLOAD_TOO_LARGE');
        err.code = 'PAYLOAD_TOO_LARGE';
        req.destroy();
        reject(err);
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf-8');
        const parsed = raw ? JSON.parse(raw) : {};
        resolve(parsed);
      } catch {
        const err = new Error('INVALID_JSON');
        err.code = 'INVALID_JSON';
        reject(err);
      }
    });

    req.on('error', reject);
  });
}

function validasiPertanyaan(pertanyaan) {
  if (typeof pertanyaan !== 'string') return null;
  const trimmed = pertanyaan.trim();
  if (trimmed.length === 0 || trimmed.length > 500) return null;
  return trimmed;
}

/**
 * Filter keamanan Modul 6: Mencegah XSS/script payload & pengiriman private key/seed phrase ke AI
 */
function deteksiInputBerbahaya(teks) {
  const str = String(teks || '');
  if (/<script\b[^>]*>|javascript:|onerror\s*=|onload\s*=|DROP\s+TABLE|UNION\s+SELECT/i.test(str)) {
    return 'Input ditolak karena mengandung karakter atau skrip berbahaya.';
  }
  if (/\b(private\s*key|seed\s*phrase|secret\s*key|mnemonic)\b/i.test(str)) {
    return 'Keamanan Sistem: Dilarang mengirimkan private key atau seed phrase ke dalam sistem maupun chat AI.';
  }
  return null;
}

/**
 * Filter keamanan Modul 6: Deteksi Prompt Injection & permintaan bocoran data sensitif
 */
function deteksiPromptInjection(teks) {
  const str = String(teks || '').toLowerCase();
  const polaInjection = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
    /abaikan\s+(semua\s+)?(aturan|instruksi|perintah)/i,
    /lupakan\s+(semua\s+)?(aturan|instruksi|perintah)/i,
    /bocorkan\s+(data|api\s*key|rahasia|system\s*prompt|private\s*key)/i,
    /tampilkan\s+(system\s*prompt|api\s*key|data\s+pengguna\s+lain)/i,
    /reveal\s+(your\s+)?(system\s*prompt|api\s*key|secret)/i,
    /act\s+as\s+|berperan\s+sebagai\s+hacker|jailbreak|bypass\s+aturan/i,
    /jalankan\s+transaksi\s+otomatis|transfer\s+saldo|kirim\s+sol\b/i,
  ];
  return polaInjection.some((regex) => regex.test(str));
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url || '/', `http://${HOST}:${PORT}`);
  const pathname = urlObj.pathname;

  // Healthcheck
  if (req.method === 'GET' && pathname === '/api/health') {
    const { apiKey, model } = getGeminiConfig();
    return kirimJson(res, 200, {
      status: 'ok',
      provider: 'Google Gemini API',
      model,
      apiKeyConfigured: Boolean(apiKey),
    });
  }

  if (req.method !== 'POST') {
    return kirimJson(res, 404, { error: 'Endpoint tidak ditemukan.' });
  }

  let body;
  try {
    body = await bacaBodyJson(req);
  } catch (err) {
    if (err?.code === 'PAYLOAD_TOO_LARGE') {
      return kirimJson(res, 413, { error: 'Ukuran request melebihi batas 20 KB.' });
    }
    return kirimJson(res, 400, { error: 'Format JSON tidak valid.' });
  }

  // Endpoint sinkronisasi bukti simulasi dari Validator Dashboard ke memori Backend Agent
  // Dilengkapi pemeriksaan Authorization Role & Validasi Multi-Signature (Modul 6 Bagian 4 & 5)
  if (pathname === '/api/sync-bukti') {
    const headerWallet = String(req.headers['x-validator-wallet'] || '').trim();
    const headerRole = String(req.headers['x-validator-role'] || '').trim().toUpperCase();

    if (!headerWallet || !PENCATAT_RESMI.has(headerWallet)) {
      return kirimJson(res, 403, {
        error:
          'Akses ditolak (403 Forbidden): Otorisasi gagal. Hanya wallet Validator Akademik resmi (Kaprodi / Admin Fakultas) yang diizinkan mencatat bukti on-chain.',
      });
    }

    if (headerRole && headerRole !== 'KAPRODI' && headerRole !== 'ADMIN_AKADEMIK') {
      return kirimJson(res, 403, {
        error: 'Akses ditolak (403 Forbidden): Role pengguna tidak memiliki hak akses validator.',
      });
    }

    const {
      hashHex,
      skpi_id,
      pencatat,
      validator_kedua,
      total_poin,
      skor_ai,
      timestamp,
      pda_address,
      tx_signature,
    } = body || {};

    const cleanHash = String(hashHex || '').trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(cleanHash)) {
      return kirimJson(res, 400, {
        error: 'Validasi ditolak: hashHex wajib berupa 64 karakter heksadesimal SHA-256.',
      });
    }

    const walletSign1 = String(pencatat || '').trim();
    const walletSign2 = String(validator_kedua || '').trim();
    if (
      !walletSign1 ||
      !walletSign2 ||
      walletSign1 === walletSign2 ||
      (!PENCATAT_RESMI.has(walletSign1) && !PENCATAT_RESMI.has(walletSign2))
    ) {
      return kirimJson(res, 403, {
        error:
          'Otorisasi Multi-Signature ditolak: Bukti on-chain wajib memiliki 2 wallet validator yang berbeda (Kaprodi & Admin Fakultas).',
      });
    }

    const numPoin = Number(total_poin) || 0;
    const numSkor = Number(skor_ai) || 0;
    if (numPoin < 100 || numSkor < 80) {
      return kirimJson(res, 400, {
        error: 'Validasi akademik ditolak: Total poin minimal 100 dan skor integritas minimal 80%.',
      });
    }

    daftarkanBuktiOnchainSimulasi(cleanHash, {
      skpi_id: String(skpi_id || 'SKPI-FTIK-2026-CUSTOM').trim(),
      pencatat: walletSign1,
      validator_kedua: walletSign2,
      total_poin: numPoin,
      skor_ai: numSkor,
      timestamp: Number(timestamp) || Math.floor(Date.now() / 1000),
      pda_address: String(pda_address || 'SKP189ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnop').trim(),
      tx_signature: String(tx_signature || '5SolDevnetSimulatedTx').trim(),
    });
    return kirimJson(res, 200, { ok: true });
  }

  // 1. Endpoint Langkah 8: POST /api/tanya (LLM Dasar Gemini dengan Guardrail Modul 6)
  if (pathname === '/api/tanya') {
    const pertanyaan = validasiPertanyaan(body?.pertanyaan);
    if (!pertanyaan) {
      return kirimJson(res, 400, {
        error: 'Pertanyaan wajib diisi, maksimal 500 karakter.',
      });
    }

    const bahaya = deteksiInputBerbahaya(pertanyaan);
    if (bahaya) {
      return kirimJson(res, 400, { error: bahaya });
    }

    if (deteksiPromptInjection(pertanyaan)) {
      return kirimJson(res, 200, {
        jawaban:
          'Permintaan ditolak oleh sistem keamanan AI: AI hanya boleh menjawab pertanyaan seputar sistem verifikasi SKPITrace, tidak boleh membocorkan data pengguna lain, dan tidak dapat menjalankan instruksi di luar batasan sistem.',
      });
    }

    const daftarCatatan = cariCatatan(pertanyaan, 3);
    if (daftarCatatan.length === 0) {
      return kirimJson(res, 200, {
        jawaban: PESAN_TIDAK_TERSEDIA,
      });
    }

    const { apiKey, model } = getGeminiConfig();
    if (!apiKey) {
      const err = new Error('MISSING_API_KEY');
      err.status = 401;
      return kirimError(res, err);
    }

    try {
      const konteks = susunKonteks(daftarCatatan);
      const data = await panggilGeminiGenerateContent({
        apiKey,
        model,
        systemInstruction: `Kamu asisten aplikasi verifikasi dokumen SKPI mahasiswa (SKPITrace).
Aturan:
- AI hanya boleh menjawab pertanyaan seputar sistem ini berdasarkan catatan yang diberikan.
- AI tidak boleh memberikan data pengguna lain.
- AI tidak boleh menjalankan transaksi tanpa konfirmasi pengguna.
- Jika informasi tidak tersedia, AI harus menjawab: "${PESAN_TIDAK_TERSEDIA}"
- Jawab singkat dalam bahasa Indonesia tanpa format markdown.\n\nCATATAN:\n${konteks}`,
        contents: [{ role: 'user', parts: [{ text: pertanyaan }] }],
        temperature: 0.2,
        maxOutputTokens: 1024,
      });

      const jawaban =
        data?.candidates?.[0]?.content?.parts
          ?.map((p) => p.text || '')
          .join('')
          .trim() || PESAN_TIDAK_TERSEDIA;

      return kirimJson(res, 200, { jawaban });
    } catch (err) {
      return kirimError(res, err);
    }
  }

  // 2. Endpoint Langkah 10: POST /api/tanya-rag (RAG dari server/data/pengetahuan-lokal.json)
  if (pathname === '/api/tanya-rag') {
    const pertanyaan = validasiPertanyaan(body?.pertanyaan);
    if (!pertanyaan) {
      return kirimJson(res, 400, {
        error: 'Pertanyaan wajib diisi, maksimal 500 karakter.',
      });
    }

    const bahaya = deteksiInputBerbahaya(pertanyaan);
    if (bahaya) {
      return kirimJson(res, 400, { error: bahaya });
    }

    if (deteksiPromptInjection(pertanyaan)) {
      return kirimJson(res, 200, {
        jawaban:
          'Permintaan ditolak oleh sistem keamanan AI: AI hanya boleh menjawab pertanyaan seputar pedoman SKPITrace, tidak boleh memberikan data pengguna lain, dan tidak mengikuti instruksi yang melanggar aturan sistem.',
        sumber: [],
      });
    }

    const daftarCatatan = cariCatatan(pertanyaan, 3);
    if (daftarCatatan.length === 0) {
      // Sesuai Modul 6 & Langkah 10: Kalau tidak ada catatan yang cocok, langsung balas tanpa memanggil AI
      return kirimJson(res, 200, {
        jawaban: PESAN_TIDAK_TERSEDIA,
        sumber: [],
      });
    }

    const { apiKey, model } = getGeminiConfig();
    if (!apiKey) {
      const err = new Error('MISSING_API_KEY');
      err.status = 401;
      return kirimError(res, err);
    }

    const konteks = susunKonteks(daftarCatatan);
    const systemPromptRag = `Kamu asisten verifikasi SKPI mahasiswa (SKPITrace).
Aturan Wajib:
1. AI hanya boleh menjawab pertanyaan seputar sistem ini HANYA berdasarkan catatan di bawah dan sebut id catatan yang dipakai, misalnya [SKPI-01].
2. AI tidak boleh memberikan data pribadi pengguna lain dan tidak boleh menjalankan transaksi tanpa konfirmasi pengguna.
3. Jangan menyimpulkan dokumen pasti asli atau pasti palsu (output AI adalah saran/indikator, bukan keputusan otomatis).
4. Jika informasi tidak tersedia di catatan, jawab persis: "${PESAN_TIDAK_TERSEDIA}"
5. Jawab singkat tanpa format markdown.\n\nCATATAN:\n${konteks}`;

    try {
      const data = await panggilGeminiGenerateContent({
        apiKey,
        model,
        systemInstruction: systemPromptRag,
        contents: [{ role: 'user', parts: [{ text: pertanyaan }] }],
        temperature: 0.2,
        maxOutputTokens: 1024,
      });

      const jawaban =
        data?.candidates?.[0]?.content?.parts
          ?.map((p) => p.text || '')
          .join('')
          .trim() || PESAN_TIDAK_TERSEDIA;

      const sumber = daftarCatatan.map((c) => ({ id: c.id, judul: c.judul }));
      return kirimJson(res, 200, { jawaban, sumber });
    } catch (err) {
      return kirimError(res, err);
    }
  }

  // 3. Endpoint Langkah 11: POST /api/agent (AI Agent + Tool Calling Solana Devnet & RAG)
  if (pathname === '/api/agent') {
    const pertanyaan = validasiPertanyaan(body?.pertanyaan);
    if (!pertanyaan) {
      return kirimJson(res, 400, {
        error: 'Pertanyaan wajib diisi, maksimal 500 karakter.',
      });
    }

    const bahaya = deteksiInputBerbahaya(pertanyaan);
    if (bahaya) {
      return kirimJson(res, 400, { error: bahaya });
    }

    if (deteksiPromptInjection(pertanyaan)) {
      return kirimJson(res, 200, {
        jawaban:
          'Permintaan ditolak oleh sistem keamanan AI: AI Agent berjalan dalam mode Read-Only, menolak instruksi berbahaya (prompt injection), tidak dapat membocorkan data pengguna lain, dan hanya menjawab pertanyaan terkait verifikasi SKPI.',
        jejak: [],
      });
    }

    const rawHash = body?.hashHex ? String(body.hashHex).trim().toLowerCase() : '';
    if (rawHash && !/^[0-9a-f]{64}$/.test(rawHash)) {
      return kirimJson(res, 400, {
        error: 'Hash harus 64 karakter heksadesimal.',
      });
    }

    const { apiKey, model } = getGeminiConfig();
    if (!apiKey) {
      const err = new Error('MISSING_API_KEY');
      err.status = 401;
      return kirimError(res, err);
    }

    try {
      const hasil = await jalankanAgent(apiKey, model, pertanyaan, rawHash);
      return kirimJson(res, 200, hasil);
    } catch (err) {
      return kirimError(res, err);
    }
  }

  return kirimJson(res, 404, { error: 'Endpoint tidak ditemukan.' });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Server AI sudah berjalan di http://${HOST}:${PORT}`);
    process.exit(0);
  }
  console.error(`Server gagal jalan: ${err.message}`);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`Server AI jalan di http://${HOST}:${PORT}`);
});
