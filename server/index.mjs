import http from 'node:http';
import { cariCatatan, susunKonteks } from './rag.mjs';
import {
  jalankanAgent,
  panggilGeminiGenerateContent,
  daftarkanBuktiOnchainSimulasi,
} from './agent.mjs';

const HOST = '127.0.0.1';
const PORT = 3001;
const MAX_BODY_BYTES = 20 * 1024; // Batas 20 KB sesuai Langkah 8

function getGeminiConfig() {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  const model = (process.env.GEMINI_MODEL || 'gemini-3.6-flash').trim();
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
  if (pathname === '/api/sync-bukti') {
    const { hashHex, skpi_id, pencatat, validator_kedua, total_poin, skor_ai, timestamp, pda_address, tx_signature } =
      body || {};
    daftarkanBuktiOnchainSimulasi(hashHex, {
      skpi_id: skpi_id || 'SKPI-FTIK-2026-CUSTOM',
      pencatat: pencatat || '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      validator_kedua: validator_kedua || '9pQrStUvWxYz123456789ABCDEFGHJKLMNPQRSTUVWXY',
      total_poin: Number(total_poin) || 100,
      skor_ai: Number(skor_ai) || 90,
      timestamp: Number(timestamp) || Math.floor(Date.now() / 1000),
      pda_address: pda_address || 'SKP189ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnop',
      tx_signature: tx_signature || '5SolDevnetSimulatedTx',
    });
    return kirimJson(res, 200, { ok: true });
  }

  // 1. Endpoint Langkah 8: POST /api/tanya (LLM Dasar Gemini)
  if (pathname === '/api/tanya') {
    const pertanyaan = validasiPertanyaan(body?.pertanyaan);
    if (!pertanyaan) {
      return kirimJson(res, 400, {
        error: 'Pertanyaan wajib diisi, maksimal 500 karakter.',
      });
    }

    const { apiKey, model } = getGeminiConfig();
    if (!apiKey) {
      const err = new Error('MISSING_API_KEY');
      err.status = 401;
      return kirimError(res, err);
    }

    try {
      const data = await panggilGeminiGenerateContent({
        apiKey,
        model,
        systemInstruction:
          'Kamu asisten aplikasi verifikasi dokumen SKPI mahasiswa (SKPITrace). Jawab singkat dalam bahasa Indonesia, tanpa format markdown. Kalau tidak tahu, bilang tidak tahu.',
        contents: [{ role: 'user', parts: [{ text: pertanyaan }] }],
        temperature: 0.3,
        maxOutputTokens: 1024,
      });

      const jawaban =
        data?.candidates?.[0]?.content?.parts
          ?.map((p) => p.text || '')
          .join('')
          .trim() || 'Tidak ada jawaban.';

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

    const daftarCatatan = cariCatatan(pertanyaan, 3);
    if (daftarCatatan.length === 0) {
      // Sesuai Langkah 10: Kalau tidak ada catatan yang cocok, langsung balas tanpa memanggil AI
      return kirimJson(res, 200, {
        jawaban: 'Belum ada catatan narasumber yang cocok dengan pertanyaan itu.',
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
    const systemPromptRag = `Kamu asisten verifikasi SKPI mahasiswa (SKPITrace). Jawab HANYA berdasarkan catatan di bawah dan sebut id catatan yang kamu pakai, misalnya [SKPI-01]. Jawab singkat tanpa format markdown. Kalau catatannya tidak cukup, bilang datanya belum ada. Jangan menyimpulkan dokumen pasti asli atau pasti palsu.\n\nCATATAN:\n${konteks}`;

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
          .trim() || 'Belum ada catatan narasumber yang cocok dengan pertanyaan itu.';

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
