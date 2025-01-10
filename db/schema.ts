import { pgTable, text, serial, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  // MFA fields
  mfaEnabled: boolean("mfa_enabled"),
  mfaType: text("mfa_type"),
  mfaSecret: text("mfa_secret"),
  phoneNumber: text("phone_number"),
  backupCodes: jsonb("backup_codes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phoneNumber: text("phone_number").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  stores: many(stores),
}));

export const storesRelations = relations(stores, ({ one }) => ({
  user: one(users, {
    fields: [stores.userId],
    references: [users.id],
  }),
}));

// 商品グループテーブル
export const productGroups = pgTable("product_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  minTotalQuantity: integer("min_total_quantity").notNull().default(0), // グループ全体での最小数量
  maxTotalQuantity: integer("max_total_quantity"), // グループ全体での最大数量（nullの場合は上限なし）
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 価格帯テーブル
export const priceTiers = pgTable("price_tiers", {
  id: serial("id").primaryKey(),
  productGroupId: integer("product_group_id").notNull().references(() => productGroups.id),
  name: text("name").notNull(), // 例: "1台目", "2-4台目", "5台目以降"
  description: text("description"), // 価格帯の説明
  minQuantity: integer("min_quantity").notNull(), // 数量の下限
  maxQuantity: integer("max_quantity"), // 数量の上限（nullの場合は上限なし）
  minOrderQuantity: integer("min_order_quantity").notNull().default(0), // 1回の注文での最小数量
  maxOrderQuantity: integer("max_order_quantity"), // 1回の注文での最大数量
  orderIndex: integer("order_index").notNull(), // 価格帯の順序
  stripeProductId: text("stripe_product_id").notNull(),
  stripePriceId: text("stripe_price_id").notNull(),
  unitAmount: integer("unit_amount").notNull(), // 単価（表示用）
  currency: text("currency").notNull().default('jpy'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// リレーションの定義
export const productGroupsRelations = relations(productGroups, ({ many }) => ({
  priceTiers: many(priceTiers),
}));

export const priceTiersRelations = relations(priceTiers, ({ one }) => ({
  productGroup: one(productGroups, {
    fields: [priceTiers.productGroupId],
    references: [productGroups.id],
  }),
}));

// Zodスキーマの定義
export const insertProductGroupSchema = createInsertSchema(productGroups, {
  name: z.string().min(1, "商品グループ名を入力してください"),
  description: z.string().optional(),
  minTotalQuantity: z.number().min(0, "最小数量は0以上である必要があります"),
  maxTotalQuantity: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertPriceTierSchema = createInsertSchema(priceTiers, {
  name: z.string().min(1, "価格帯名を入力してください"),
  description: z.string().optional(),
  minQuantity: z.number().min(0, "最小数量は0以上である必要があります"),
  maxQuantity: z.number().optional(),
  minOrderQuantity: z.number().min(0, "注文最小数量は0以上である必要があります"),
  maxOrderQuantity: z.number().optional(),
  stripeProductId: z.string().min(1, "Stripe製品IDを入力してください"),
  stripePriceId: z.string().min(1, "Stripe価格IDを入力してください"),
  unitAmount: z.number().min(0, "単価は0以上である必要があります"),
  currency: z.string().min(1, "通貨を入力してください"),
}).omit({ id: true, createdAt: true, updatedAt: true });

// 型定義のエクスポート
export type InsertProductGroup = z.infer<typeof insertProductGroupSchema>;
export type SelectProductGroup = typeof productGroups.$inferSelect;
export type InsertPriceTier = z.infer<typeof insertPriceTierSchema>;
export type SelectPriceTier = typeof priceTiers.$inferSelect;

// その他のスキーマ定義
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("メールアドレスの形式が正しくありません"),
  username: z.string().min(3, "ユーザー名は3文字以上である必要があります"),
  password: z.string().min(8, "パスワードは8文字以上である必要があります"),
}).omit({
  id: true,
  resetToken: true,
  resetTokenExpiry: true,
  createdAt: true,
  updatedAt: true,
  mfaEnabled: true,
  mfaType: true,
  mfaSecret: true,
  phoneNumber: true,
  backupCodes: true,
});

export const insertStoreSchema = createInsertSchema(stores, {
  name: z.string().min(1, "店舗名を入力してください"),
  address: z.string().min(1, "住所を入力してください"),
  phoneNumber: z.string().min(1, "電話番号を入力してください"),
  metadata: z.record(z.unknown()).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const updateStoreSchema = insertStoreSchema.partial();

export const selectUserSchema = createSelectSchema(users);
export const selectStoreSchema = createSelectSchema(stores);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type SelectUser = typeof users.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type SelectStore = typeof stores.$inferSelect;