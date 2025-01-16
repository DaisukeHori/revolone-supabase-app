import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@db";
import { devices, stores } from "@db/schema";
import { getDeviceRecords } from "./services/kintone";
import { z } from "zod";

const router = Router();

// デバイス一覧を取得（店舗ごとにグループ化）
router.get("/api/devices", async (req, res) => {
  try {
    const allDevices = await db.query.devices.findMany({
      with: {
        store: true,
      },
      orderBy: [desc(devices.updatedAt)],
    });

    // 店舗ごとにデバイスをグループ化
    const groupedDevices = allDevices.reduce((acc, device) => {
      const store = device.store;
      if (!acc[store.id]) {
        acc[store.id] = {
          store: {
            id: store.id,
            name: store.name,
            address: store.address,
          },
          devices: [],
        };
      }
      acc[store.id].devices.push({
        id: device.id,
        serialNumber: device.serialNumber,
        status: device.status,
        statusUpdatedAt: device.statusUpdatedAt,
        stripeSubscriptionId: device.stripeSubscriptionId,
      });
      return acc;
    }, {} as Record<number, { store: any; devices: any[] }>);

    res.json(Object.values(groupedDevices));
  } catch (error) {
    console.error("デバイス一覧の取得に失敗:", error);
    res.status(500).json({ message: "デバイス一覧の取得に失敗しました" });
  }
});

// Kintoneからデバイス情報を同期
router.post("/api/devices/sync", async (req, res) => {
  try {
    const kintoneRecords = await getDeviceRecords();
    
    for (const record of kintoneRecords) {
      const store = await db.query.stores.findFirst({
        where: eq(stores.stripeCustomerId, record.Stripe_CustomerID.value),
      });

      if (!store) {
        console.warn(`Store not found for Stripe Customer ID: ${record.Stripe_CustomerID.value}`);
        continue;
      }

      // デバイスの更新または作成
      await db
        .insert(devices)
        .values({
          storeId: store.id,
          serialNumber: record.レボナイザー引き当て製造番号.value,
          status: record.入出荷.value,
          statusUpdatedAt: new Date(record.隈部入出荷実行日付.value),
          stripeSubscriptionId: record.Stripe_SubscriptionID.value,
          kintoneRecordId: record.$id.value,
        })
        .onConflictDoUpdate({
          target: devices.serialNumber,
          set: {
            status: record.入出荷.value,
            statusUpdatedAt: new Date(record.隈部入出荷実行日付.value),
            stripeSubscriptionId: record.Stripe_SubscriptionID.value,
          },
        });
    }

    res.json({ message: "デバイス情報の同期が完了しました" });
  } catch (error) {
    console.error("デバイス情報の同期に失敗:", error);
    res.status(500).json({ message: "デバイス情報の同期に失敗しました" });
  }
});

// デバイスステータスの更新
router.patch("/api/devices/:id/status", async (req, res) => {
  const updateSchema = z.object({
    status: z.enum(["出荷", "返却"]),
  });

  try {
    const { id } = req.params;
    const body = updateSchema.parse(req.body);

    await db
      .update(devices)
      .set({
        status: body.status,
        statusUpdatedAt: new Date(),
      })
      .where(eq(devices.id, parseInt(id)));

    res.json({ message: "デバイスステータスを更新しました" });
  } catch (error) {
    console.error("デバイスステータスの更新に失敗:", error);
    res.status(500).json({ message: "デバイスステータスの更新に失敗しました" });
  }
});

export function setupDeviceRoutes(app: Router) {
  app.use(router);
}
