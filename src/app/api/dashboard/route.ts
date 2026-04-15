import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { batches, productions, items } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const [
      itemCount,
      batchCount,
      openProductions,
      lowStock,
      recentMovements,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(items),
      db.select({ count: sql<number>`count(*)` }).from(batches),
      db.select({ count: sql<number>`count(*)` })
        .from(productions)
        .where(sql`status IN ('draft', 'in_progress')`),

      // Položky pod minimálním stavem — subquery pro stock
      db.execute(sql`
        SELECT i.id, i.name, i.min_stock,
               COALESCE(stock.total, 0) AS stock
        FROM items i
        LEFT JOIN (
          SELECT item_id, SUM(amount) AS total
          FROM inventory
          GROUP BY item_id
        ) stock ON stock.item_id = i.id
        WHERE COALESCE(stock.total, 0) < COALESCE(i.min_stock, 0)
        ORDER BY stock ASC
        LIMIT 5
      `),

      db.execute(sql`
        SELECT inv.id, inv.move_type, inv.amount, inv.moved_at,
               i.name AS item_name, b.batch_code
        FROM inventory inv
        JOIN items i ON i.id = inv.item_id
        JOIN batches b ON b.id = inv.batch_id
        ORDER BY inv.moved_at DESC
        LIMIT 10
      `),
    ]);

    return NextResponse.json({
      itemCount: Number(itemCount[0].count),
      batchCount: Number(batchCount[0].count),
      openProductions: Number(openProductions[0].count),
      lowStock,
      recentMovements,
    });
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
