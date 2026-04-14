import Link from 'next/link';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

interface Movement {
  id: string;
  move_type: string;
  amount: string;
  moved_at: string;
  note: string | null;
  item_name: string;
  batch_code: string;
  position: string | null;
}

async function getMovements(): Promise<Movement[]> {
  try {
    const rows = await db.execute(sql`
      SELECT
        inv.id,
        inv.move_type,
        inv.amount,
        inv.moved_at,
        inv.note,
        i.name AS item_name,
        b.batch_code,
        b.position
      FROM inventory inv
      JOIN items i ON i.id = inv.item_id
      JOIN batches b ON b.id = inv.batch_id
      ORDER BY inv.moved_at DESC
    `);
    return rows as unknown as Movement[];
  } catch {
    return [];
  }
}

export default async function SkladPage() {
  const movements = await getMovements();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sklad</h1>
          <p className="mt-1 text-sm text-gray-500">Přehled pohybů skladu</p>
        </div>
        <Link
          href="/sklad/prijem"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
        >
          + Příjem na sklad
        </Link>
      </div>

      {movements.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-400">
            Žádné pohyby. <Link href="/sklad/prijem" className="text-gray-900 underline">Naskladnit →</Link>
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Položka</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Šarže</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Pozice</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Typ</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Množství</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Datum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{m.item_name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.batch_code}</td>
                  <td className="px-4 py-3 text-gray-500">{m.position ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      m.move_type === 'příjem'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {m.move_type}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right tabular-nums font-medium ${
                    Number(m.amount) < 0 ? 'text-red-600' : 'text-emerald-600'
                  }`}>
                    {Number(m.amount) > 0 ? '+' : ''}{Number(m.amount).toLocaleString('cs')}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400">
                    {new Date(m.moved_at).toLocaleString('cs', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
