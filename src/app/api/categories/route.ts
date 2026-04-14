import { db } from '@/lib/db';
import { categories } from '@/db/schema';
import { asc } from 'drizzle-orm';

export async function GET() {
  try {
    const rows = await db.select().from(categories).orderBy(asc(categories.name));
    return Response.json(rows);
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Chyba při načítání kategorií' }, { status: 500 });
  }
}
