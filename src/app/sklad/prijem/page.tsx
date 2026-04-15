'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Item {
  id: string;
  name: string;
  category_name?: string;
  category_type?: string;
}

function generateCode(name: string) {
  const prefix = name.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${yy}${mm}${dd}-${rand}`;
}

export default function PrijemPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [itemsError, setItemsError] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    itemId: '',
    amount: '',
    batchCode: '',
    position: '',
    expiresAt: '',
    note: '',
    receivedDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetch('/api/items')
      .then(async (r) => {
        const data = await r.json() as unknown;
        if (!r.ok) {
          setItemsError(String((data as Record<string, unknown>)?.error ?? 'Nepodařilo se načíst položky'));
          return;
        }
        if (Array.isArray(data)) setItems(data as Item[]);
      })
      .catch((e: unknown) => {
        setItemsError(e instanceof Error ? e.message : 'Nepodařilo se načíst položky');
      });
  }, []);

  function handleItemChange(itemId: string) {
    const item = items.find((i) => i.id === itemId);
    const code = item ? generateCode(item.name) : '';
    setForm({ ...form, itemId, batchCode: code });
  }

  const filteredItems = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.itemId) { setError('Vyberte položku'); return; }
    if (!form.amount || Number(form.amount) <= 0) { setError('Zadejte kladné množství'); return; }

    setLoading(true);
    setError('');

    const res = await fetch('/api/sklad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: form.itemId,
        amount: Number(form.amount),
        batchCode: form.batchCode || undefined,
        note: form.note || undefined,
        position: form.position || undefined,
        expiresAt: form.expiresAt || undefined,
        receivedDate: form.receivedDate || undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json() as { error?: string };
      setError(data.error ?? 'Chyba při příjmu');
      setLoading(false);
      return;
    }

    router.push('/sklad');
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <a href="/sklad" className="hover:text-gray-900">Sklad</a>
        <span>/</span>
        <span className="text-gray-900">Příjem na sklad</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Příjem na sklad</h1>
        <p className="mt-1 text-sm text-gray-500">Naskladnit surovinu nebo výrobek</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-6">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {itemsError && (
          <div className="rounded-lg bg-orange-50 border border-orange-200 px-4 py-3 text-sm text-orange-700">
            Chyba načítání položek: {itemsError}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vyhledat položku <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 mb-2"
            placeholder="Začněte psát název..."
          />
          <select
            required
            value={form.itemId}
            onChange={(e) => handleItemChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
            size={5}
          >
            <option value="">— Vyberte položku —</option>
            {filteredItems.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Množství (g nebo ks) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Datum příjmu</label>
            <input
              type="date"
              value={form.receivedDate}
              onChange={(e) => setForm({ ...form, receivedDate: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kód šarže
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.batchCode}
              onChange={(e) => setForm({ ...form, batchCode: e.target.value })}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-gray-500"
              placeholder="Automaticky vygenerovaný"
            />
            <button
              type="button"
              onClick={() => {
                const item = items.find((i) => i.id === form.itemId);
                if (item) setForm({ ...form, batchCode: generateCode(item.name) });
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
            >
              Generovat
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-400">Formát: NAZ-YYMMDD-XXXX. Pokud šarže existuje, pohyb se přidá k ní.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pozice ve skladu</label>
            <input
              type="text"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
              placeholder="A-01-01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expirace (volitelné)</label>
            <input
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Poznámka</label>
          <textarea
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
            placeholder="Volitelná poznámka k příjmu"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Naskladňuji…' : 'Naskladnit'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/sklad')}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Zrušit
          </button>
        </div>
      </form>
    </div>
  );
}
