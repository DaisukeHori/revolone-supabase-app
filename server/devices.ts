import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@db";
import { devices, stores } from "@db/schema";
import { getKintoneDevices, type KintoneDeviceRecord } from "./services/kintone";
import * as z from 'zod';

const router = Router();

// デバイス一覧を取得（店舗ごとにグループ化）
router.get("/api/devices", async (req, res) => {
  try {
    console.log("デバイス一覧の取得を開始");

    // 1. データベースから店舗情報を取得
    const allStores = await db.query.stores.findMany({
      with: {
        devices: true,
      },
    });

    // 2. Kintoneから最新のデバイス情報を取得
    const customerIds = allStores.map(store => store.stripeCustomerId).filter(Boolean) as string[];
    const kintoneDevices = await getKintoneDevices(customerIds);

    // 3. Kintoneのデータを店舗ごとにグループ化
    const devicesByStore = allStores.map(store => {
      const storeDevices = kintoneDevices.filter(
        device => device.Stripe_CustomerID.value === store.stripeCustomerId
      );

      return {
        id: store.id,
        name: store.name,
        address: store.address,
        devices: storeDevices.map(device => ({
          id: device.$id.value,
          serialNumber: device.レボナイザー引き当て製造番号.value,
          status: device.入出荷.value,
          statusUpdatedAt: device.隈部入出荷実行日付.value,
          stripeSubscriptionId: device.Stripe_SubscriptionID.value,
        })),
      };
    });

    console.log(`デバイス一覧を取得完了: ${devicesByStore.length}件の店舗データ`);
    res.json(devicesByStore);
  } catch (error: any) {
    console.error("デバイス一覧の取得に失敗:", error);
    res.status(500).json({ 
      message: "デバイス一覧の取得に失敗しました",
      details: error.message 
    });
  }
});

// Kintoneからデバイス情報を同期（メタデータのみ）
router.post("/api/devices/sync", async (req, res) => {
  try {
    console.log("Kintoneからのメタデータ同期を開始");
    const kintoneRecords = await getKintoneDevices();
    console.log(`Kintoneから${kintoneRecords.length}件のレコードを取得`);

    let successCount = 0;
    let errorCount = 0;

    for (const record of kintoneRecords) {
      try {
        const store = await db.query.stores.findFirst({
          where: eq(stores.stripeCustomerId, record.Stripe_CustomerID.value),
        });

        if (!store) {
          console.warn(`Store not found for Stripe Customer ID: ${record.Stripe_CustomerID.value}`);
          errorCount++;
          continue;
        }

        // デバイスの参照情報のみを更新
        await db
          .insert(devices)
          .values({
            storeId: store.id,
            serialNumber: record.レボナイザー引き当て製造番号.value,
            kintoneRecordId: record.$id.value,
          })
          .onConflictDoUpdate({
            target: devices.serialNumber,
            set: {
              kintoneRecordId: record.$id.value,
            },
          });

        successCount++;
      } catch (error) {
        console.error(`デバイス同期エラー (${record.レボナイザー引き当て製造番号.value}):`, error);
        errorCount++;
      }
    }

    console.log(`同期完了: 成功=${successCount}, 失敗=${errorCount}`);
    res.json({ 
      message: "デバイス参照情報の同期が完了しました",
      details: `${successCount}件成功, ${errorCount}件失敗`
    });
  } catch (error: any) {
    console.error("デバイス参照情報の同期に失敗:", error);
    res.status(500).json({ 
      message: "デバイス参照情報の同期に失敗しました",
      details: error.message 
    });
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
  } catch (error: any) {
    console.error("デバイスステータスの更新に失敗:", error);
    res.status(500).json({ 
      message: "デバイスステータスの更新に失敗しました",
      details: error.message 
    });
  }
});

export function setupDeviceRoutes(app: Router) {
  app.use(router);
}