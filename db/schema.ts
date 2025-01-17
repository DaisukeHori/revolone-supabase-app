import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
});

export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  address: text("address").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
});

// デバイス参照テーブル（メタデータのみ）
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  serialNumber: text("serial_number").unique().notNull(),
  kintoneRecordId: text("kintone_record_id").unique(),
});

// リレーション定義
export const usersRelations = relations(users, ({ many }) => ({
  stores: many(stores),
}));

export const storesRelations = relations(stores, ({ one, many }) => ({
  user: one(users, {
    fields: [stores.userId],
    references: [users.id],
  }),
  devices: many(devices),
}));

export const devicesRelations = relations(devices, ({ one }) => ({
  store: one(stores, {
    fields: [devices.storeId],
    references: [stores.id],
  }),
}));

// バリデーションスキーマ
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("メールアドレスの形式が正しくありません"),
  username: z.string().min(3, "ユーザー名は3文字以上である必要があります"),
  password: z.string().min(8, "パスワードは8文字以上である必要があります"),
});

export const insertStoreSchema = createInsertSchema(stores, {
  name: z.string().min(1, "店舗名を入力してください"),
  address: z.string().min(1, "住所を入力してください"),
  stripeCustomerId: z.string().optional(),
});

export const insertDeviceSchema = createInsertSchema(devices);

export const updateStoreSchema = insertStoreSchema.partial();

export const selectUserSchema = createSelectSchema(users);
export const selectStoreSchema = createSelectSchema(stores);
export const selectDeviceSchema = createSelectSchema(devices);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type SelectUser = typeof users.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type SelectStore = typeof stores.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type SelectDevice = typeof devices.$inferSelect;