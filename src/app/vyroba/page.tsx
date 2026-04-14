import Link from 'next/link';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

interface ProductionRow {
  id: string;
  product_item_name: string;
  recipe_version: string | null;
  batch_count: number;
  planned_date: string;
  output_batch_code: string | null;
  status: string;
  posted_at: string | null;
  notes: string | null;
  created_at: string;
}

async function getProductions(): Promise<ProductionRow[]> {
  try {
    const rows = await db.execute(sql`
      SELECT
        p.id,
        i.name AS product_item_name,
        r.version_note AS recipe_version,
        p.batch_count,
        p.planned_date,
        p.output_batch_code,
        p.status,
        p.posted_at,
        p.notes,
        p.created_at
      FROM productions p
      JOIN items i ON i.id = p.product_item_id
      JOIN recipes r ON r.id = p.recipe_id
      ORDER BY p.created_at DESC
    `);
    return rows as unknown as ProductionRow[];
  } catch {
    return [];
  }
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Koncept', cls: 'bg-gray-100 text-gray-600' },
  in_progress: { label: 'Probíhá', cls: 'bg-blue-100 text-blue-700' },
  posted: { label: 'Dokončeno', cls: 'bg-green-100 text-green-700' },
};

export default async function VyrobaPage() {
  const productions = await getProductions();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Výroba</h1>
          <p className="mt-1 text-sm text-gray-500">Výrobní dávky a jejich stav</p>
        </div>
        <Link
          href="/vyroba/nova"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
        >
          + Nová výroba
        </Link>
      </div>

      {productions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-400">
            Žádné výroby. <Link href="/vyroba/nova" className="text-gray-900 underline">Spustit první →</Link>
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Výrobek</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Receptura</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Dávky</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Datum</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Stav</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Výstupní šarže</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {productions.map((p) => {
                const sc = statusConfig[p.status] ?? { label: p.status, cls: 'bg-gray-100 text-gray-500' };
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={`/vyroba/${p.id}`} className="hover:underline">
                        {p.product_item_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.recipe_version ?? '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900">{p.batch_count}×</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(p.planned_date).toLocaleDateString('cs')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${sc.cls}`}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {p.output_batch_code ?? '—'}
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
