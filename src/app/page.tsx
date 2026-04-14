import Link from "next/link";

async function getDashboardData() {
  try {
    const { db } = await import("@/lib/db");
    const { sql } = await import("drizzle-orm");
    const { inventory, batches, productions, items } = await import("@/db/schema");

    const [itemCount, batchCount, openProductions, recentMovements] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(items),
      db.select({ count: sql<number>`count(*)` }).from(batches),
      db.select({ count: sql<number>`count(*)` })
        .from(productions)
        .where(sql`status IN ('draft', 'in_progress')`),
      db.execute(sql`
        SELECT inv.move_type, inv.amount, inv.moved_at,
               i.name AS item_name, b.batch_code
        FROM inventory inv
        JOIN items i ON i.id = inv.item_id
        JOIN batches b ON b.id = inv.batch_id
        ORDER BY inv.moved_at DESC
        LIMIT 8
      `),
    ]);

    return {
      itemCount: Number(itemCount[0].count),
      batchCount: Number(batchCount[0].count),
      openProductions: Number(openProductions[0].count),
      recentMovements: (recentMovements as unknown) as Array<{
        move_type: string; amount: string; moved_at: string;
        item_name: string; batch_code: string;
      }>,
    };
  } catch {
    return { itemCount: 0, batchCount: 0, openProductions: 0, recentMovements: [] };
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  const stats = [
    { label: "Položky v katalogu", value: data.itemCount, href: "/polozky", color: "bg-blue-50 text-blue-700 border-blue-200" },
    { label: "Šarže celkem", value: data.batchCount, href: "/sarze", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { label: "Otevřené výroby", value: data.openProductions, href: "/vyroba", color: "bg-amber-50 text-amber-700 border-amber-200" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Přehled skladu, šarží a výroby</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.href} href={s.href}
            className={`flex flex-col rounded-xl border p-5 transition-shadow hover:shadow-md ${s.color}`}>
            <span className="text-3xl font-bold">{s.value}</span>
            <span className="mt-1 text-sm font-medium">{s.label}</span>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">Rychlé akce</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/sklad/prijem"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors">
            + Příjem na sklad
          </Link>
          <Link href="/vyroba/nova"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            + Nová výroba
          </Link>
          <Link href="/polozky/nova"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            + Nová položka
          </Link>
        </div>
      </div>

      {/* Recent movements */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">Poslední pohyby skladu</h2>
        {data.recentMovements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
            Zatím žádné pohyby. <Link href="/sklad/prijem" className="text-gray-900 underline">Naskladnit první položku →</Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Položka</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Šarže</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Typ</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Množství</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Čas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.recentMovements.map((m, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{m.item_name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{m.batch_code}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.move_type === "příjem"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {m.move_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                      {Math.abs(Number(m.amount)).toLocaleString("cs")}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">
                      {new Date(m.moved_at).toLocaleString("cs", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
