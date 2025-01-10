import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupStripeRoutes } from "./stripe";
import { setupStoreRoutes } from "./stores";
import { setupMFARoutes } from "./mfa";

// レボナイザーの商品ID定数
const REVONIZER_PRODUCTS = {
  SINGLE: {
    PRODUCT_ID: 'prod_OkRTix5Mimwc9p',
    PRICE_ID: 'price_1NwwacAPdno01lSPWH92pzrl'
  },
  MEDIUM: {
    PRODUCT_ID: 'prod_P0DB3wRLVlz8GV',
    PRICE_ID: 'price_1OCCkvAPdno01lSP44FyPiZ3'
  },
  BULK: {
    PRODUCT_ID: 'prod_P1IWo9CT6gNkX2',
    PRICE_ID: 'price_1OED1uAPdno01lSP3UESyV7C'
  }
};

// レボナイザーの数量から各プランの数量を計算する関数
export function calculateRevonizerQuantities(totalQuantity: number): {
  single: number;
  medium: number;
  bulk: number;
} {
  if (totalQuantity <= 0) {
    return { single: 0, medium: 0, bulk: 0 };
  }

  // 1台目は必ずSINGLEプラン
  let single = Math.min(1, totalQuantity);
  let remaining = totalQuantity - single;

  // 2-4台目はMEDIUMプラン
  let medium = Math.min(3, Math.max(0, remaining));
  remaining -= medium;

  // 5台目以降はBULKプラン
  let bulk = Math.max(0, remaining);

  return { single, medium, bulk };
}

export function registerRoutes(app: Express): Server {
  // 認証関連のルートを設定
  setupAuth(app);
  // Stripe関連のルートを設定
  setupStripeRoutes(app);
  // 店舗管理関連のルートを設定
  setupStoreRoutes(app);
  // MFA関連のルートを設定
  setupMFARoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}

// レボナイザー関連の定数とユーティリティ関数をエクスポート
export const REVONIZER = {
  PRODUCTS: REVONIZER_PRODUCTS,
  calculateQuantities: calculateRevonizerQuantities
};