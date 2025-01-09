import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";

export function registerRoutes(app: Express): Server {
  // 認証関連のルートを設定
  setupAuth(app);

  const httpServer = createServer(app);
  return httpServer;
}