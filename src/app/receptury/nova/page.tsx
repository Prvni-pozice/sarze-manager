'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Item {
  id: string;
  name: string;
  category_type: string;
}

interface IngredientLine {
  ingredientItemId: string;
  gramsPerPiece: string;
}

export default function NovaRecepturaPage() {
  const router = useRouter();
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    productItemId: '',
    outputQty: '1',
    versionNote: '',
  });

  const [lines, setLines] = useState<IngredientLine[]>([
    { ingredientItemId: '', gramsPerPiece: '' },
  ]);

  useEffect(() => {
    fetch('/api/items')
      .then(async (r) => {
        const data = await r.json() as unknown;
        if (r.ok && Array.isArray(data)) setAllItems(data as Item[]);
      })
      .catch(() => {/* tiché selhání — uživatel uvidí prázdný select */});
  }, []);

  const productItems = allItems.filter((i) => i.category_type === 'výrobek');
  const ingredientItems = allItems.filter((i) => i.category_type === 'surovina');

  function addLine() {
    setLines([...lines, { ingredientItemId: '', gramsPerPiece: '' }]);
  }

  function removeLine(idx: number) {
    setLines(lines.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, field: keyof IngredientLine, value: string) {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    setLines(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.productItemId) { setError('Vyberte výrobek'); return; }
    if (!form.outputQty || Number(form.outputQty) < 1) { setError('Počet kusů musí být ≥ 1'); return; }
    if (lines.some((l) => !l.ingredientItemId || !l.gramsPerPiece)) {
      setError('Vyplňte všechny ingredience');
      return;
    }

    setLoading(true);
    setError('');

    const res = await fetch('/api/receptury', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productItemId: form.productItemId,
        outputQty: Number(form.outputQty),
        versionNote: form.versionNote || undefined,
        lines: lines.map((l) => ({
          ingredientItemId: l.ingredientItemId,
          gramsPerPiece: Number(l.gramsPerPiece),
        })),
      }),
    });

    if (!res.ok) {
      const data = await res.json() as { error?: string };
      setError(data.error ?? 'Chyba');
      setLoading(false);
      return;
    }

    const data = await res.json() as { id: string };
    router.push(`/receptury/${data.id}`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <a href="/receptury" className="hover:text-gray-900">Receptury</a>
        <span>/</span>
        <span className="text-gray-900">Nová receptura</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nová receptura</h1>
        <p className="mt-1 text-sm text-gray-500">Definujte složení výrobku a normy spotřeby</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-gray-200 bg-white p-6">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Výrobek <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.productItemId}
              onChange={(e) => setForm({ ...form, productItemId: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
            >
              <option value="">— Vyberte výrobek —</option>
              {productItems.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kusů z 1 dávky <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="1"
              step="1"
              value={form.outputQty}
              onChange={(e) => setForm({ ...form, outputQty: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Poznámka k verzi</label>
          <input
            type="text"
            value={form.versionNote}
            onChange={(e) => setForm({ ...form, versionNote: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
            placeholder="v1.0 - základní receptura"
          />
        </div>

        {/* Ingredience */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">
              Ingredience <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={addLine}
              className="text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg px-3 py-1"
            >
              + Přidat ingredienci
            </button>
          </div>

          <div className="space-y-2">
            {lines.map((line, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <select
                  required
                  value={line.ingredientItemId}
                  onChange={(e) => updateLine(idx, 'ingredientItemId', e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
                >
                  <option value="">— Surovina —</option>
                  {ingredientItems.map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={line.gramsPerPiece}
                    onChange={(e) => updateLine(idx, 'gramsPerPiece', e.target.value)}
                    className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-400">g/ks</span>
                </div>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    className="text-red-400 hover:text-red-600 px-2"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Ukládám…' : 'Uložit recepturu'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/receptury')}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Zrušit
          </button>
        </div>
      </form>
    </div>
  );
}
