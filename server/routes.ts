import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupStripeRoutes } from "./stripe";
import { setupStoreRoutes } from "./stores";
import { setupMFARoutes } from "./mfa";
import { setupDeviceRoutes } from "./devices";
import { setupEmailManagementRoutes } from "./email-management";

export function registerRoutes(app: Express): Server {
  // 認証関連のルートを設定
  setupAuth(app);

  // Stripe関連のルートを設定（デバッグログを有効化）
  setupStripeRoutes(app, { debug: true });

  // 店舗管理関連のルートを設定
  setupStoreRoutes(app);

  // MFA関連のルートを設定
  setupMFARoutes(app);

  // デバイス管理関連のルートを設定
  setupDeviceRoutes(app);

  // メールアドレス管理関連のルートを設定
  setupEmailManagementRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}