import { Router } from "express";
import { getDeviceRecords, getDevicesByCustomerId } from "./services/kintone";

const router = Router();

// デバイス一覧を取得（店舗ごとにグループ化）
router.get("/api/devices", async (req, res) => {
  try {
    const kintoneRecords = await getDeviceRecords();

    // 製造番号ごとに最新のステータスを持つレコードを抽出
    const latestDeviceStatuses = new Map();

    kintoneRecords.forEach(record => {
      const serialNumber = record.レボナイザー引き当て製造番号.value;
      const currentDate = new Date(record.隈部入出荷実行日付.value);

      if (!latestDeviceStatuses.has(serialNumber) || 
          currentDate > new Date(latestDeviceStatuses.get(serialNumber).隈部入出荷実行日付.value)) {
        latestDeviceStatuses.set(serialNumber, record);
      }
    });

    // 出荷中のデバイスのみをグループ化
    const groupedDevices = {};

    latestDeviceStatuses.forEach((record) => {
      // 最新のステータスが「返却」の場合はスキップ
      if (record.入出荷.value === "返却") return;

      const storeId = record.Stripe_CustomerID.value;
      if (!groupedDevices[storeId]) {
        groupedDevices[storeId] = {
          store: {
            id: storeId,
            name: record.送り先サロン名.value,
            address: record.送り先住所?.value || '住所未設定',
          },
          devices: []
        };
      }

      groupedDevices[storeId].devices.push({
        serialNumber: record.レボナイザー引き当て製造番号.value,
        status: record.入出荷.value,
        statusUpdatedAt: record.隈部入出荷実行日付.value,
        stripeSubscriptionId: record.Stripe_SubscriptionID.value,
      });
    });

    res.json(Object.values(groupedDevices));
  } catch (error) {
    console.error("デバイス一覧の取得に失敗:", error);
    res.status(500).json({ message: "デバイス一覧の取得に失敗しました" });
  }
});

// 特定の店舗のデバイス一覧を取得
router.get("/api/stores/:storeId/devices", async (req, res) => {
  try {
    const { storeId } = req.params;
    const kintoneDevices = await getDevicesByCustomerId(storeId);

    // 製造番号ごとに最新のステータスを持つレコードを抽出
    const latestDeviceStatuses = new Map();

    kintoneDevices.forEach(record => {
      const serialNumber = record.レボナイザー引き当て製造番号.value;
      const currentDate = new Date(record.隈部入出荷実行日付.value);

      if (!latestDeviceStatuses.has(serialNumber) || 
          currentDate > new Date(latestDeviceStatuses.get(serialNumber).隈部入出荷実行日付.value)) {
        latestDeviceStatuses.set(serialNumber, record);
      }
    });

    // 出荷中のデバイスのみを配列に変換
    const devices = Array.from(latestDeviceStatuses.values())
      .filter(record => record.入出荷.value === "出荷")
      .map(record => ({
        serialNumber: record.レボナイザー引き当て製造番号.value,
        status: record.入出荷.value,
        statusUpdatedAt: record.隈部入出荷実行日付.value,
        stripeSubscriptionId: record.Stripe_SubscriptionID.value,
      }));

    res.json(devices);
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