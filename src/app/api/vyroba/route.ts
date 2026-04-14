import { db } from '@/lib/db';
import { productions } from '@/db/schema';
import { sql, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const rows = await db.execute(sql`
      SELECT
        p.id,
        p.product_item_id,
        i.name AS product_item_name,
        p.recipe_id,
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
      ORDER BY p.created_at DESC
    `);

    return Response.json(rows);
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      productItemId: string;
      recipeId: string;
      batchCount: number;
      plannedDate?: string;
      notes?: string;
    };

    if (!body.productItemId) return Response.json({ error: 'productItemId je povinný' }, { status: 400 });
    if (!body.recipeId) return Response.json({ error: 'recipeId je povinný' }, { status: 400 });
    if (!body.batchCount || body.batchCount < 1) return Response.json({ error: 'batchCount musí být ≥ 1' }, { status: 400 });

    const plannedDate = body.plannedDate || new Date().toISOString().split('T')[0];

    const [production] = await db.insert(productions).values({
      productItemId: body.productItemId,
      recipeId: body.recipeId,
      batchCount: body.batchCount,
      plannedDate,
      notes: body.notes || null,
      status: 'draft',
    }).returning();

    return Response.json(production, { status: 201 });
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}

// Keep desc import used
void desc;
