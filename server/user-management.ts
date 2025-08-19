import { type Express } from "express";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

const scryptAsync = promisify(scrypt);

// パスワード比較関数（auth.tsと同じアルゴリズムを使用）
async function comparePassword(inputPassword: string, storedPassword: string): Promise<boolean> {
  try {
    const [salt, hashedPassword] = storedPassword.split(":");
    if (!salt || !hashedPassword) {
      return false;
    }
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(inputPassword, salt, 64)) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  } catch (error) {
    console.error("パスワード比較エラー:", error);
    return false;
  }
}

interface AuthenticatedRequest extends Express.Request {
  user?: any;
  body: any;
  isAuthenticated(): boolean;
  logout: any;
}

// パスワード確認のスキーマ
const deleteAccountSchema = z.object({
  password: z.string().min(1, "パスワードを入力してください"),
});

export function setupUserManagementRoutes(app: Express) {
  // ユーザー削除可能かチェック
  app.get("/api/user/can-delete", async (req: AuthenticatedRequest, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    try {
      // Stripe顧客の確認
      const customers = await stripe.customers.search({
        query: `email:'${req.user!.email}'`,
      });

      if (customers.data.length > 0) {
        return res.json({
          canDelete: false,
          reason: "先に登録されている店舗を削除してください。",
          hasStripeCustomer: true,
        });
      }

      return res.json({
        canDelete: true,
        hasStripeCustomer: false,
      });
    } catch (error) {
      console.error("削除可能チェックエラー:", error);
      return res.status(500).json({ 
        message: "削除可能かどうかの確認中にエラーが発生しました" 
      });
    }
  });

  // ユーザーアカウント削除
  app.delete("/api/user", async (req: AuthenticatedRequest, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const result = deleteAccountSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: result.error.issues.map(i => i.message).join("、")
      });
    }

    try {
      // ユーザー情報を取得
      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user!.id));

      if (!currentUser) {
        return res.status(404).json({ message: "ユーザーが見つかりません" });
      }

      // パスワード確認
      const isValidPassword = await comparePassword(
        result.data.password,
        currentUser.password
      );

      if (!isValidPassword) {
        return res.status(401).json({ message: "パスワードが正しくありません" });
      }

      // Stripe顧客の最終確認
      const customers = await stripe.customers.search({
        query: `email:'${req.user!.email}'`,
      });

      if (customers.data.length > 0) {
        return res.status(400).json({
          message: "店舗が登録されているため、アカウントを削除できません。先に店舗を削除してください。",
        });
      }

      // ユーザーレコードを削除
      await db.delete(users).where(eq(users.id, req.user!.id));

      // セッションを終了
      req.logout((err) => {
        if (err) {
          console.error("ログアウトエラー:", err);
        }
      });

      res.json({ 
        message: "アカウントを削除しました", 
        success: true 
      });
    } catch (error) {
      console.error("ユーザー削除エラー:", error);
      res.status(500).json({ 
        message: "アカウントの削除中にエラーが発生しました" 
      });
    }
  });
}