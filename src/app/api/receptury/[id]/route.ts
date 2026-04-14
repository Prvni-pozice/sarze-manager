import { db } from '@/lib/db';
import { recipes, recipeLines } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    if (!recipe) return Response.json({ error: 'Receptura nenalezena' }, { status: 404 });

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

    return Response.json({ ...recipe, lines });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Chyba při načítání receptury' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as {
      versionNote?: string;
      isActive?: boolean;
      outputQty?: number;
    };

    const [recipe] = await db.update(recipes)
      .set({
        ...(body.versionNote !== undefined && { versionNote: body.versionNote }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.outputQty !== undefined && { outputQty: body.outputQty }),
      })
      .where(eq(recipes.id, id))
      .returning();

    if (!recipe) return Response.json({ error: 'Receptura nenalezena' }, { status: 404 });
    return Response.json(recipe);
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Chyba při aktualizaci receptury' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.delete(recipeLines).where(eq(recipeLines.recipeId, id));
    await db.delete(recipes).where(eq(recipes.id, id));
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Chyba při mazání receptury' }, { status: 500 });
  }
}
