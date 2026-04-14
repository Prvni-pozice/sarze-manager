import Link from 'next/link';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';

interface RecipeLine {
  id: string;
  ingredient_item_id: string;
  ingredient_item_name: string;
  grams_per_piece: string;
}

interface RecipeDetail {
  id: string;
  product_item_id: string;
  product_item_name: string;
  output_qty: number;
  version_note: string | null;
  is_active: boolean;
  created_at: string;
  lines: RecipeLine[];
}

async function getRecipe(id: string): Promise<RecipeDetail | null> {
  try {
    const [recipe] = await db.execute(sql`
      SELECT
        r.id,
        r.product_item_id,
        i.name AS product_item_name,
        r.output_qty,
        r.version_note,
        r.is_active,
        r.created_at
      FROM recipes r
      JOIN items i ON i.id = r.product_item_id
      WHERE r.id = ${id}
      LIMIT 1
    `);

    if (!recipe) return null;

    const lines = await db.execute(sql`
      SELECT
        rl.id,
        rl.ingredient_item_id,
        ii.name AS ingredient_item_name,
        rl.grams_per_piece
      FROM recipe_lines rl
      JOIN items ii ON ii.id = rl.ingredient_item_id
      WHERE rl.recipe_id = ${id}
      ORDER BY rl.id ASC
    `);

    return {
      ...(recipe as unknown as RecipeDetail),
      lines: lines as unknown as RecipeLine[],
    };
  } catch {
    return null;
  }
}

export default async function RecepturaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/receptury" className="hover:text-gray-900">Receptury</Link>
        <span>/</span>
        <span className="text-gray-900">{recipe.product_item_name}</span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{recipe.product_item_name}</h1>
            {recipe.version_note && (
              <p className="mt-0.5 text-sm text-gray-500">{recipe.version_note}</p>
            )}
          </div>
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            recipe.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {recipe.is_active ? 'aktivní' : 'neaktivní'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-100">
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Výstup z dávky</dt>
            <dd className="mt-1 text-lg font-bold text-gray-900">{recipe.output_qty} ks</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vytvořeno</dt>
            <dd className="mt-1 text-sm text-gray-900">{new Date(recipe.created_at).toLocaleDateString('cs')}</dd>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Složení (na 1 kus)</h2>
          <div className="space-y-2">
            {recipe.lines.map((line) => (
              <div key={line.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2">
                <span className="text-sm font-medium text-gray-900">{line.ingredient_item_name}</span>
                <span className="text-sm tabular-nums text-gray-600">
                  {Number(line.grams_per_piece).toLocaleString('cs')} g/ks
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <Link
            href="/vyroba/nova"
            className="inline-flex rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
          >
            Spustit výrobu
          </Link>
        </div>
      </div>
    </div>
  );
}
