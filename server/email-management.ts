
import type { Express } from "express";
import { db } from "../db";
import { emailMappings, stores } from "../db/schema";
import { insertEmailMappingSchema, updateEmailMappingSchema } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { AuthenticatedRequest } from "./auth";

export function setupEmailManagementRoutes(app: Express) {
  // 店舗のメールアドレス変更履歴を取得
  app.get("/api/stores/:storeId/email-history", async (req: AuthenticatedRequest, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const storeId = parseInt(req.params.storeId);
    if (isNaN(storeId)) {
      return res.status(400).json({ message: "無効な店舗IDです" });
    }

    try {
      // 店舗の所有権確認
      const [store] = await db.query.stores.findMany({
        where: eq(stores.id, storeId),
        limit: 1,
      });

      if (!store || store.userId !== req.user!.id) {
        return res.status(403).json({ message: "この店舗にアクセスする権限がありません" });
      }

      // メールアドレス変更履歴を取得
      const history = await db.query.emailMappings.findMany({
        where: eq(emailMappings.storeId, storeId),
        orderBy: [desc(emailMappings.createdAt)],
        with: {
          changedByUser: {
            columns: {
              username: true,
              email: true,
            },
          },
        },
      });

      res.json(history);
    } catch (error) {
      console.error("メールアドレス変更履歴の取得エラー:", error);
      res.status(500).json({ message: "履歴の取得中にエラーが発生しました" });
    }
  });

  // 店舗のメールアドレスを変更
  app.post("/api/stores/:storeId/change-email", async (req: AuthenticatedRequest, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const storeId = parseInt(req.params.storeId);
    if (isNaN(storeId)) {
      return res.status(400).json({ message: "無効な店舗IDです" });
    }

    const { newEmail, reason } = req.body;
    if (!newEmail || typeof newEmail !== 'string') {
      return res.status(400).json({ message: "新しいメールアドレスを入力してください" });
    }

    try {
      // 店舗の所有権確認
      const [store] = await db.query.stores.findMany({
        where: eq(stores.id, storeId),
        limit: 1,
      });

      if (!store || store.userId !== req.user!.id) {
        return res.status(403).json({ message: "この店舗にアクセスする権限がありません" });
      }

      if (!store.stripeCustomerId) {
        return res.status(400).json({ message: "この店舗にはStripe顧客IDが設定されていません" });
      }

      // 現在アクティブなマッピングを無効化
      await db
        .update(emailMappings)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(emailMappings.storeId, storeId),
            eq(emailMappings.isActive, true)
          )
        );

      // Stripe顧客の元のメールアドレスを取得
      const stripe = (await import('stripe')).default;
      const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY!);
      const customer = await stripeClient.customers.retrieve(store.stripeCustomerId);
      
      if (customer.deleted) {
        return res.status(400).json({ message: "Stripe顧客が削除されています" });
      }

      const originalEmail = customer.email;
      if (!originalEmail) {
        return res.status(400).json({ message: "Stripe顧客にメールアドレスが設定されていません" });
      }

      // 新しいマッピングを作成
      const result = insertEmailMappingSchema.safeParse({
        storeId,
        stripeCustomerId: store.stripeCustomerId,
        originalEmail,
        currentEmail: newEmail,
        changedBy: req.user!.id,
        changeReason: reason || null,
        isActive: true,
      });

      if (!result.success) {
        return res.status(400).json({
          message: result.error.issues.map(i => i.message).join("、")
        });
      }

      const [newMapping] = await db
        .insert(emailMappings)
        .values(result.data)
        .returning();

      res.json({
        message: "メールアドレスを変更しました",
        mapping: newMapping,
      });
    } catch (error) {
      console.error("メールアドレス変更エラー:", error);
      res.status(500).json({ message: "メールアドレスの変更中にエラーが発生しました" });
    }
  });

  // メールアドレスマッピングを無効化（元に戻す）
  app.post("/api/stores/:storeId/revert-email", async (req: AuthenticatedRequest, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const storeId = parseInt(req.params.storeId);
    if (isNaN(storeId)) {
      return res.status(400).json({ message: "無効な店舗IDです" });
    }

    try {
      // 店舗の所有権確認
      const [store] = await db.query.stores.findMany({
        where: eq(stores.id, storeId),
        limit: 1,
      });

      if (!store || store.userId !== req.user!.id) {
        return res.status(403).json({ message: "この店舗にアクセスする権限がありません" });
      }

      // 現在アクティブなマッピングを無効化
      const updatedMappings = await db
        .update(emailMappings)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(emailMappings.storeId, storeId),
            eq(emailMappings.isActive, true)
          )
        )
        .returning();

      if (updatedMappings.length === 0) {
        return res.status(400).json({ message: "アクティブなメールアドレスマッピングがありません" });
      }

      res.json({
        message: "メールアドレスを元に戻しました",
        revertedMappings: updatedMappings,
      });
    } catch (error) {
      console.error("メールアドレス復元エラー:", error);
      res.status(500).json({ message: "メールアドレスの復元中にエラーが発生しました" });
    }
  });

  // 特定のマッピングの詳細を取得
  app.get("/api/email-mappings/:id", async (req: AuthenticatedRequest, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const mappingId = parseInt(req.params.id);
    if (isNaN(mappingId)) {
      return res.status(400).json({ message: "無効なマッピングIDです" });
    }

    try {
      const [mapping] = await db.query.emailMappings.findMany({
        where: eq(emailMappings.id, mappingId),
        with: {
          store: true,
          changedByUser: {
            columns: {
              username: true,
              email: true,
            },
          },
        },
        limit: 1,
      });

      if (!mapping) {
        return res.status(404).json({ message: "マッピングが見つかりません" });
      }

      // 店舗の所有権確認
      if (mapping.store.userId !== req.user!.id) {
        return res.status(403).json({ message: "このマッピングにアクセスする権限がありません" });
      }

      res.json(mapping);
    } catch (error) {
      console.error("マッピング詳細の取得エラー:", error);
      res.status(500).json({ message: "マッピング情報の取得中にエラーが発生しました" });
    }
  });
}
