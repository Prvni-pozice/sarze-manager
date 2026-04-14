import { db } from '@/lib/db';
import { productions, pickLines, pickAllocations, inventory, batches } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { generateBatchCode } from '@/lib/stock';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Načti výrobu
    const [production] = await db.select().from(productions).where(eq(productions.id, id));
    if (!production) return Response.json({ error: 'Výroba nenalezena' }, { status: 404 });
    if (production.status === 'posted') return Response.json({ error: 'Výroba je již dokončena' }, { status: 400 });

    // Zkontroluj shortage pick lines (batchId IS NULL)
    const shortageLines = await db.execute(sql`
      SELECT pl.id, i.name AS item_name, pl.grams_to_issue
      FROM pick_lines pl
      JOIN items i ON i.id = pl.ingredient_item_id
      WHERE pl.production_id = ${id} AND pl.batch_id IS NULL
    `);

    if ((shortageLines as unknown[]).length > 0) {
      return Response.json({
        error: 'Nelze dokončit výrobu, chybí suroviny',
        shortages: shortageLines,
      }, { status: 400 });
    }

    // Načti všechny alokace
    const allocations = await db.select().from(pickAllocations)
      .where(eq(pickAllocations.productionId, id));

    if (allocations.length === 0) {
      return Response.json({ error: 'Výroba nemá žádné pick lines. Nejprve vygenerujte pick lines.' }, { status: 400 });
    }

    // Načti pick lines pro item id
    const plRows = await db.select().from(pickLines)
      .where(eq(pickLines.productionId, id));

    // Pro každou alokaci: výdejový pohyb
    for (const alloc of allocations) {
      if (alloc.status !== 'reserved') continue;

      await db.insert(inventory).values({
        itemId: alloc.ingredientItemId,
        batchId: alloc.batchId,
        moveType: 'výdej',
        amount: String(-Number(alloc.allocGrams)),
        note: `Výroba #${id}`,
        productionId: id,
      });

      await db.update(pickAllocations)
        .set({ status: 'issued' })
        .where(eq(pickAllocations.id, alloc.id));
    }

    // Načti výrobek pro batch code
    const [productItem] = await db.execute(sql`
      SELECT name FROM items WHERE id = ${production.productItemId} LIMIT 1
    `);
    const productItemName = String((productItem as Record<string, unknown>)['name'] ?? 'VYR');

    // Načti recepturu pro outputQty
    const [recipe] = await db.execute(sql`
      SELECT output_qty FROM recipes WHERE id = ${production.recipeId} LIMIT 1
    `);
    const outputQty = Number((recipe as Record<string, unknown>)['output_qty'] ?? 1);
    const totalQty = production.batchCount * outputQty;

    // Vytvoř novou šarži pro hotový výrobek
    const outputBatchCode = generateBatchCode(productItemName);
    const [outputBatch] = await db.insert(batches).values({
      batchCode: outputBatchCode,
      itemId: production.productItemId,
      receivedDate: new Date().toISOString().split('T')[0],
      notes: `Vyrobeno z výroby #${id}`,
    }).returning();

    // Kladný pohyb pro hotový výrobek
    await db.insert(inventory).values({
      itemId: production.productItemId,
      batchId: outputBatch.id,
      moveType: 'příjem',
      amount: String(totalQty),
      note: `Výroba dokončena #${id}`,
      productionId: id,
    });

    // Nastav production na posted
    await db.update(productions)
      .set({
        status: 'posted',
        postedAt: new Date(),
        outputBatchCode,
        updatedAt: new Date(),
      })
      .where(eq(productions.id, id));

    void plRows; // suppress unused warning

    return Response.json({
      ok: true,
      outputBatchCode,
      totalQty,
      outputBatchId: outputBatch.id,
    });
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
