import React, { useState } from 'react';
import { HelpCircle, Send, BookOpen, AlertCircle } from 'lucide-react';

interface SumberCatatan {
  id: string;
  judul: string;
}

interface TanyaAIProps {
  endpoint?: string;
}

export const TanyaAI: React.FC<TanyaAIProps> = ({ endpoint = '/api/tanya-rag' }) => {
  const [pertanyaan, setPertanyaan] = useState<string>('');
  const [jawaban, setJawaban] = useState<string>('');
  const [sumber, setSumber] = useState<SumberCatatan[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const contohPertanyaan = [
    'Berapa syarat minimum poin kredit SKPI untuk yudisium?',
    'Bagaimana pola format nomor surat sertifikat yang resmi?',
    'Kalau skor integritas dokumen di bawah 80 persen apakah pasti palsu?',
    'Bagaimana mekanisme konsensus multi-signature validator?',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = pertanyaan.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setErrorMsg('');
    setJawaban('');
    setSumber([]);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pertanyaan: trimmed }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setErrorMsg('Layanan backend belum aktif. Pastikan server dijalankan melalui npm run server.');
        return;
      }

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Terjadi kesalahan pada server pengetahuan akademik.');
        return;
      }

      setJawaban(data.jawaban || '');
      if (Array.isArray(data.sumber)) {
        setSumber(data.sumber);
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
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Pusat Informasi & Pedoman Aturan SKPI
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Pencarian otomatis berdasarkan dokumen pedoman resmi FTIK USM (<code>[SKPI-01]</code> s/d{' '}
              <code>[SKPI-06]</code>)
            </p>
          </div>
        </div>
        <span className="rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1 font-mono text-[11px] font-bold text-orange-700">
          Basis Data Regulasi
        </span>
      </div>

      {/* Contoh Pertanyaan Cepat */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {contohPertanyaan.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setPertanyaan(q)}
            className="rounded-lg border border-orange-200 bg-orange-50/50 px-2.5 py-1 text-[11px] font-semibold text-orange-800 hover:bg-orange-100 hover:border-orange-300 transition"
          >
            {q}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <textarea
            rows={3}
            maxLength={500}
            value={pertanyaan}
            onChange={(e) => setPertanyaan(e.target.value)}
            placeholder="Contoh: Berapa syarat minimum poin kredit SKPI untuk yudisium?"
            className="w-full rounded-xl border border-orange-200 bg-white p-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-orange-600 focus:outline-none"
          />
          <div className="mt-1 flex justify-between text-[11px] text-slate-500">
            <span>Sistem menyajikan rujukan berdasarkan pedoman baku akademik fakultas.</span>
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
          <Send className="h-3.5 w-3.5" />
          <span>{isLoading ? 'Memuat Pedoman...' : 'Cari Jawaban Pedoman'}</span>
        </button>
      </form>

      {errorMsg && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-orange-300 bg-orange-50 p-3 text-xs font-medium text-orange-900">
          <AlertCircle className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {jawaban && (
        <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50/40 p-4">
          <p className="whitespace-pre-wrap break-words text-xs sm:text-sm text-slate-800 leading-relaxed">
            {jawaban}
          </p>

          {sumber.length > 0 && (
            <div className="mt-3 flex items-center gap-1.5 border-t border-orange-200 pt-2.5 text-[11px] font-bold text-orange-700">
              <BookOpen className="h-3.5 w-3.5 shrink-0" />
              <span>
                Rujukan: {sumber.map((s) => `${s.id} ${s.judul}`).join(', ')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
