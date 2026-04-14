import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

interface BatchRow {
  id: string;
  batch_code: string;
  item_name: string;
  category_type: string;
  category_name: string;
  received_date: string;
  expires_at: string | null;
  position: string | null;
  grams_on_hand: string;
  reserved_grams: string;
}

async function getBatches(): Promise<BatchRow[]> {
  try {
    const rows = await db.execute(sql`
      SELECT
        b.id,
        b.batch_code,
        i.name AS item_name,
        c.type AS category_type,
        c.name AS category_name,
        b.received_date,
        b.expires_at,
        b.position,
        COALESCE(SUM(inv.amount), 0) AS grams_on_hand,
        COALESCE((
          SELECT SUM(pa.alloc_grams)
          FROM pick_allocations pa
          JOIN productions p ON p.id = pa.production_id
          WHERE pa.batch_id = b.id
            AND pa.status = 'reserved'
            AND p.status IN ('draft', 'in_progress')
        ), 0) AS reserved_grams
      FROM batches b
      JOIN items i ON i.id = b.item_id
      JOIN categories c ON c.id = i.category_id
      LEFT JOIN inventory inv ON inv.batch_id = b.id
      GROUP BY b.id, i.name, c.type, c.name
      ORDER BY b.received_date DESC, b.created_at DESC
    `);
    return rows as unknown as BatchRow[];
  } catch {
    return [];
  }
}

export default async function SarzePage() {
  const batches = await getBatches();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Šarže</h1>
        <p className="mt-1 text-sm text-gray-500">Přehled všech šarží s dostupností</p>
      </div>

      {batches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-400">Žádné šarže. Naskladněte první surovinu.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Kód šarže</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Položka</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Datum</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Pozice</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Celkem</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Rezervováno</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Dostupné</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 w-32">Dostupnost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {batches.map((b) => {
                const onHand = Number(b.grams_on_hand);
                const reserved = Number(b.reserved_grams);
                const available = onHand - reserved;
                const pct = onHand > 0 ? Math.max(0, (available / onHand) * 100) : 0;
                const unit = b.category_type === 'surovina' ? 'g' : 'ks';

                return (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{b.batch_code}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{b.item_name}</div>
                      <div className="text-xs text-gray-400">{b.category_name}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(b.received_date).toLocaleDateString('cs')}
                      {b.expires_at && (
                        <div className="text-orange-500">Exp: {new Date(b.expires_at).toLocaleDateString('cs')}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{b.position ?? '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                      {onHand.toLocaleString('cs')} {unit}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-amber-600">
                      {reserved > 0 ? `${reserved.toLocaleString('cs')} ${unit}` : '—'}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums font-medium ${
                      available <= 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}>
                      {available.toLocaleString('cs')} {unit}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct < 25 ? 'bg-red-400' : pct < 50 ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-8 text-right">{Math.round(pct)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
