import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupStripeRoutes } from "./stripe";
import { setupStoreRoutes } from "./stores";
import { setupMFARoutes } from "./mfa";

export function registerRoutes(app: Express): Server {
  // 認証関連のルートを設定
  setupAuth(app);

  // その他のルートを設定
  setupStripeRoutes(app);
  setupStoreRoutes(app);
  setupMFARoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}