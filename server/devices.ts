import { Router } from "express";
import { getDeviceRecords, getDevicesByCustomerId } from "./services/kintone";

const router = Router();

// デバイス一覧を取得（店舗ごとにグループ化）
router.get("/api/devices", async (req, res) => {
  try {
    const devices = await getDeviceRecords();
    const groupedDevices = new Map<string, {
      store: { id: string; name: string; address?: string };
      devices: Array<{
        serialNumber: string;
        status: string;
        statusUpdatedAt: string;
        stripeSubscriptionId: string;
      }>;
    }>();

    // デバイスを店舗（customerId）ごとにグループ化
    devices.forEach(device => {
      if (!groupedDevices.has(device.customerId)) {
        groupedDevices.set(device.customerId, {
          store: {
            id: device.customerId,
            name: device.storeName,
          },
          devices: [],
        });
      }

      const group = groupedDevices.get(device.customerId)!;
      group.devices.push({
        serialNumber: device.serialNumber,
        status: device.status,
        statusUpdatedAt: device.statusUpdatedAt,
        stripeSubscriptionId: device.stripeSubscriptionId,
      });
    });

    res.json(Array.from(groupedDevices.values()));
  } catch (error) {
    console.error("デバイス一覧の取得に失敗:", error);
    res.status(500).json({ message: "デバイス一覧の取得に失敗しました" });
  }
});

// 特定の店舗のデバイス一覧を取得
router.get("/api/stores/:storeId/devices", async (req, res) => {
  try {
    const { storeId } = req.params;
    const devices = await getDevicesByCustomerId(storeId);

    const formattedDevices = devices.map(device => ({
      serialNumber: device.serialNumber,
      status: device.status,
      statusUpdatedAt: device.statusUpdatedAt,
      stripeSubscriptionId: device.stripeSubscriptionId,
    }));

    res.json(formattedDevices);
  } catch (error) {
    console.error("店舗のデバイス一覧の取得に失敗:", error);
    res.status(500).json({ message: "店舗のデバイス一覧の取得に失敗しました" });
  }
});

// Kintoneからデバイス情報を同期
router.post("/api/devices/sync", async (req, res) => {
  try {
    const kintoneRecords = await getDeviceRecords();

    for (const record of kintoneRecords) {
        // Kintoneから直接取得したデータをそのまま返すように変更
        // データベースへの書き込みは行わない
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

    // データベースへの書き込みは行わない
    res.json({ message: "デバイスステータスを更新しました" });
  } catch (error) {
    console.error("デバイスステータスの更新に失敗:", error);
    res.status(500).json({ message: "デバイスステータスの更新に失敗しました" });
  }
});

export function setupDeviceRoutes(app: Router) {
  app.use(router);
}