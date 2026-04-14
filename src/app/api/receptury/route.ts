import { db } from '@/lib/db';
import { recipes, recipeLines } from '@/db/schema';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const rows = await db.execute(sql`
      SELECT
        r.id,
        r.product_item_id,
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

    return Response.json(rows);
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Chyba při načítání receptur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      productItemId: string;
      outputQty: number;
      versionNote?: string;
      lines: Array<{ ingredientItemId: string; gramsPerPiece: number }>;
    };

    if (!body.productItemId) return Response.json({ error: 'productItemId je povinný' }, { status: 400 });
    if (!body.outputQty || body.outputQty < 1) return Response.json({ error: 'outputQty musí být ≥ 1' }, { status: 400 });
    if (!body.lines || body.lines.length === 0) return Response.json({ error: 'Receptura musí mít alespoň jednu ingredienci' }, { status: 400 });

    const [recipe] = await db.insert(recipes).values({
      productItemId: body.productItemId,
      outputQty: body.outputQty,
      versionNote: body.versionNote || null,
      isActive: true,
    }).returning();

    const lineValues = body.lines.map((l) => ({
      recipeId: recipe.id,
      ingredientItemId: l.ingredientItemId,
      gramsPerPiece: String(l.gramsPerPiece),
    }));

    const insertedLines = await db.insert(recipeLines).values(lineValues).returning();

    return Response.json({ ...recipe, lines: insertedLines }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Chyba při vytváření receptury' }, { status: 500 });
  }
}
