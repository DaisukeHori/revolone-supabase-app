import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupStripeRoutes } from "./stripe";

export function registerRoutes(app: Express): Server {
  // 認証関連のルートを設定
  setupAuth(app);
  // Stripe関連のルートを設定
  setupStripeRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}