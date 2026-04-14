import { db } from '@/lib/db';
import { vendors } from '@/db/schema';
import { asc } from 'drizzle-orm';

export async function GET() {
  try {
    const rows = await db.select().from(vendors).orderBy(asc(vendors.name));
    return Response.json(rows);
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Chyba při načítání dodavatelů' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      name: string;
      email?: string;
      phone?: string;
      url?: string;
      address?: string;
    };

    if (!body.name?.trim()) {
      return Response.json({ error: 'Název dodavatele je povinný' }, { status: 400 });
    }

    const [vendor] = await db.insert(vendors).values({
      name: body.name.trim(),
      email: body.email || null,
      phone: body.phone || null,
      url: body.url || null,
      address: body.address || null,
    }).returning();

    return Response.json(vendor, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Chyba při vytváření dodavatele' }, { status: 500 });
  }
}
