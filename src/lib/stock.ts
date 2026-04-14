import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export interface BatchStock {
  gramsOnHand: number;
  reservedGrams: number;
  availableGrams: number;
}

export interface ItemStock {
  gramsOnHand: number;
  reservedGrams: number;
  availableGrams: number;
}

/** Celkový stav pro jednu šarži */
export async function getBatchStock(batchId: string): Promise<BatchStock> {
  const [onHandRow] = await db.execute(sql`
    SELECT COALESCE(SUM(amount), 0) AS grams_on_hand
    FROM inventory
    WHERE batch_id = ${batchId}
  `);

  const [reservedRow] = await db.execute(sql`
    SELECT COALESCE(SUM(pa.alloc_grams), 0) AS reserved_grams
    FROM pick_allocations pa
    JOIN productions p ON p.id = pa.production_id
    WHERE pa.batch_id = ${batchId}
      AND pa.status = 'reserved'
      AND p.status IN ('draft', 'in_progress')
  `);

  const gramsOnHand = Number((onHandRow as Record<string, unknown>)['grams_on_hand'] ?? 0);
  const reservedGrams = Number((reservedRow as Record<string, unknown>)['reserved_grams'] ?? 0);

  return {
    gramsOnHand,
    reservedGrams,
    availableGrams: gramsOnHand - reservedGrams,
  };
}

/** Celkový stav pro položku (přes všechny šarže) */
export async function getItemStock(itemId: string): Promise<ItemStock> {
  const [onHandRow] = await db.execute(sql`
    SELECT COALESCE(SUM(amount), 0) AS grams_on_hand
    FROM inventory
    WHERE item_id = ${itemId}
  `);

  const [reservedRow] = await db.execute(sql`
    SELECT COALESCE(SUM(pa.alloc_grams), 0) AS reserved_grams
    FROM pick_allocations pa
    JOIN productions p ON p.id = pa.production_id
    WHERE pa.ingredient_item_id = ${itemId}
      AND pa.status = 'reserved'
      AND p.status IN ('draft', 'in_progress')
  `);

  const gramsOnHand = Number((onHandRow as Record<string, unknown>)['grams_on_hand'] ?? 0);
  const reservedGrams = Number((reservedRow as Record<string, unknown>)['reserved_grams'] ?? 0);

  return {
    gramsOnHand,
    reservedGrams,
    availableGrams: gramsOnHand - reservedGrams,
  };
}

export interface FifoBatch {
  id: string;
  batchCode: string;
  receivedDate: string;
  availableGrams: number;
}

/** Nejstarší batch s availableGrams > 0 (FIFO), s možností vyloučit šarže */
export async function getNextFifoBatch(
  itemId: string,
  excludeBatchIds: string[] = []
): Promise<FifoBatch | null> {
  const rows = await db.execute(sql`
    SELECT
      b.id,
      b.batch_code,
      b.received_date,
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
    LEFT JOIN inventory inv ON inv.batch_id = b.id
    WHERE b.item_id = ${itemId}
      ${excludeBatchIds.length > 0
        ? sql`AND b.id NOT IN (${sql.join(excludeBatchIds.map((id) => sql`${id}`), sql`, `)})`
        : sql``}
    GROUP BY b.id, b.batch_code, b.received_date
    HAVING COALESCE(SUM(inv.amount), 0) - COALESCE((
      SELECT SUM(pa2.alloc_grams)
      FROM pick_allocations pa2
      JOIN productions p2 ON p2.id = pa2.production_id
      WHERE pa2.batch_id = b.id
        AND pa2.status = 'reserved'
        AND p2.status IN ('draft', 'in_progress')
    ), 0) > 0
    ORDER BY b.received_date ASC, b.created_at ASC
    LIMIT 1
  `);

  if (!rows || (rows as unknown[]).length === 0) return null;

  const row = (rows as Record<string, unknown>[])[0];
  const gramsOnHand = Number(row['grams_on_hand'] ?? 0);
  const reservedGrams = Number(row['reserved_grams'] ?? 0);

  return {
    id: String(row['id']),
    batchCode: String(row['batch_code']),
    receivedDate: String(row['received_date']),
    availableGrams: gramsOnHand - reservedGrams,
  };
}

/** Vygeneruj kód šarže ve formátu NAZ-YYMMDD-XXXX */
export function generateBatchCode(name: string): string {
  const prefix = name.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${yy}${mm}${dd}-${rand}`;
}
