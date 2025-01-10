import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupStripeRoutes } from "./stripe";
import { setupStoreRoutes } from "./stores";

export function registerRoutes(app: Express): Server {
  // 認証関連のルートを設定
  setupAuth(app);
  // Stripe関連のルートを設定
  setupStripeRoutes(app);
  // 店舗管理関連のルートを設定
  setupStoreRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}