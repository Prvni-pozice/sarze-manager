'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Item {
  id: string;
  name: string;
  category_type: string;
}

interface Recipe {
  id: string;
  product_item_id: string;
  product_item_name: string;
  output_qty: number;
  version_note: string | null;
}

export default function NovaVyrobaPage() {
  const router = useRouter();
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    productItemId: '',
    recipeId: '',
    batchCount: '1',
    plannedDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/items').then((r) => r.json()),
      fetch('/api/receptury').then((r) => r.json()),
    ]).then(([items, recipes]) => {
      setAllItems(items as Item[]);
      setAllRecipes(recipes as Recipe[]);
    });
  }, []);

  const productItems = allItems.filter((i) => i.category_type === 'výrobek');
  const filteredRecipes = allRecipes.filter(
    (r) => !form.productItemId || r.product_item_id === form.productItemId
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.productItemId) { setError('Vyberte výrobek'); return; }
    if (!form.recipeId) { setError('Vyberte recepturu'); return; }
    if (!form.batchCount || Number(form.batchCount) < 1) { setError('Počet dávek musí být ≥ 1'); return; }

    setLoading(true);
    setError('');

    const res = await fetch('/api/vyroba', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productItemId: form.productItemId,
        recipeId: form.recipeId,
        batchCount: Number(form.batchCount),
        plannedDate: form.plannedDate,
        notes: form.notes || undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json() as { error?: string };
      setError(data.error ?? 'Chyba');
      setLoading(false);
      return;
    }

    const data = await res.json() as { id: string };
    router.push(`/vyroba/${data.id}`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <a href="/vyroba" className="hover:text-gray-900">Výroba</a>
        <span>/</span>
        <span className="text-gray-900">Nová výroba</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nová výroba</h1>
        <p className="mt-1 text-sm text-gray-500">Zahájit výrobní dávku</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-6">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Výrobek <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={form.productItemId}
            onChange={(e) => setForm({ ...form, productItemId: e.target.value, recipeId: '' })}
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
            Receptura <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={form.recipeId}
            onChange={(e) => setForm({ ...form, recipeId: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
            disabled={!form.productItemId}
          >
            <option value="">— Vyberte recepturu —</option>
            {filteredRecipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.version_note ?? 'bez verze'} (výstup: {r.output_qty} ks)
              </option>
            ))}
          </select>
          {form.productItemId && filteredRecipes.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">Pro tento výrobek neexistuje žádná receptura. <a href="/receptury/nova" className="underline">Vytvořit recepturu →</a></p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Počet dávek <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="1"
              step="1"
              value={form.batchCount}
              onChange={(e) => setForm({ ...form, batchCount: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Datum výroby</label>
            <input
              type="date"
              value={form.plannedDate}
              onChange={(e) => setForm({ ...form, plannedDate: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Poznámka</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
            placeholder="Volitelná poznámka"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Vytvářím…' : 'Vytvořit výrobu'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/vyroba')}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Zrušit
          </button>
        </div>
      </form>
    </div>
  );
}
