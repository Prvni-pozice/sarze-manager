import { db } from '@/lib/db';
import { items, categories, vendors } from '@/db/schema';
import { sql, eq, asc } from 'drizzle-orm';

export async function GET() {
  try {
    const rows = await db.execute(sql`
      SELECT
        i.id,
        i.name,
        i.description,
        i.category_id,
        c.name AS category_name,
        c.type AS category_type,
        i.vendor_id,
        v.name AS vendor_name,
        i.purchase_cost,
        i.sale_price,
        i.min_stock,
        i.created_at,
        i.updated_at,
        COALESCE(stock.total, 0) AS total_stock
      FROM items i
      LEFT JOIN categories c ON c.id = i.category_id
      LEFT JOIN vendors v ON v.id = i.vendor_id
      LEFT JOIN (
        SELECT item_id, SUM(amount) AS total
        FROM inventory
        GROUP BY item_id
      ) stock ON stock.item_id = i.id
      ORDER BY i.name ASC
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
      name: string;
      description?: string;
      categoryId: string;
      vendorId?: string;
      purchaseCost?: number;
      salePrice?: number;
      minStock?: number;
    };

    if (!body.name?.trim()) {
      return Response.json({ error: 'Název je povinný' }, { status: 400 });
    }
    if (!body.categoryId) {
      return Response.json({ error: 'Kategorie je povinná' }, { status: 400 });
    }

    const [item] = await db.insert(items).values({
      name: body.name.trim(),
      description: body.description || null,
      categoryId: body.categoryId,
      vendorId: body.vendorId || null,
      purchaseCost: body.purchaseCost != null ? String(body.purchaseCost) : null,
      salePrice: body.salePrice != null ? String(body.salePrice) : null,
      minStock: body.minStock != null ? String(body.minStock) : '0',
    }).returning();

    return Response.json(item, { status: 201 });
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}

// Keep imports used
void eq; void asc; void categories; void vendors;
