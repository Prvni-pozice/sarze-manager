import { db } from '@/lib/db';
import { productions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [production] = await db.execute(sql`
      SELECT
        p.id,
        p.product_item_id,
        i.name AS product_item_name,
        p.recipe_id,
        r.output_qty AS recipe_output_qty,
        r.version_note AS recipe_version,
        p.batch_count,
        p.planned_date,
        p.output_batch_code,
        p.status,
        p.posted_at,
        p.notes,
        p.created_at,
        p.updated_at
      FROM productions p
      JOIN items i ON i.id = p.product_item_id
      JOIN recipes r ON r.id = p.recipe_id
      WHERE p.id = ${id}
      LIMIT 1
    `);

    if (!production) return Response.json({ error: 'Výroba nenalezena' }, { status: 404 });

    const pickLines = await db.execute(sql`
      SELECT
        pl.id,
        pl.recipe_line_id,
        pl.ingredient_item_id,
        ii.name AS ingredient_item_name,
        pl.batch_id,
        b.batch_code,
        pl.grams_needed,
        pl.grams_to_issue,
        COALESCE((
          SELECT SUM(inv.amount) FROM inventory inv WHERE inv.batch_id = pl.batch_id
        ), 0) AS batch_grams_on_hand,
        COALESCE((
          SELECT SUM(pa2.alloc_grams)
          FROM pick_allocations pa2
          JOIN productions p2 ON p2.id = pa2.production_id
          WHERE pa2.batch_id = pl.batch_id
            AND pa2.status = 'reserved'
            AND p2.status IN ('draft', 'in_progress')
        ), 0) AS batch_reserved
      FROM pick_lines pl
      JOIN items ii ON ii.id = pl.ingredient_item_id
      LEFT JOIN batches b ON b.id = pl.batch_id
      WHERE pl.production_id = ${id}
      ORDER BY pl.created_at ASC
    `);

    return Response.json({ ...production, pickLines });
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as {
      status?: 'draft' | 'in_progress' | 'posted';
      notes?: string;
    };

    const [production] = await db.update(productions)
      .set({
        ...(body.status !== undefined && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes }),
        updatedAt: new Date(),
      })
      .where(eq(productions.id, id))
      .returning();

    if (!production) return Response.json({ error: 'Výroba nenalezena' }, { status: 404 });
    return Response.json(production);
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
