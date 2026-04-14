import Link from 'next/link';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

interface ItemRow {
  id: string;
  name: string;
  category_name: string;
  category_type: string;
  vendor_name: string | null;
  purchase_cost: string | null;
  sale_price: string | null;
  min_stock: string | null;
  total_stock: string;
}

async function getItems(): Promise<ItemRow[]> {
  try {
    const rows = await db.execute(sql`
      SELECT
        i.id,
        i.name,
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
      GROUP BY i.id, c.name, c.type, v.name
      ORDER BY c.type ASC, i.name ASC
    `);
    return rows as unknown as ItemRow[];
  } catch {
    return [];
  }
}

export default async function PolozkyPage() {
  const items = await getItems();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Položky</h1>
          <p className="mt-1 text-sm text-gray-500">Katalog surovin a výrobků</p>
        </div>
        <Link
          href="/polozky/nova"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
        >
          + Nová položka
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-400">Žádné položky. <Link href="/polozky/nova" className="text-gray-900 underline">Přidat první →</Link></p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Název</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Kategorie</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Dodavatel</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Sklad</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Nákup. cena</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Prodej. cena</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => {
                const stock = Number(item.total_stock);
                const minStock = Number(item.min_stock ?? 0);
                const unit = item.category_type === 'surovina' ? 'g' : 'ks';
                const lowStock = stock < minStock && minStock > 0;

                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={`/polozky/${item.id}`} className="hover:underline">
                        {item.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.category_type === 'surovina'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {item.category_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.vendor_name ?? '—'}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-medium ${lowStock ? 'text-red-600' : 'text-gray-900'}`}>
                      {stock.toLocaleString('cs')} {unit}
                      {lowStock && <span className="ml-1 text-xs">!</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {item.purchase_cost ? `${Number(item.purchase_cost).toLocaleString('cs', { minimumFractionDigits: 2 })} Kč` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {item.sale_price ? `${Number(item.sale_price).toLocaleString('cs', { minimumFractionDigits: 2 })} Kč` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
