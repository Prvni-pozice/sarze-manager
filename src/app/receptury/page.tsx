import Link from 'next/link';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

interface RecipeRow {
  id: string;
  product_item_name: string;
  output_qty: number;
  version_note: string | null;
  is_active: boolean;
  created_at: string;
  line_count: string;
}

async function getRecipes(): Promise<RecipeRow[]> {
  try {
    const rows = await db.execute(sql`
      SELECT
        r.id,
        i.name AS product_item_name,
        r.output_qty,
        r.version_note,
        r.is_active,
        r.created_at,
        COUNT(rl.id) AS line_count
      FROM recipes r
      JOIN items i ON i.id = r.product_item_id
      LEFT JOIN recipe_lines rl ON rl.recipe_id = r.id
      GROUP BY r.id, i.name
      ORDER BY r.created_at DESC
    `);
    return rows as unknown as RecipeRow[];
  } catch {
    return [];
  }
}

export default async function RecepturyPage() {
  const recipes = await getRecipes();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receptury</h1>
          <p className="mt-1 text-sm text-gray-500">Složení výrobků a normy spotřeby</p>
        </div>
        <Link
          href="/receptury/nova"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
        >
          + Nová receptura
        </Link>
      </div>

      {recipes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-400">
            Žádné receptury. <Link href="/receptury/nova" className="text-gray-900 underline">Přidat první →</Link>
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {recipes.map((r) => (
            <Link
              key={r.id}
              href={`/receptury/${r.id}`}
              className="block rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{r.product_item_name}</h3>
                  {r.version_note && (
                    <p className="mt-0.5 text-sm text-gray-500">{r.version_note}</p>
                  )}
                </div>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  r.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {r.is_active ? 'aktivní' : 'neaktivní'}
                </span>
              </div>
              <div className="mt-3 flex gap-6 text-sm text-gray-500">
                <span>Výstup: <strong className="text-gray-900">{r.output_qty} ks / dávka</strong></span>
                <span>Ingredience: <strong className="text-gray-900">{r.line_count}</strong></span>
                <span>Vytvořeno: {new Date(r.created_at).toLocaleDateString('cs')}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
