import Link from 'next/link';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';

interface ItemDetail {
  id: string;
  name: string;
  description: string | null;
  category_name: string;
  category_type: string;
  vendor_name: string | null;
  purchase_cost: string | null;
  sale_price: string | null;
  min_stock: string | null;
  total_stock: string;
}

async function getItem(id: string): Promise<ItemDetail | null> {
  try {
    const [row] = await db.execute(sql`
      SELECT
        i.id,
        i.name,
        i.description,
        c.name AS category_name,
        c.type AS category_type,
        v.name AS vendor_name,
        i.purchase_cost,
        i.sale_price,
        i.min_stock,
        COALESCE(SUM(inv.amount), 0) AS total_stock
      FROM items i
      LEFT JOIN categories c ON c.id = i.category_id
      LEFT JOIN vendors v ON v.id = i.vendor_id
      LEFT JOIN inventory inv ON inv.item_id = i.id
      WHERE i.id = ${id}
      GROUP BY i.id, c.name, c.type, v.name
    `);
    return row as unknown as ItemDetail ?? null;
  } catch {
    return null;
  }
}

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getItem(id);
  if (!item) notFound();

  const stock = Number(item.total_stock);
  const unit = item.category_type === 'surovina' ? 'g' : 'ks';

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/polozky" className="hover:text-gray-900">Položky</Link>
        <span>/</span>
        <span className="text-gray-900">{item.name}</span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{item.name}</h1>
            {item.description && <p className="mt-1 text-sm text-gray-500">{item.description}</p>}
          </div>
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            item.category_type === 'surovina' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
          }`}>
            {item.category_name}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Zásoby na skladě</dt>
            <dd className="mt-1 text-2xl font-bold text-gray-900">{stock.toLocaleString('cs')} {unit}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dodavatel</dt>
            <dd className="mt-1 text-sm text-gray-900">{item.vendor_name ?? '—'}</dd>
          </div>
          {item.purchase_cost && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nákupní cena</dt>
              <dd className="mt-1 text-sm text-gray-900">{Number(item.purchase_cost).toLocaleString('cs', { minimumFractionDigits: 2 })} Kč</dd>
            </div>
          )}
          {item.sale_price && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Prodejní cena</dt>
              <dd className="mt-1 text-sm text-gray-900">{Number(item.sale_price).toLocaleString('cs', { minimumFractionDigits: 2 })} Kč</dd>
            </div>
          )}
          {item.min_stock && Number(item.min_stock) > 0 && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Minimální zásoba</dt>
              <dd className="mt-1 text-sm text-gray-900">{Number(item.min_stock).toLocaleString('cs')} {unit}</dd>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-gray-100 flex gap-3">
          <Link
            href="/sklad/prijem"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
          >
            + Příjem na sklad
          </Link>
          <Link
            href="/sarze"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Zobrazit šarže
          </Link>
        </div>
      </div>
    </div>
  );
}
