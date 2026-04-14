import { db } from '@/lib/db';
import { items } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [item] = await db.select().from(items).where(eq(items.id, id));
    if (!item) return Response.json({ error: 'Položka nenalezena' }, { status: 404 });
    return Response.json(item);
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
      name?: string;
      description?: string;
      categoryId?: string;
      vendorId?: string;
      purchaseCost?: number;
      salePrice?: number;
      minStock?: number;
    };

    const [item] = await db.update(items)
      .set({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
        ...(body.vendorId !== undefined && { vendorId: body.vendorId }),
        ...(body.purchaseCost !== undefined && { purchaseCost: String(body.purchaseCost) }),
        ...(body.salePrice !== undefined && { salePrice: String(body.salePrice) }),
        ...(body.minStock !== undefined && { minStock: String(body.minStock) }),
        updatedAt: new Date(),
      })
      .where(eq(items.id, id))
      .returning();

    if (!item) return Response.json({ error: 'Položka nenalezena' }, { status: 404 });
    return Response.json(item);
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.delete(items).where(eq(items.id, id));
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
