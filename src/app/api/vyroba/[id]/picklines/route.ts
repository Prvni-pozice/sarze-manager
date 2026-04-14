import { db } from '@/lib/db';
import { productions, recipeLines, pickLines, pickAllocations } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getNextFifoBatch } from '@/lib/stock';

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

    // Načti recepturu
    const [recipe] = await db.execute(sql`
      SELECT * FROM recipes WHERE id = ${production.recipeId} LIMIT 1
    `);
    if (!recipe) return Response.json({ error: 'Receptura nenalezena' }, { status: 404 });

    const outputQty = Number((recipe as Record<string, unknown>)['output_qty'] ?? 1);

    // Načti řádky receptury
    const lines = await db.select().from(recipeLines).where(eq(recipeLines.recipeId, production.recipeId));

    // Smaž existující pick lines (pokud jsou)
    await db.execute(sql`
      DELETE FROM pick_allocations WHERE production_id = ${id}
    `);
    await db.execute(sql`
      DELETE FROM pick_lines WHERE production_id = ${id}
    `);

    const createdPickLines = [];
    const usedBatchIds: string[] = [];

    for (const line of lines) {
      const gramsNeeded = Number(line.gramsPerPiece) * production.batchCount * outputQty;
      let remaining = gramsNeeded;

      // FIFO - najdi šarže
      while (remaining > 0) {
        const batch = await getNextFifoBatch(line.ingredientItemId, usedBatchIds);

        if (!batch) {
          // Shortage - vytvoř pick line bez šarže
          const [pl] = await db.insert(pickLines).values({
            productionId: id,
            recipeLineId: line.id,
            ingredientItemId: line.ingredientItemId,
            batchId: null,
            gramsNeeded: String(gramsNeeded),
            gramsToIssue: String(remaining),
          }).returning();
          createdPickLines.push({ ...pl, shortage: true });
          remaining = 0;
        } else {
          const toIssue = Math.min(remaining, batch.availableGrams);

          const [pl] = await db.insert(pickLines).values({
            productionId: id,
            recipeLineId: line.id,
            ingredientItemId: line.ingredientItemId,
            batchId: batch.id,
            gramsNeeded: String(gramsNeeded),
            gramsToIssue: String(toIssue),
          }).returning();

          // Vytvoř alokaci
          await db.insert(pickAllocations).values({
            productionId: id,
            pickLineId: pl.id,
            ingredientItemId: line.ingredientItemId,
            batchId: batch.id,
            allocGrams: String(toIssue),
            status: 'reserved',
          });

          usedBatchIds.push(batch.id);
          createdPickLines.push({ ...pl, shortage: false });
          remaining -= toIssue;
        }
      }
    }

    // Nastav status výroby na in_progress
    await db.update(productions)
      .set({ status: 'in_progress', updatedAt: new Date() })
      .where(eq(productions.id, id));

    return Response.json({ ok: true, pickLines: createdPickLines });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Chyba při generování pick lines' }, { status: 500 });
  }
}
