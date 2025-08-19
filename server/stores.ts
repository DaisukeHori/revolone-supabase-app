import { type Express } from "express";
import { db } from "@db";
import { stores, users, insertStoreSchema, updateStoreSchema } from "@db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

interface AuthenticatedRequest extends Express.Request {
  user?: {
    id: number;
    username: string;
    email: string;
    hasCompletedSetup: boolean;
  };
  isAuthenticated(): boolean;
}

export function setupStoreRoutes(app: Express) {
  // 店舗一覧の取得
  app.get("/api/stores", async (req: AuthenticatedRequest, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    try {
      const userStores = await db.query.stores.findMany({
        where: eq(stores.userId, req.user!.id),
        orderBy: stores.createdAt,
      });

      res.json(userStores);
    } catch (error) {
      console.error("店舗一覧の取得エラー:", error);
      res.status(500).json({ message: "店舗情報の取得中にエラーが発生しました" });
    }
  });

  // 店舗の新規登録
  app.post("/api/stores", async (req: AuthenticatedRequest, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const result = insertStoreSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: result.error.issues.map(i => i.message).join("、")
      });
    }

    try {
      const [newStore] = await db
        .insert(stores)
        .values({
          ...result.data,
          userId: req.user!.id,
        })
        .returning();

      // 初回設定完了フラグは既にHomePageで更新済みなので、ここでは更新不要

      res.json({
        message: "店舗を登録しました",
        store: newStore,
      });
    } catch (error) {
      console.error("店舗登録エラー:", error);
      res.status(500).json({ message: "店舗の登録中にエラーが発生しました" });
    }
  });

  // 店舗詳細の取得
  app.get("/api/stores/:id", async (req: AuthenticatedRequest, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const storeId = parseInt(req.params.id);
    if (isNaN(storeId)) {
      return res.status(400).json({ message: "無効な店舗IDです" });
    }

    try {
      const [store] = await db.query.stores.findMany({
        where: eq(stores.id, storeId),
        limit: 1,
      });

      if (!store) {
        return res.status(404).json({ message: "店舗が見つかりません" });
      }

      if (store.userId !== req.user!.id) {
        return res.status(403).json({ message: "アクセス権限がありません" });
      }

      res.json(store);
    } catch (error) {
      console.error("店舗詳細の取得エラー:", error);
      res.status(500).json({ message: "店舗情報の取得中にエラーが発生しました" });
    }
  });

  // 店舗情報の更新
  app.put("/api/stores/:id", async (req: AuthenticatedRequest, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const storeId = parseInt(req.params.id);
    if (isNaN(storeId)) {
      return res.status(400).json({ message: "無効な店舗IDです" });
    }

    const result = updateStoreSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: result.error.issues.map(i => i.message).join("、")
      });
    }

    try {
      const [store] = await db.query.stores.findMany({
        where: eq(stores.id, storeId),
        limit: 1,
      });

      if (!store) {
        return res.status(404).json({ message: "店舗が見つかりません" });
      }

      if (store.userId !== req.user!.id) {
        return res.status(403).json({ message: "アクセス権限がありません" });
      }

      const [updatedStore] = await db
        .update(stores)
        .set({
          ...result.data,
          updatedAt: new Date(),
        })
        .where(eq(stores.id, storeId))
        .returning();

      res.json({
        message: "店舗情報を更新しました",
        store: updatedStore,
      });
    } catch (error) {
      console.error("店舗更新エラー:", error);
      res.status(500).json({ message: "店舗情報の更新中にエラーが発生しました" });
    }
  });

  // 店舗の削除
  app.delete("/api/stores/:id", async (req: AuthenticatedRequest, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const storeId = parseInt(req.params.id);
    if (isNaN(storeId)) {
      return res.status(400).json({ message: "無効な店舗IDです" });
    }

    try {
      const [store] = await db.query.stores.findMany({
        where: eq(stores.id, storeId),
        limit: 1,
      });

      if (!store) {
        return res.status(404).json({ message: "店舗が見つかりません" });
      }

      if (store.userId !== req.user!.id) {
        return res.status(403).json({ message: "アクセス権限がありません" });
      }

      await db
        .delete(stores)
        .where(eq(stores.id, storeId));

      res.json({ message: "店舗を削除しました" });
    } catch (error) {
      console.error("店舗削除エラー:", error);
      res.status(500).json({ message: "店舗の削除中にエラーが発生しました" });
    }
  });
}