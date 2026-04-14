import { db } from '@/lib/db';
import { inventory, batches, items } from '@/db/schema';
import { sql, eq } from 'drizzle-orm';
import { generateBatchCode } from '@/lib/stock';

export async function GET() {
  try {
    const rows = await db.execute(sql`
      SELECT
        inv.id,
        inv.move_type,
        inv.amount,
        inv.moved_at,
        inv.note,
        inv.item_id,
        i.name AS item_name,
        inv.batch_id,
        b.batch_code,
        b.position
      FROM inventory inv
      JOIN items i ON i.id = inv.item_id
      JOIN batches b ON b.id = inv.batch_id
      ORDER BY inv.moved_at DESC
    `);

    return Response.json(rows);
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Chyba při načítání pohybů skladu' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      itemId: string;
      amount: number;
      batchCode?: string;
      note?: string;
      position?: string;
      expiresAt?: string;
      receivedDate?: string;
    };

    if (!body.itemId) return Response.json({ error: 'itemId je povinné' }, { status: 400 });
    if (!body.amount || body.amount <= 0) return Response.json({ error: 'Množství musí být kladné' }, { status: 400 });

    // Načti položku pro generování kódu šarže
    const [item] = await db.select().from(items).where(eq(items.id, body.itemId));
    if (!item) return Response.json({ error: 'Položka nenalezena' }, { status: 404 });

    const batchCode = body.batchCode?.trim() || generateBatchCode(item.name);
    const receivedDate = body.receivedDate || new Date().toISOString().split('T')[0];

    // Zjisti, jestli šarže s tímto kódem již existuje
    const [existingBatch] = await db.execute(sql`
      SELECT id FROM batches WHERE batch_code = ${batchCode} LIMIT 1
    `);

    let batchId: string;

    if (existingBatch) {
      batchId = String((existingBatch as Record<string, unknown>)['id']);
    } else {
      const [newBatch] = await db.insert(batches).values({
        batchCode,
        itemId: body.itemId,
        receivedDate,
        expiresAt: body.expiresAt || null,
        position: body.position || null,
        notes: body.note || null,
      }).returning();
      batchId = newBatch.id;
    }

    // Vytvoř inventární pohyb
    const [move] = await db.insert(inventory).values({
      itemId: body.itemId,
      batchId,
      moveType: 'příjem',
      amount: String(body.amount),
      note: body.note || null,
    }).returning();

    return Response.json({ ...move, batchCode, batchId }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Chyba při příjmu na sklad' }, { status: 500 });
  }
}
