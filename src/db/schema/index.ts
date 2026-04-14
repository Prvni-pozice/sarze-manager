import {
  pgTable, text, numeric, integer, timestamp, date,
  boolean, pgEnum, uuid, index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const categoryTypeEnum = pgEnum('category_type', ['surovina', 'výrobek']);
export const moveTypeEnum = pgEnum('move_type', ['příjem', 'výdej']);
export const productionStatusEnum = pgEnum('production_status', ['draft', 'in_progress', 'posted']);
export const allocStatusEnum = pgEnum('alloc_status', ['reserved', 'issued', 'canceled']);
export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);

// ─── Categories ───────────────────────────────────────────────────────────────

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  type: categoryTypeEnum('type').notNull(),
  icon: text('icon'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Vendors ──────────────────────────────────────────────────────────────────

export const vendors = pgTable('vendors', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  url: text('url'),
  address: text('address'),
  logoUrl: text('logo_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Items ────────────────────────────────────────────────────────────────────

export const items = pgTable('items', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  categoryId: uuid('category_id').notNull().references(() => categories.id),
  vendorId: uuid('vendor_id').references(() => vendors.id),
  purchaseCost: numeric('purchase_cost', { precision: 12, scale: 4 }),
  salePrice: numeric('sale_price', { precision: 12, scale: 4 }),
  imageUrl: text('image_url'),
  minStock: numeric('min_stock', { precision: 12, scale: 4 }).default('0'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Batches (Šarže) ─────────────────────────────────────────────────────────

export const batches = pgTable('batches', {
  id: uuid('id').defaultRandom().primaryKey(),
  batchCode: text('batch_code').notNull().unique(),   // NAZ-YYMMDD-XXXX
  itemId: uuid('item_id').notNull().references(() => items.id),
  receivedDate: date('received_date').notNull(),
  expiresAt: date('expires_at'),
  notes: text('notes'),
  position: text('position'),                          // pozice ve skladu
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('batches_item_id_idx').on(t.itemId),
  index('batches_batch_code_idx').on(t.batchCode),
]);

// ─── Inventory (Pohyby skladu) ────────────────────────────────────────────────

export const inventory = pgTable('inventory', {
  id: uuid('id').defaultRandom().primaryKey(),
  itemId: uuid('item_id').notNull().references(() => items.id),
  batchId: uuid('batch_id').notNull().references(() => batches.id),
  moveType: moveTypeEnum('move_type').notNull(),
  amount: numeric('amount', { precision: 12, scale: 4 }).notNull(), // kladné = příjem, záporné = výdej
  movedAt: timestamp('moved_at').defaultNow().notNull(),
  note: text('note'),
  productionId: uuid('production_id'),                 // odkaz na výrobu (vyplněno pokud výdej z výroby)
  createdBy: uuid('created_by'),
}, (t) => [
  index('inventory_item_id_idx').on(t.itemId),
  index('inventory_batch_id_idx').on(t.batchId),
  index('inventory_moved_at_idx').on(t.movedAt),
]);

// ─── Recipes (Receptury) ──────────────────────────────────────────────────────

export const recipes = pgTable('recipes', {
  id: uuid('id').defaultRandom().primaryKey(),
  productItemId: uuid('product_item_id').notNull().references(() => items.id),
  outputQty: integer('output_qty').notNull(),           // kusů z jedné dávky
  versionNote: text('version_note'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('recipes_product_item_idx').on(t.productItemId),
]);

// ─── RecipeLines (Složení receptury) ─────────────────────────────────────────

export const recipeLines = pgTable('recipe_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  recipeId: uuid('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  ingredientItemId: uuid('ingredient_item_id').notNull().references(() => items.id),
  gramsPerPiece: numeric('grams_per_piece', { precision: 10, scale: 4 }).notNull(),
}, (t) => [
  index('recipe_lines_recipe_id_idx').on(t.recipeId),
]);

// ─── Production (Výrobní dávky) ───────────────────────────────────────────────

export const productions = pgTable('productions', {
  id: uuid('id').defaultRandom().primaryKey(),
  productItemId: uuid('product_item_id').notNull().references(() => items.id),
  recipeId: uuid('recipe_id').notNull().references(() => recipes.id),
  batchCount: integer('batch_count').notNull().default(1),
  plannedDate: date('planned_date').notNull(),
  outputBatchCode: text('output_batch_code'),           // kód šarže hotového výrobku
  status: productionStatusEnum('status').notNull().default('draft'),
  postedAt: timestamp('posted_at'),
  postedBy: uuid('posted_by'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('productions_status_idx').on(t.status),
  index('productions_product_item_idx').on(t.productItemId),
]);

// ─── ProductionPickLines (Výdejní řádky výroby) ───────────────────────────────

export const pickLines = pgTable('pick_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  productionId: uuid('production_id').notNull().references(() => productions.id, { onDelete: 'cascade' }),
  recipeLineId: uuid('recipe_line_id').notNull().references(() => recipeLines.id),
  ingredientItemId: uuid('ingredient_item_id').notNull().references(() => items.id),
  batchId: uuid('batch_id').references(() => batches.id),  // přiřazená šarže suroviny
  gramsNeeded: numeric('grams_needed', { precision: 10, scale: 4 }).notNull(),
  gramsToIssue: numeric('grams_to_issue', { precision: 10, scale: 4 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('pick_lines_production_id_idx').on(t.productionId),
  index('pick_lines_batch_id_idx').on(t.batchId),
]);

// ─── PickAllocations (Rezervace šarží) ───────────────────────────────────────

export const pickAllocations = pgTable('pick_allocations', {
  id: uuid('id').defaultRandom().primaryKey(),
  productionId: uuid('production_id').notNull().references(() => productions.id, { onDelete: 'cascade' }),
  pickLineId: uuid('pick_line_id').notNull().references(() => pickLines.id, { onDelete: 'cascade' }),
  ingredientItemId: uuid('ingredient_item_id').notNull().references(() => items.id),
  batchId: uuid('batch_id').notNull().references(() => batches.id),
  allocGrams: numeric('alloc_grams', { precision: 10, scale: 4 }).notNull(),
  status: allocStatusEnum('status').notNull().default('reserved'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('pick_allocations_production_id_idx').on(t.productionId),
  index('pick_allocations_batch_id_idx').on(t.batchId),
  index('pick_allocations_status_idx').on(t.status),
]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: userRoleEnum('role').notNull().default('user'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const itemsRelations = relations(items, ({ one, many }) => ({
  category: one(categories, { fields: [items.categoryId], references: [categories.id] }),
  vendor: one(vendors, { fields: [items.vendorId], references: [vendors.id] }),
  batches: many(batches),
  inventory: many(inventory),
  recipes: many(recipes),
  recipeLines: many(recipeLines),
}));

export const batchesRelations = relations(batches, ({ one, many }) => ({
  item: one(items, { fields: [batches.itemId], references: [items.id] }),
  inventory: many(inventory),
  pickLines: many(pickLines),
  pickAllocations: many(pickAllocations),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  item: one(items, { fields: [inventory.itemId], references: [items.id] }),
  batch: one(batches, { fields: [inventory.batchId], references: [batches.id] }),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  productItem: one(items, { fields: [recipes.productItemId], references: [items.id] }),
  lines: many(recipeLines),
  productions: many(productions),
}));

export const recipeLinesRelations = relations(recipeLines, ({ one }) => ({
  recipe: one(recipes, { fields: [recipeLines.recipeId], references: [recipes.id] }),
  ingredientItem: one(items, { fields: [recipeLines.ingredientItemId], references: [items.id] }),
}));

export const productionsRelations = relations(productions, ({ one, many }) => ({
  productItem: one(items, { fields: [productions.productItemId], references: [items.id] }),
  recipe: one(recipes, { fields: [productions.recipeId], references: [recipes.id] }),
  pickLines: many(pickLines),
  pickAllocations: many(pickAllocations),
}));

export const pickLinesRelations = relations(pickLines, ({ one, many }) => ({
  production: one(productions, { fields: [pickLines.productionId], references: [productions.id] }),
  recipeLine: one(recipeLines, { fields: [pickLines.recipeLineId], references: [recipeLines.id] }),
  ingredientItem: one(items, { fields: [pickLines.ingredientItemId], references: [items.id] }),
  batch: one(batches, { fields: [pickLines.batchId], references: [batches.id] }),
  allocations: many(pickAllocations),
}));

export const pickAllocationsRelations = relations(pickAllocations, ({ one }) => ({
  production: one(productions, { fields: [pickAllocations.productionId], references: [productions.id] }),
  pickLine: one(pickLines, { fields: [pickAllocations.pickLineId], references: [pickLines.id] }),
  ingredientItem: one(items, { fields: [pickAllocations.ingredientItemId], references: [items.id] }),
  batch: one(batches, { fields: [pickAllocations.batchId], references: [batches.id] }),
}));
