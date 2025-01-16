import { type Express } from "express";
import { db } from "@db";
import { devices, stores, insertDeviceSchema, updateDeviceSchema } from "@db/schema";
import { eq, and } from "drizzle-orm";

export function setupDeviceRoutes(app: Express) {
  // デバイス一覧の取得（店舗IDでグループ化）
  app.get("/api/devices", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    try {
      const userDevices = await db.query.stores.findMany({
        where: eq(stores.userId, req.user.id),
        with: {
          devices: true,
        },
        orderBy: stores.createdAt,
      });

      res.json(userDevices);
    } catch (error) {
      console.error("デバイス一覧の取得エラー:", error);
      res.status(500).json({ message: "デバイス情報の取得中にエラーが発生しました" });
    }
  });

  // 店舗別のデバイス一覧取得
  app.get("/api/stores/:storeId/devices", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const storeId = parseInt(req.params.storeId);
    if (isNaN(storeId)) {
      return res.status(400).json({ message: "無効な店舗IDです" });
    }

    try {
      // 店舗の所有権を確認
      const [store] = await db.query.stores.findMany({
        where: and(
          eq(stores.id, storeId),
          eq(stores.userId, req.user.id)
        ),
        limit: 1,
      });

      if (!store) {
        return res.status(404).json({ message: "店舗が見つかりません" });
      }

      const storeDevices = await db.query.devices.findMany({
        where: eq(devices.storeId, storeId),
        orderBy: devices.createdAt,
      });

      res.json(storeDevices);
    } catch (error) {
      console.error("店舗別デバイス一覧の取得エラー:", error);
      res.status(500).json({ message: "デバイス情報の取得中にエラーが発生しました" });
    }
  });

  // デバイスの新規登録
  app.post("/api/stores/:storeId/devices", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const storeId = parseInt(req.params.storeId);
    if (isNaN(storeId)) {
      return res.status(400).json({ message: "無効な店舗IDです" });
    }

    const result = insertDeviceSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: result.error.issues.map(i => i.message).join("、")
      });
    }

    try {
      // 店舗の所有権を確認
      const [store] = await db.query.stores.findMany({
        where: and(
          eq(stores.id, storeId),
          eq(stores.userId, req.user.id)
        ),
        limit: 1,
      });

      if (!store) {
        return res.status(404).json({ message: "店舗が見つかりません" });
      }

      // シリアル番号の重複チェック
      const [existingDevice] = await db.query.devices.findMany({
        where: eq(devices.serialNumber, result.data.serialNumber),
        limit: 1,
      });

      if (existingDevice) {
        return res.status(400).json({ message: "この製造番号は既に登録されています" });
      }

      const [newDevice] = await db
        .insert(devices)
        .values({
          ...result.data,
          storeId,
        })
        .returning();

      res.json({
        message: "デバイスを登録しました",
        device: newDevice,
      });
    } catch (error) {
      console.error("デバイス登録エラー:", error);
      res.status(500).json({ message: "デバイスの登録中にエラーが発生しました" });
    }
  });

  // デバイス情報の更新
  app.put("/api/devices/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const deviceId = parseInt(req.params.id);
    if (isNaN(deviceId)) {
      return res.status(400).json({ message: "無効なデバイスIDです" });
    }

    const result = updateDeviceSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: result.error.issues.map(i => i.message).join("、")
      });
    }

    try {
      // デバイスと関連する店舗の所有権を確認
      const [device] = await db.query.devices.findMany({
        where: eq(devices.id, deviceId),
        with: {
          store: true,
        },
        limit: 1,
      });

      if (!device) {
        return res.status(404).json({ message: "デバイスが見つかりません" });
      }

      if (device.store.userId !== req.user.id) {
        return res.status(403).json({ message: "アクセス権限がありません" });
      }

      // シリアル番号の重複チェック（変更がある場合のみ）
      if (result.data.serialNumber && result.data.serialNumber !== device.serialNumber) {
        const [existingDevice] = await db.query.devices.findMany({
          where: eq(devices.serialNumber, result.data.serialNumber),
          limit: 1,
        });

        if (existingDevice) {
          return res.status(400).json({ message: "この製造番号は既に登録されています" });
        }
      }

      const updateData = {
        ...result.data,
        updatedAt: new Date(),
      } as const;

      const [updatedDevice] = await db
        .update(devices)
        .set(updateData)
        .where(eq(devices.id, deviceId))
        .returning();

      res.json({
        message: "デバイス情報を更新しました",
        device: updatedDevice,
      });
    } catch (error) {
      console.error("デバイス更新エラー:", error);
      res.status(500).json({ message: "デバイス情報の更新中にエラーが発生しました" });
    }
  });

  // デバイスのステータス更新
  app.put("/api/devices/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const deviceId = parseInt(req.params.id);
    if (isNaN(deviceId)) {
      return res.status(400).json({ message: "無効なデバイスIDです" });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: "ステータスが指定されていません" });
    }

    try {
      // デバイスと関連する店舗の所有権を確認
      const [device] = await db.query.devices.findMany({
        where: eq(devices.id, deviceId),
        with: {
          store: true,
        },
        limit: 1,
      });

      if (!device) {
        return res.status(404).json({ message: "デバイスが見つかりません" });
      }

      if (device.store.userId !== req.user.id) {
        return res.status(403).json({ message: "アクセス権限がありません" });
      }

      const [updatedDevice] = await db
        .update(devices)
        .set({
          status,
          lastStatusUpdate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(devices.id, deviceId))
        .returning();

      res.json({
        message: "デバイスのステータスを更新しました",
        device: updatedDevice,
      });
    } catch (error) {
      console.error("デバイスステータス更新エラー:", error);
      res.status(500).json({ message: "デバイスステータスの更新中にエラーが発生しました" });
    }
  });
}