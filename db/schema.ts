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
  stripeCustomerId: text("stripe_customer_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 新しく追加するdevicesテーブル
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  serialNumber: text("serial_number").unique().notNull(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: text("status").notNull(), // "出荷" | "返却"
  statusUpdatedAt: timestamp("status_updated_at").notNull(),
  kintoneRecordId: text("kintone_record_id").unique(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// デバイス交換リクエストテーブル
export const deviceExchangeRequests = pgTable("device_exchange_requests", {
  id: serial("id").primaryKey(),
  serialNumber: text("serial_number").notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  requestDate: timestamp("request_date").defaultNow().notNull(),
  issues: jsonb("issues").$type<string[]>().notNull(), // 不調部分のリスト
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  zapierRequestId: text("zapier_request_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// リレーション定義の更新
export const usersRelations = relations(users, ({ many }) => ({
  stores: many(stores),
  deviceExchangeRequests: many(deviceExchangeRequests),
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

export const deviceExchangeRequestsRelations = relations(deviceExchangeRequests, ({ one }) => ({
  user: one(users, {
    fields: [deviceExchangeRequests.userId],
    references: [users.id],
  }),
}));

// スキーマ定義
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
  stripeCustomerId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertDeviceSchema = createInsertSchema(devices, {
  serialNumber: z.string().min(1, "製造番号を入力してください"),
  status: z.enum(["出荷", "返却"], {
    invalid_type_error: "ステータスは出荷または返却である必要があります",
  }),
  stripeSubscriptionId: z.string().optional(),
  kintoneRecordId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertDeviceExchangeRequestSchema = createInsertSchema(deviceExchangeRequests, {
  serialNumber: z.string().min(1, "製造番号を入力してください"),
  issues: z.array(z.string()).min(1, "不調部分を選択してください"),
  notes: z.string().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true, requestDate: true, status: true, zapierRequestId: true });

export const updateStoreSchema = insertStoreSchema.partial();
export const updateDeviceSchema = insertDeviceSchema.partial();
export const updateDeviceExchangeRequestSchema = insertDeviceExchangeRequestSchema.partial();

export const selectUserSchema = createSelectSchema(users);
export const selectStoreSchema = createSelectSchema(stores);
export const selectDeviceSchema = createSelectSchema(devices);
export const selectDeviceExchangeRequestSchema = createSelectSchema(deviceExchangeRequests);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type SelectUser = typeof users.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type SelectStore = typeof stores.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type SelectDevice = typeof devices.$inferSelect;
export type InsertDeviceExchangeRequest = z.infer<typeof insertDeviceExchangeRequestSchema>;
export type SelectDeviceExchangeRequest = typeof deviceExchangeRequests.$inferSelect;