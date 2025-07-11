import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupStripeRoutes } from "./stripe";
import { setupStoreRoutes } from "./stores";
import { setupMFARoutes } from "./mfa";
import { setupDeviceRoutes } from "./devices";
import { setupEmailChangeRoutes } from "./emailChange";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

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

  // メールアドレス変更関連のルートを設定
  setupEmailChangeRoutes(app);

  // プロフィール編集のAPIエンドポイント
  app.put('/api/profile', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'ログインが必要です' });
    }

    try {
      const { username } = req.body;
      
      if (!username || typeof username !== 'string') {
        return res.status(400).json({ message: '名前は必須です' });
      }

      if (username.trim().length === 0) {
        return res.status(400).json({ message: '名前を入力してください' });
      }

      // データベースのユーザー名を更新
      await db
        .update(users)
        .set({ username: username.trim() })
        .where(eq(users.id, req.user!.id));

      res.json({ message: '名前が更新されました' });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ message: '名前の更新に失敗しました' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}