import { pgTable, text, serial, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// 既存のテーブル定義を保持
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  mfaEnabled: boolean("mfa_enabled"),
  mfaType: text("mfa_type"),
  mfaSecret: text("mfa_secret"),
  phoneNumber: text("phone_number"),
  backupCodes: jsonb("backup_codes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 商品グループのマスターテーブル
export const productGroups = pgTable("product_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 価格帯設定テーブル
export const priceTiers = pgTable("price_tiers", {
  id: serial("id").primaryKey(),
  productGroupId: integer("product_group_id").notNull().references(() => productGroups.id),
  minQuantity: integer("min_quantity").notNull(),
  maxQuantity: integer("max_quantity"),
  stripeProductId: text("stripe_product_id").notNull(),
  stripePriceId: text("stripe_price_id").notNull(),
  name: text("name").notNull(),
  unitAmount: integer("unit_amount").notNull(),
  currency: text("currency").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// リレーション定義
export const productGroupsRelations = relations(productGroups, ({ many }) => ({
  priceTiers: many(priceTiers),
}));

export const priceTiersRelations = relations(priceTiers, ({ one }) => ({
  productGroup: one(productGroups, {
    fields: [priceTiers.productGroupId],
    references: [productGroups.id],
  }),
}));

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

// Zodスキーマ定義
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

export const insertProductGroupSchema = createInsertSchema(productGroups, {
  name: z.string().min(1, "商品グループ名を入力してください"),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertPriceTierSchema = createInsertSchema(priceTiers, {
  productGroupId: z.number().int().positive("商品グループIDは必須です"),
  minQuantity: z.number().int().min(1, "最小数量は1以上である必要があります"),
  maxQuantity: z.number().int().optional(),
  stripeProductId: z.string().min(1, "Stripe Product IDは必須です"),
  stripePriceId: z.string().min(1, "Stripe Price IDは必須です"),
  name: z.string().min(1, "名前は必須です"),
  unitAmount: z.number().int().positive("単価は必須です"),
  currency: z.string().min(1, "通貨は必須です"),
  isActive: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const updateProductGroupSchema = insertProductGroupSchema.partial();
export const updatePriceTierSchema = insertPriceTierSchema.partial();

export const selectUserSchema = createSelectSchema(users);
export const selectStoreSchema = createSelectSchema(stores);
export const selectProductGroupSchema = createSelectSchema(productGroups);
export const selectPriceTierSchema = createSelectSchema(priceTiers);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type SelectUser = typeof users.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type SelectStore = typeof stores.$inferSelect;
export type InsertProductGroup = z.infer<typeof insertProductGroupSchema>;
export type SelectProductGroup = typeof productGroups.$inferSelect;
export type InsertPriceTier = z.infer<typeof insertPriceTierSchema>;
export type SelectPriceTier = typeof priceTiers.$inferSelect;