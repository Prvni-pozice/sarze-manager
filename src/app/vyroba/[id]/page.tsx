'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface PickLine {
  id: string;
  ingredient_item_name: string;
  batch_code: string | null;
  batch_id: string | null;
  grams_needed: string;
  grams_to_issue: string;
  batch_grams_on_hand: string;
  batch_reserved: string;
}

interface Production {
  id: string;
  product_item_name: string;
  recipe_id: string;
  recipe_output_qty: number;
  recipe_version: string | null;
  batch_count: number;
  planned_date: string;
  output_batch_code: string | null;
  status: string;
  posted_at: string | null;
  notes: string | null;
  pickLines: PickLine[];
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Koncept', cls: 'bg-gray-100 text-gray-600' },
  in_progress: { label: 'Probíhá', cls: 'bg-blue-100 text-blue-700' },
  posted: { label: 'Dokončeno', cls: 'bg-green-100 text-green-700' },
};

export default function VyrobaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [production, setProduction] = useState<Production | null>(null);
  const [loadingPicklines, setLoadingPicklines] = useState(false);
  const [loadingDokoncit, setLoadingDokoncit] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    const res = await fetch(`/api/vyroba/${id}`);
    if (!res.ok) return;
    const data = await res.json() as Production;
    setProduction(data);
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function handlePicklines() {
    setLoadingPicklines(true);
    setError('');
    const res = await fetch(`/api/vyroba/${id}/picklines`, { method: 'POST' });
    if (!res.ok) {
      const data = await res.json() as { error?: string };
      setError(data.error ?? 'Chyba při generování pick lines');
    } else {
      setSuccess('Pick lines vygenerovány');
      await load();
    }
    setLoadingPicklines(false);
  }

  async function handleDokoncit() {
    if (!confirm('Opravdu dokončit výrobu? Suroviny budou vydány ze skladu.')) return;
    setLoadingDokoncit(true);
    setError('');
    const res = await fetch(`/api/vyroba/${id}/dokoncit`, { method: 'POST' });
    const data = await res.json() as { error?: string; outputBatchCode?: string; totalQty?: number };
    if (!res.ok) {
      setError(data.error ?? 'Chyba při dokončení výroby');
    } else {
      setSuccess(`Výroba dokončena! Vyrobeno ${data.totalQty} ks, šarže ${data.outputBatchCode}`);
      await load();
    }
    setLoadingDokoncit(false);
  }

  if (!production) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-sm text-gray-400">Načítám…</div>
      </div>
    );
  }

  const sc = statusConfig[production.status] ?? { label: production.status, cls: 'bg-gray-100' };
  const hasPickLines = production.pickLines && production.pickLines.length > 0;
  const hasShortage = production.pickLines.some((pl) => !pl.batch_id);
  const shortageLines = production.pickLines.filter((pl) => !pl.batch_id);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/vyroba" className="hover:text-gray-900">Výroba</Link>
        <span>/</span>
        <span className="text-gray-900">{production.product_item_name}</span>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>
      )}

      {/* Hlavička výroby */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{production.product_item_name}</h1>
            {production.notes && <p className="mt-0.5 text-sm text-gray-500">{production.notes}</p>}
          </div>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${sc.cls}`}>
            {sc.label}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-xs text-gray-500">Počet dávek</dt>
            <dd className="mt-0.5 font-semibold text-gray-900">{production.batch_count}×</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Výstup</dt>
            <dd className="mt-0.5 font-semibold text-gray-900">
              {production.batch_count * production.recipe_output_qty} ks
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Plán. datum</dt>
            <dd className="mt-0.5 font-semibold text-gray-900">
              {new Date(production.planned_date).toLocaleDateString('cs')}
            </dd>
          </div>
          {production.output_batch_code && (
            <div>
              <dt className="text-xs text-gray-500">Výstupní šarže</dt>
              <dd className="mt-0.5 font-mono text-xs text-gray-900">{production.output_batch_code}</dd>
            </div>
          )}
          {production.recipe_version && (
            <div>
              <dt className="text-xs text-gray-500">Receptura</dt>
              <dd className="mt-0.5 text-gray-900">{production.recipe_version}</dd>
            </div>
          )}
        </div>

        {/* Akce */}
        {production.status !== 'posted' && (
          <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap gap-3">
            {production.status === 'draft' && (
              <button
                onClick={handlePicklines}
                disabled={loadingPicklines}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loadingPicklines ? 'Generuji…' : 'Vygenerovat pick lines'}
              </button>
            )}
            {production.status === 'in_progress' && (
              <>
                <button
                  onClick={handlePicklines}
                  disabled={loadingPicklines}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {loadingPicklines ? 'Generuji…' : 'Přegenerovat pick lines'}
                </button>
                <button
                  onClick={handleDokoncit}
                  disabled={loadingDokoncit || hasShortage}
                  title={hasShortage ? 'Nelze dokončit — chybí suroviny' : undefined}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingDokoncit ? 'Dokončuji…' : 'Dokončit výrobu'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Shortage varování */}
      {hasShortage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <h3 className="text-sm font-semibold text-red-800 mb-2">Nedostatečné zásoby</h3>
          <ul className="space-y-1">
            {shortageLines.map((pl) => (
              <li key={pl.id} className="text-sm text-red-700">
                Chybí <strong>{Number(pl.grams_to_issue).toLocaleString('cs')} g</strong> suroviny <strong>{pl.ingredient_item_name}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pick lines tabulka */}
      {hasPickLines && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">Pick Lines</h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Surovina</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Šarže</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Potřeba (g)</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">K výdeji (g)</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Dostupné</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Stav</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {production.pickLines.map((pl) => {
                  const available = Number(pl.batch_grams_on_hand) - Number(pl.batch_reserved);
                  const isShortage = !pl.batch_id;

                  return (
                    <tr key={pl.id} className={`hover:bg-gray-50 ${isShortage ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">{pl.ingredient_item_name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {pl.batch_code ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                        {Number(pl.grams_needed).toLocaleString('cs')}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900">
                        {Number(pl.grams_to_issue).toLocaleString('cs')}
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums ${isShortage ? 'text-gray-400' : available > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isShortage ? '—' : available.toLocaleString('cs')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isShortage ? (
                          <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">
                            shortage
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">
                            ok
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!hasPickLines && production.status === 'draft' && (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-400">
            Výroba nemá žádné pick lines. Klikněte na „Vygenerovat pick lines" výše.
          </p>
        </div>
      )}

      <div className="pt-2">
        <button
          onClick={() => router.push('/vyroba')}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Zpět na výroby
        </button>
      </div>
    </div>
  );
}
