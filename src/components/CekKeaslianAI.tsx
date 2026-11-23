import React, { useState } from 'react';
import { ShieldCheck, FileSearch, AlertCircle, Database } from 'lucide-react';

interface JejakTool {
  tool: string;
  output: unknown;
}

export const CekKeaslianAI: React.FC = () => {
  const [pertanyaan, setPertanyaan] = useState<string>(
    'Dokumen SKPI ini sudah tercatat belum? Siapa yang mencatat dan apakah memenuhi syarat poin yudisium?'
  );
  const [hashHex, setHashHex] = useState<string>('');
  const [namaFile, setNamaFile] = useState<string>('');
  const [jawaban, setJawaban] = useState<string>('');
  const [jejak, setJejak] = useState<JejakTool[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const hitungSha256File = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const digest = await window.crypto.subtle.digest('SHA-256', buffer);
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toLowerCase();
    setHashHex(hex);
    setNamaFile(file.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = pertanyaan.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setErrorMsg('');
    setJawaban('');
    setJejak([]);

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pertanyaan: trimmed,
          hashHex: hashHex || undefined,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setErrorMsg('Layanan backend belum aktif. Pastikan server dijalankan melalui npm run server.');
        return;
      }

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Terjadi kesalahan pada server pemeriksa on-chain.');
        return;
      }

      setJawaban(data.jawaban || '');
      if (Array.isArray(data.jejak)) {
        setJejak(data.jejak);
      }
    } catch {
      setErrorMsg('Layanan backend belum aktif. Pastikan server dijalankan melalui npm run server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-orange-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-orange-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Inspeksi Bukti On-Chain & Audit Hash Dokumen
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Pengecekan otomatis ke fungsi <code>cek_bukti_onchain</code> &{' '}
              <code>cari_pengetahuan_lokal</code> pada jaringan Solana Devnet
            </p>
          </div>
        </div>
        <span className="rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1 font-mono text-[11px] font-bold text-orange-700">
          Inspektor On-Chain
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Input File */}
        <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-3.5">
          <label className="block text-xs font-bold text-slate-800 mb-2">
            Pilih File Dokumen PDF SKPI:
          </label>

          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) hitungSha256File(f);
            }}
            className="block w-full text-xs text-slate-700 file:mr-3 file:rounded-lg file:border file:border-orange-200 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-orange-700 hover:file:bg-orange-50"
          />

          <p className="mt-1.5 text-[11px] text-slate-500">
            File diproses secara lokal di browser. Hanya nilai hash SHA-256 yang dicocokkan ke state blockchain.
          </p>

          {hashHex && (
            <div className="mt-2 rounded-lg border border-orange-200 bg-white px-2.5 py-1.5 font-mono text-[11px]">
              <div className="text-slate-500">
                File: <span className="font-bold text-slate-900">{namaFile}</span>
              </div>
              <div className="break-all font-bold text-orange-700">SHA-256: {hashHex}</div>
            </div>
          )}
        </div>

        {/* Textarea Pertanyaan */}
        <div>
          <textarea
            rows={3}
            maxLength={500}
            value={pertanyaan}
            onChange={(e) => setPertanyaan(e.target.value)}
            className="w-full rounded-xl border border-orange-200 bg-white p-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-orange-600 focus:outline-none"
          />
          <div className="mt-1 flex justify-between text-[11px] text-slate-500">
            <span>Pemeriksaan bukti transaksi dilakukan secara read-only tanpa membutuhkan akses dompet.</span>
            <span>{pertanyaan.length}/500</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={!pertanyaan.trim() || isLoading}
          className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-extrabold transition ${
            !pertanyaan.trim() || isLoading
              ? 'cursor-not-allowed bg-orange-100 text-orange-400'
              : 'bg-orange-600 text-white hover:bg-orange-700 shadow-sm'
          }`}
        >
          <FileSearch className="h-3.5 w-3.5" />
          <span>{isLoading ? 'Memeriksa State On-Chain...' : 'Periksa Bukti On-Chain'}</span>
        </button>
      </form>

      {errorMsg && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-orange-300 bg-orange-50 p-3 text-xs font-medium text-orange-900">
          <AlertCircle className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Jejak Pemanggilan Tool & Jawaban Akhir */}
      {(jejak.length > 0 || jawaban) && (
        <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50/40 p-4 space-y-3">
          {jejak.length > 0 && (
            <ul className="space-y-1.5 border-b border-orange-200 pb-3 text-[11px] font-mono text-slate-600">
              {jejak.map((item, idx) => {
                const jsonStr = JSON.stringify(item.output);
                const potong120 =
                  jsonStr.length > 120 ? `${jsonStr.slice(0, 120)}...` : jsonStr;
                return (
                  <li key={idx} className="break-all rounded bg-white border border-orange-100 px-2.5 py-1.5">
                    <span className="text-orange-700 font-bold">
                      Eksekusi Fungsi {item.tool}:
                    </span>{' '}
                    <span>{potong120}</span>
                  </li>
                );
              })}
            </ul>
          )}

          {jawaban && (
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
              <p className="whitespace-pre-wrap break-words text-xs sm:text-sm text-slate-800 leading-relaxed">
                {jawaban}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
