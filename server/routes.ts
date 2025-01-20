import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupStripeRoutes } from "./stripe";
import { setupStoreRoutes } from "./stores";
import { setupMFARoutes } from "./mfa";
import { setupDeviceRoutes } from "./devices";
import { getShippingDetailsByCustomerId } from "./services/kintone";

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

  // 配送情報取得エンドポイント
  app.get("/api/shipping-details/:customerId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    try {
      const { customerId } = req.params;
      const shippingDetails = await getShippingDetailsByCustomerId(customerId);
      res.json(shippingDetails);
    } catch (error) {
      console.error('配送情報取得エラー:', error);
      res.status(500).json({ message: "配送情報の取得中にエラーが発生しました" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}