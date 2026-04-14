import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

function batchCode(prefix: string, dateStr: string, rand: string) {
  return `${prefix.slice(0, 3).toUpperCase()}-${dateStr}-${rand}`;
}

export async function POST() {
  try {
    // Clear existing data in correct order
    await db.execute(sql`DELETE FROM pick_allocations`);
    await db.execute(sql`DELETE FROM pick_lines`);
    await db.execute(sql`DELETE FROM productions`);
    await db.execute(sql`DELETE FROM inventory`);
    await db.execute(sql`DELETE FROM batches`);
    await db.execute(sql`DELETE FROM recipe_lines`);
    await db.execute(sql`DELETE FROM recipes`);
    await db.execute(sql`DELETE FROM items`);
    await db.execute(sql`DELETE FROM vendors`);
    await db.execute(sql`DELETE FROM categories`);

    // ─── Kategorie ─────────────────────────────────────────────────────────────
    const [catSusene] = await db.execute(sql`
      INSERT INTO categories (name, type) VALUES ('Sušené rostliny', 'surovina') RETURNING *
    `);
    const [catOleje] = await db.execute(sql`
      INSERT INTO categories (name, type) VALUES ('Oleje a vosky', 'surovina') RETURNING *
    `);
    const [catObaly] = await db.execute(sql`
      INSERT INTO categories (name, type) VALUES ('Obaly', 'surovina') RETURNING *
    `);
    const [catSvicky] = await db.execute(sql`
      INSERT INTO categories (name, type) VALUES ('Svíčky', 'výrobek') RETURNING *
    `);
    const [catSacky] = await db.execute(sql`
      INSERT INTO categories (name, type) VALUES ('Vonné sáčky', 'výrobek') RETURNING *
    `);
    const [catKremy] = await db.execute(sql`
      INSERT INTO categories (name, type) VALUES ('Krémy', 'výrobek') RETURNING *
    `);

    const catSuseneId = String((catSusene as Record<string, unknown>)['id']);
    const catOlejeId = String((catOleje as Record<string, unknown>)['id']);
    const catObalyId = String((catObaly as Record<string, unknown>)['id']);
    const catSvickyId = String((catSvicky as Record<string, unknown>)['id']);
    const catSackyId = String((catSacky as Record<string, unknown>)['id']);
    void catKremy;

    // ─── Dodavatelé ────────────────────────────────────────────────────────────
    const [v1] = await db.execute(sql`
      INSERT INTO vendors (name, email, phone) VALUES ('Botanica s.r.o.', 'info@botanica.cz', '+420 222 333 444') RETURNING *
    `);
    const [v2] = await db.execute(sql`
      INSERT INTO vendors (name, email, phone) VALUES ('Aromashop', 'obchod@aromashop.cz', '+420 777 888 999') RETURNING *
    `);
    const [v3] = await db.execute(sql`
      INSERT INTO vendors (name, email) VALUES ('Obalový svět', 'eshop@obalovysvet.cz') RETURNING *
    `);

    const v1id = String((v1 as Record<string, unknown>)['id']);
    const v2id = String((v2 as Record<string, unknown>)['id']);
    const v3id = String((v3 as Record<string, unknown>)['id']);

    // ─── Položky (suroviny) ────────────────────────────────────────────────────
    const [iLav] = await db.execute(sql`
      INSERT INTO items (name, category_id, vendor_id, purchase_cost, min_stock)
      VALUES ('Levandule sušená', ${catSuseneId}, ${v1id}, 0.45, 500) RETURNING *
    `);
    const [iRuze] = await db.execute(sql`
      INSERT INTO items (name, category_id, vendor_id, purchase_cost, min_stock)
      VALUES ('Růže sušená', ${catSuseneId}, ${v1id}, 0.90, 300) RETURNING *
    `);
    const [iHer] = await db.execute(sql`
      INSERT INTO items (name, category_id, vendor_id, purchase_cost, min_stock)
      VALUES ('Heřmánek sušený', ${catSuseneId}, ${v1id}, 0.55, 200) RETURNING *
    `);
    const [iSoj] = await db.execute(sql`
      INSERT INTO items (name, category_id, vendor_id, purchase_cost, min_stock)
      VALUES ('Sójový vosk', ${catOlejeId}, ${v2id}, 0.12, 2000) RETURNING *
    `);
    const [iVcel] = await db.execute(sql`
      INSERT INTO items (name, category_id, vendor_id, purchase_cost, min_stock)
      VALUES ('Včelí vosk', ${catOlejeId}, ${v2id}, 0.35, 500) RETURNING *
    `);
    const [iEolLav] = await db.execute(sql`
      INSERT INTO items (name, category_id, vendor_id, purchase_cost, min_stock)
      VALUES ('Esenciální olej levandule', ${catOlejeId}, ${v2id}, 2.50, 100) RETURNING *
    `);
    const [iEolRuze] = await db.execute(sql`
      INSERT INTO items (name, category_id, vendor_id, purchase_cost, min_stock)
      VALUES ('Esenciální olej růže', ${catOlejeId}, ${v2id}, 8.00, 50) RETURNING *
    `);
    const [iNad] = await db.execute(sql`
      INSERT INTO items (name, category_id, vendor_id, purchase_cost, min_stock)
      VALUES ('Skleněná nádoba 200ml', ${catObalyId}, ${v3id}, 12.00, 20) RETURNING *
    `);
    const [iSac] = await db.execute(sql`
      INSERT INTO items (name, category_id, vendor_id, purchase_cost, min_stock)
      VALUES ('Plátěný sáček 15x20cm', ${catObalyId}, ${v3id}, 5.00, 30) RETURNING *
    `);

    // Položky (výrobky)
    const [iSvicka] = await db.execute(sql`
      INSERT INTO items (name, category_id, sale_price)
      VALUES ('Vonná svíčka levandule 200ml', ${catSvickyId}, 299.00) RETURNING *
    `);
    const [iVSacek] = await db.execute(sql`
      INSERT INTO items (name, category_id, sale_price)
      VALUES ('Vonný sáček levandule-růže', ${catSackyId}, 149.00) RETURNING *
    `);

    const lavId = String((iLav as Record<string, unknown>)['id']);
    const ruzeId = String((iRuze as Record<string, unknown>)['id']);
    const herId = String((iHer as Record<string, unknown>)['id']);
    const sojId = String((iSoj as Record<string, unknown>)['id']);
    const vcelId = String((iVcel as Record<string, unknown>)['id']);
    const eolLavId = String((iEolLav as Record<string, unknown>)['id']);
    const eolRuzeId = String((iEolRuze as Record<string, unknown>)['id']);
    const nadId = String((iNad as Record<string, unknown>)['id']);
    const sacId = String((iSac as Record<string, unknown>)['id']);
    const svickaId = String((iSvicka as Record<string, unknown>)['id']);
    const vSacekId = String((iVSacek as Record<string, unknown>)['id']);
    void vcelId;

    // ─── Šarže a pohyby ────────────────────────────────────────────────────────
    // Levandule: 2 šarže, celkem ~5000g
    const [bLav1] = await db.execute(sql`
      INSERT INTO batches (batch_code, item_id, received_date, position)
      VALUES (${batchCode('LEV', '250115', 'A1B2')}, ${lavId}, '2025-01-15', 'A-01-01') RETURNING *
    `);
    const [bLav2] = await db.execute(sql`
      INSERT INTO batches (batch_code, item_id, received_date, position)
      VALUES (${batchCode('LEV', '250310', 'C3D4')}, ${lavId}, '2025-03-10', 'A-01-02') RETURNING *
    `);
    await db.execute(sql`INSERT INTO inventory (item_id, batch_id, move_type, amount, moved_at) VALUES (${lavId}, ${String((bLav1 as Record<string, unknown>)['id'])}, 'příjem', 2500, '2025-01-15 09:00:00')`);
    await db.execute(sql`INSERT INTO inventory (item_id, batch_id, move_type, amount, moved_at) VALUES (${lavId}, ${String((bLav2 as Record<string, unknown>)['id'])}, 'příjem', 2500, '2025-03-10 10:00:00')`);

    // Růže: 2 šarže, ~3000g
    const [bRuze1] = await db.execute(sql`
      INSERT INTO batches (batch_code, item_id, received_date, position)
      VALUES (${batchCode('RUZ', '250120', 'E5F6')}, ${ruzeId}, '2025-01-20', 'A-02-01') RETURNING *
    `);
    const [bRuze2] = await db.execute(sql`
      INSERT INTO batches (batch_code, item_id, received_date, position)
      VALUES (${batchCode('RUZ', '250315', 'G7H8')}, ${ruzeId}, '2025-03-15', 'A-02-02') RETURNING *
    `);
    await db.execute(sql`INSERT INTO inventory (item_id, batch_id, move_type, amount, moved_at) VALUES (${ruzeId}, ${String((bRuze1 as Record<string, unknown>)['id'])}, 'příjem', 1500, '2025-01-20 09:00:00')`);
    await db.execute(sql`INSERT INTO inventory (item_id, batch_id, move_type, amount, moved_at) VALUES (${ruzeId}, ${String((bRuze2 as Record<string, unknown>)['id'])}, 'příjem', 1500, '2025-03-15 10:00:00')`);

    // Heřmánek: 1 šarže, ~2000g
    const [bHer1] = await db.execute(sql`
      INSERT INTO batches (batch_code, item_id, received_date, position)
      VALUES (${batchCode('HER', '250201', 'I9J0')}, ${herId}, '2025-02-01', 'A-03-01') RETURNING *
    `);
    await db.execute(sql`INSERT INTO inventory (item_id, batch_id, move_type, amount, moved_at) VALUES (${herId}, ${String((bHer1 as Record<string, unknown>)['id'])}, 'příjem', 2000, '2025-02-01 09:00:00')`);

    // Sójový vosk: 2 šarže, ~10000g
    const [bSoj1] = await db.execute(sql`
      INSERT INTO batches (batch_code, item_id, received_date, position)
      VALUES (${batchCode('SOJ', '241201', 'K1L2')}, ${sojId}, '2024-12-01', 'B-01-01') RETURNING *
    `);
    const [bSoj2] = await db.execute(sql`
      INSERT INTO batches (batch_code, item_id, received_date, position)
      VALUES (${batchCode('SOJ', '250215', 'M3N4')}, ${sojId}, '2025-02-15', 'B-01-02') RETURNING *
    `);
    await db.execute(sql`INSERT INTO inventory (item_id, batch_id, move_type, amount, moved_at) VALUES (${sojId}, ${String((bSoj1 as Record<string, unknown>)['id'])}, 'příjem', 5000, '2024-12-01 09:00:00')`);
    await db.execute(sql`INSERT INTO inventory (item_id, batch_id, move_type, amount, moved_at) VALUES (${sojId}, ${String((bSoj2 as Record<string, unknown>)['id'])}, 'příjem', 5000, '2025-02-15 10:00:00')`);

    // Včelí vosk: 1 šarže, ~5000g
    const [bVcel1] = await db.execute(sql`
      INSERT INTO batches (batch_code, item_id, received_date, position)
      VALUES (${batchCode('VCE', '250105', 'O5P6')}, ${vcelId}, '2025-01-05', 'B-02-01') RETURNING *
    `);
    await db.execute(sql`INSERT INTO inventory (item_id, batch_id, move_type, amount, moved_at) VALUES (${vcelId}, ${String((bVcel1 as Record<string, unknown>)['id'])}, 'příjem', 5000, '2025-01-05 09:00:00')`);

    // EO Levandule: 2 šarže, ~500g
    const [bEolLav1] = await db.execute(sql`
      INSERT INTO batches (batch_code, item_id, received_date, position)
      VALUES (${batchCode('EOL', '250110', 'Q7R8')}, ${eolLavId}, '2025-01-10', 'C-01-01') RETURNING *
    `);
    const [bEolLav2] = await db.execute(sql`
      INSERT INTO batches (batch_code, item_id, received_date, position)
      VALUES (${batchCode('EOL', '250320', 'S9T0')}, ${eolLavId}, '2025-03-20', 'C-01-02') RETURNING *
    `);
    await db.execute(sql`INSERT INTO inventory (item_id, batch_id, move_type, amount, moved_at) VALUES (${eolLavId}, ${String((bEolLav1 as Record<string, unknown>)['id'])}, 'příjem', 250, '2025-01-10 09:00:00')`);
    await db.execute(sql`INSERT INTO inventory (item_id, batch_id, move_type, amount, moved_at) VALUES (${eolLavId}, ${String((bEolLav2 as Record<string, unknown>)['id'])}, 'příjem', 250, '2025-03-20 10:00:00')`);

    // EO Růže: 1 šarže, ~200g
    const [bEolRuze1] = await db.execute(sql`
      INSERT INTO batches (batch_code, item_id, received_date, position)
      VALUES (${batchCode('EOR', '250115', 'U1V2')}, ${eolRuzeId}, '2025-01-15', 'C-02-01') RETURNING *
    `);
    await db.execute(sql`INSERT INTO inventory (item_id, batch_id, move_type, amount, moved_at) VALUES (${eolRuzeId}, ${String((bEolRuze1 as Record<string, unknown>)['id'])}, 'příjem', 200, '2025-01-15 09:00:00')`);

    // Nádoby: 1 šarže, 100ks
    const [bNad1] = await db.execute(sql`
      INSERT INTO batches (batch_code, item_id, received_date, position)
      VALUES (${batchCode('SKL', '250201', 'W3X4')}, ${nadId}, '2025-02-01', 'D-01-01') RETURNING *
    `);
    await db.execute(sql`INSERT INTO inventory (item_id, batch_id, move_type, amount, moved_at) VALUES (${nadId}, ${String((bNad1 as Record<string, unknown>)['id'])}, 'příjem', 100, '2025-02-01 09:00:00')`);

    // Sáčky: 1 šarže, 200ks
    const [bSac1] = await db.execute(sql`
      INSERT INTO batches (batch_code, item_id, received_date, position)
      VALUES (${batchCode('PLA', '250201', 'Y5Z6')}, ${sacId}, '2025-02-01', 'D-02-01') RETURNING *
    `);
    await db.execute(sql`INSERT INTO inventory (item_id, batch_id, move_type, amount, moved_at) VALUES (${sacId}, ${String((bSac1 as Record<string, unknown>)['id'])}, 'příjem', 200, '2025-02-01 09:00:00')`);

    // ─── Receptury ─────────────────────────────────────────────────────────────
    // Svíčka: 180g sójový vosk + 5g EO levandule + 1ks nádoba → 1ks
    const [rSvicka] = await db.execute(sql`
      INSERT INTO recipes (product_item_id, output_qty, version_note, is_active)
      VALUES (${svickaId}, 1, 'v1.0 - základní receptura', true) RETURNING *
    `);
    const rSvickaId = String((rSvicka as Record<string, unknown>)['id']);

    const [rlSoj] = await db.execute(sql`
      INSERT INTO recipe_lines (recipe_id, ingredient_item_id, grams_per_piece)
      VALUES (${rSvickaId}, ${sojId}, 180) RETURNING *
    `);
    const [rlEolLav] = await db.execute(sql`
      INSERT INTO recipe_lines (recipe_id, ingredient_item_id, grams_per_piece)
      VALUES (${rSvickaId}, ${eolLavId}, 5) RETURNING *
    `);
    const [rlNad] = await db.execute(sql`
      INSERT INTO recipe_lines (recipe_id, ingredient_item_id, grams_per_piece)
      VALUES (${rSvickaId}, ${nadId}, 1) RETURNING *
    `);

    // Vonný sáček: 20g lav + 15g ruze + 5g her + 1ks sáček → 1ks
    const [rSacek] = await db.execute(sql`
      INSERT INTO recipes (product_item_id, output_qty, version_note, is_active)
      VALUES (${vSacekId}, 1, 'v1.0 - základní receptura', true) RETURNING *
    `);
    const rSacekId = String((rSacek as Record<string, unknown>)['id']);

    const [rlLavSac] = await db.execute(sql`
      INSERT INTO recipe_lines (recipe_id, ingredient_item_id, grams_per_piece)
      VALUES (${rSacekId}, ${lavId}, 20) RETURNING *
    `);
    const [rlRuzeSac] = await db.execute(sql`
      INSERT INTO recipe_lines (recipe_id, ingredient_item_id, grams_per_piece)
      VALUES (${rSacekId}, ${ruzeId}, 15) RETURNING *
    `);
    const [rlHerSac] = await db.execute(sql`
      INSERT INTO recipe_lines (recipe_id, ingredient_item_id, grams_per_piece)
      VALUES (${rSacekId}, ${herId}, 5) RETURNING *
    `);
    const [rlSacSac] = await db.execute(sql`
      INSERT INTO recipe_lines (recipe_id, ingredient_item_id, grams_per_piece)
      VALUES (${rSacekId}, ${sacId}, 1) RETURNING *
    `);

    // ─── Výroba 1: historická posted ───────────────────────────────────────────
    // 10x svíčka = 1800g sóje + 50g EO lav + 10x nádoba
    const [prod1] = await db.execute(sql`
      INSERT INTO productions (product_item_id, recipe_id, batch_count, planned_date, status, posted_at, output_batch_code, notes)
      VALUES (${svickaId}, ${rSvickaId}, 10, '2025-02-10', 'posted', '2025-02-10 14:00:00', 'VON-250210-HIST', 'První výrobní série')
      RETURNING *
    `);
    const prod1Id = String((prod1 as Record<string, unknown>)['id']);

    // Pick lines pro posted výrobu
    const [pl1] = await db.execute(sql`
      INSERT INTO pick_lines (production_id, recipe_line_id, ingredient_item_id, batch_id, grams_needed, grams_to_issue)
      VALUES (${prod1Id}, ${String((rlSoj as Record<string, unknown>)['id'])}, ${sojId}, ${String((bSoj1 as Record<string, unknown>)['id'])}, 1800, 1800)
      RETURNING *
    `);
    const [pl2] = await db.execute(sql`
      INSERT INTO pick_lines (production_id, recipe_line_id, ingredient_item_id, batch_id, grams_needed, grams_to_issue)
      VALUES (${prod1Id}, ${String((rlEolLav as Record<string, unknown>)['id'])}, ${eolLavId}, ${String((bEolLav1 as Record<string, unknown>)['id'])}, 50, 50)
      RETURNING *
    `);
    const [pl3] = await db.execute(sql`
      INSERT INTO pick_lines (production_id, recipe_line_id, ingredient_item_id, batch_id, grams_needed, grams_to_issue)
      VALUES (${prod1Id}, ${String((rlNad as Record<string, unknown>)['id'])}, ${nadId}, ${String((bNad1 as Record<string, unknown>)['id'])}, 10, 10)
      RETURNING *
    `);

    // Alokace (issued)
    await db.execute(sql`
      INSERT INTO pick_allocations (production_id, pick_line_id, ingredient_item_id, batch_id, alloc_grams, status)
      VALUES (${prod1Id}, ${String((pl1 as Record<string, unknown>)['id'])}, ${sojId}, ${String((bSoj1 as Record<string, unknown>)['id'])}, 1800, 'issued')
    `);
    await db.execute(sql`
      INSERT INTO pick_allocations (production_id, pick_line_id, ingredient_item_id, batch_id, alloc_grams, status)
      VALUES (${prod1Id}, ${String((pl2 as Record<string, unknown>)['id'])}, ${eolLavId}, ${String((bEolLav1 as Record<string, unknown>)['id'])}, 50, 'issued')
    `);
    await db.execute(sql`
      INSERT INTO pick_allocations (production_id, pick_line_id, ingredient_item_id, batch_id, alloc_grams, status)
      VALUES (${prod1Id}, ${String((pl3 as Record<string, unknown>)['id'])}, ${nadId}, ${String((bNad1 as Record<string, unknown>)['id'])}, 10, 'issued')
    `);

    // Výdejové pohyby pro posted výrobu
    await db.execute(sql`INSERT INTO inventory (item_id, batch_id, move_type, amount, moved_at, note, production_id) VALUES (${sojId}, ${String((bSoj1 as Record<string, unknown>)['id'])}, 'výdej', -1800, '2025-02-10 13:00:00', 'Výroba svíček série 1', ${prod1Id})`);
    await db.execute(sql`INSERT INTO inventory (item_id, batch_id, move_type, amount, moved_at, note, production_id) VALUES (${eolLavId}, ${String((bEolLav1 as Record<string, unknown>)['id'])}, 'výdej', -50, '2025-02-10 13:00:00', 'Výroba svíček série 1', ${prod1Id})`);
    await db.execute(sql`INSERT INTO inventory (item_id, batch_id, move_type, amount, moved_at, note, production_id) VALUES (${nadId}, ${String((bNad1 as Record<string, unknown>)['id'])}, 'výdej', -10, '2025-02-10 13:00:00', 'Výroba svíček série 1', ${prod1Id})`);

    // Batch a příjem hotových svíček
    const [bSvicka1] = await db.execute(sql`
      INSERT INTO batches (batch_code, item_id, received_date, notes)
      VALUES ('VON-250210-HIST', ${svickaId}, '2025-02-10', 'Hotové svíčky - série 1') RETURNING *
    `);
    await db.execute(sql`INSERT INTO inventory (item_id, batch_id, move_type, amount, moved_at, note, production_id) VALUES (${svickaId}, ${String((bSvicka1 as Record<string, unknown>)['id'])}, 'příjem', 10, '2025-02-10 14:00:00', 'Dokončená výroba', ${prod1Id})`);

    // ─── Výroba 2: in_progress s pick lines ────────────────────────────────────
    // 5x vonný sáček = 100g lav + 75g ruze + 25g her + 5x sáček
    const [prod2] = await db.execute(sql`
      INSERT INTO productions (product_item_id, recipe_id, batch_count, planned_date, status, notes)
      VALUES (${vSacekId}, ${rSacekId}, 5, '2026-04-14', 'in_progress', 'Jarní série vonných sáčků')
      RETURNING *
    `);
    const prod2Id = String((prod2 as Record<string, unknown>)['id']);

    // Pick lines pro in_progress
    const [pl4] = await db.execute(sql`
      INSERT INTO pick_lines (production_id, recipe_line_id, ingredient_item_id, batch_id, grams_needed, grams_to_issue)
      VALUES (${prod2Id}, ${String((rlLavSac as Record<string, unknown>)['id'])}, ${lavId}, ${String((bLav1 as Record<string, unknown>)['id'])}, 100, 100)
      RETURNING *
    `);
    const [pl5] = await db.execute(sql`
      INSERT INTO pick_lines (production_id, recipe_line_id, ingredient_item_id, batch_id, grams_needed, grams_to_issue)
      VALUES (${prod2Id}, ${String((rlRuzeSac as Record<string, unknown>)['id'])}, ${ruzeId}, ${String((bRuze1 as Record<string, unknown>)['id'])}, 75, 75)
      RETURNING *
    `);
    const [pl6] = await db.execute(sql`
      INSERT INTO pick_lines (production_id, recipe_line_id, ingredient_item_id, batch_id, grams_needed, grams_to_issue)
      VALUES (${prod2Id}, ${String((rlHerSac as Record<string, unknown>)['id'])}, ${herId}, ${String((bHer1 as Record<string, unknown>)['id'])}, 25, 25)
      RETURNING *
    `);
    const [pl7] = await db.execute(sql`
      INSERT INTO pick_lines (production_id, recipe_line_id, ingredient_item_id, batch_id, grams_needed, grams_to_issue)
      VALUES (${prod2Id}, ${String((rlSacSac as Record<string, unknown>)['id'])}, ${sacId}, ${String((bSac1 as Record<string, unknown>)['id'])}, 5, 5)
      RETURNING *
    `);

    // Alokace reserved pro in_progress
    await db.execute(sql`
      INSERT INTO pick_allocations (production_id, pick_line_id, ingredient_item_id, batch_id, alloc_grams, status)
      VALUES (${prod2Id}, ${String((pl4 as Record<string, unknown>)['id'])}, ${lavId}, ${String((bLav1 as Record<string, unknown>)['id'])}, 100, 'reserved')
    `);
    await db.execute(sql`
      INSERT INTO pick_allocations (production_id, pick_line_id, ingredient_item_id, batch_id, alloc_grams, status)
      VALUES (${prod2Id}, ${String((pl5 as Record<string, unknown>)['id'])}, ${ruzeId}, ${String((bRuze1 as Record<string, unknown>)['id'])}, 75, 'reserved')
    `);
    await db.execute(sql`
      INSERT INTO pick_allocations (production_id, pick_line_id, ingredient_item_id, batch_id, alloc_grams, status)
      VALUES (${prod2Id}, ${String((pl6 as Record<string, unknown>)['id'])}, ${herId}, ${String((bHer1 as Record<string, unknown>)['id'])}, 25, 'reserved')
    `);
    await db.execute(sql`
      INSERT INTO pick_allocations (production_id, pick_line_id, ingredient_item_id, batch_id, alloc_grams, status)
      VALUES (${prod2Id}, ${String((pl7 as Record<string, unknown>)['id'])}, ${sacId}, ${String((bSac1 as Record<string, unknown>)['id'])}, 5, 'reserved')
    `);

    // suppress unused imports warning
    void bLav2; void bRuze2; void bSoj2; void bVcel1; void bEolLav2; void bEolRuze1;

    return Response.json({ ok: true, message: 'Seed data úspěšně nahrána' });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: 'Chyba při seedování', detail: message }, { status: 500 });
  }
}
