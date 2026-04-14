import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const rows = await db.execute(sql`
      SELECT
        b.id,
        b.batch_code,
        b.item_id,
        i.name AS item_name,
        c.type AS category_type,
        c.name AS category_name,
        b.received_date,
        b.expires_at,
        b.position,
        b.notes,
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

    const result = (rows as Record<string, unknown>[]).map((r) => ({
      ...r,
      gramsOnHand: Number(r['grams_on_hand'] ?? 0),
      reservedGrams: Number(r['reserved_grams'] ?? 0),
      availableGrams: Number(r['grams_on_hand'] ?? 0) - Number(r['reserved_grams'] ?? 0),
    }));

    return Response.json(result);
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Chyba při načítání šarží' }, { status: 500 });
  }
}
