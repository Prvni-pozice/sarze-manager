import { db } from '@/lib/db';
import { vendors } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    if (!vendor) return Response.json({ error: 'Dodavatel nenalezen' }, { status: 404 });
    return Response.json(vendor);
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Chyba při načítání dodavatele' }, { status: 500 });
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
      email?: string;
      phone?: string;
      url?: string;
      address?: string;
    };

    const [vendor] = await db.update(vendors)
      .set({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.url !== undefined && { url: body.url }),
        ...(body.address !== undefined && { address: body.address }),
      })
      .where(eq(vendors.id, id))
      .returning();

    if (!vendor) return Response.json({ error: 'Dodavatel nenalezen' }, { status: 404 });
    return Response.json(vendor);
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Chyba při aktualizaci dodavatele' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.delete(vendors).where(eq(vendors.id, id));
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Chyba při mazání dodavatele' }, { status: 500 });
  }
}
