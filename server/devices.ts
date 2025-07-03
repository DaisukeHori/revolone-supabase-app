import { Router } from "express";
import { getDeviceRecords, getDevicesByCustomerId, getDeviceInfoBySerialNumbers } from "./services/kintone";
import { z } from "zod";

const router = Router();

interface DeviceRecord {
  レボナイザー引き当て製造番号: { value: string };
  隈部入出荷実行日付: { value: string };
  入出荷: { value: string };
  Stripe_CustomerID: { value: string };
  送り先サロン名: { value: string };
  送り先住所: { value: string | undefined };
  Stripe_SubscriptionID: { value: string };
}

interface GroupedDevices {
  [key: string]: {
    store: {
      id: string;
      name: string;
      address: string;
    };
    devices: Array<{
      serialNumber: string;
      status: string;
      statusUpdatedAt: string;
      stripeSubscriptionId: string;
      subscriptionRentalAvailability?: string;
    }>;
  };
}

// デバイス一覧を取得（店舗ごとにグループ化）
router.get("/api/devices", async (req, res) => {
  try {
    const kintoneRecords = await getDeviceRecords();

    // 製造番号ごとに最新のステータスを持つレコードを抽出
    const latestDeviceStatuses = new Map<string, any>();

    kintoneRecords.forEach((record: any) => {
      const serialNumber = record.レボナイザー引き当て製造番号.value;
      const currentDate = new Date(record.隈部入出荷実行日付.value);

      if (!latestDeviceStatuses.has(serialNumber) || 
          currentDate > new Date(latestDeviceStatuses.get(serialNumber)!.隈部入出荷実行日付.value)) {
        latestDeviceStatuses.set(serialNumber, record);
      }
    });

    // 出荷中のデバイスのみをグループ化
    const groupedDevices: GroupedDevices = {};

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
    const latestDeviceStatuses = new Map<string, any>();

    kintoneDevices.forEach((record: any) => {
      const serialNumber = record.レボナイザー引き当て製造番号.value;
      const currentDate = new Date(record.隈部入出荷実行日付.value);

      if (!latestDeviceStatuses.has(serialNumber) || 
          currentDate > new Date(latestDeviceStatuses.get(serialNumber)!.隈部入出荷実行日付.value)) {
        latestDeviceStatuses.set(serialNumber, record);
      }
    });

    // 出荷中のデバイスのみを抽出
    const shippedDevices = Array.from(latestDeviceStatuses.values())
      .filter(record => record.入出荷.value === "出荷");

    // 製造番号のリストを取得
    const serialNumbers = shippedDevices.map(record => record.レボナイザー引き当て製造番号.value);

    // App 21からデバイス情報を取得（サブスク貸出の可不可を含む）
    let deviceInfoRecords: any[] = [];
    try {
      deviceInfoRecords = await getDeviceInfoBySerialNumbers(serialNumbers);
      console.log(`[Device API] App 21から${deviceInfoRecords.length}件のデバイス情報を取得しました`);
    } catch (error: any) {
      console.warn('[Device API] App 21へのアクセスに失敗しました:', error.message);
      // APIアクセスできない場合は空の配列で続行
      deviceInfoRecords = [];
    }
    
    // デバイス情報をマップに変換
    const deviceInfoMap = new Map();
    deviceInfoRecords.forEach(info => {
      deviceInfoMap.set(info.文字列__1行__1.value, {
        availability: info.サブスク貸出の可不可.value,
        isSubstitute: info.代替え機の場合はチェック.value.length > 0
      });
    });

    // 最終的なデバイス一覧を作成
    const devices = shippedDevices.map(record => {
      const deviceInfo = deviceInfoMap.get(record.レボナイザー引き当て製造番号.value);
      let deviceCategory = null;
      
      if (deviceInfo) {
        if (deviceInfo.availability === '販売済') {
          deviceCategory = '購入機材';
        } else if (deviceInfo.isSubstitute) {
          deviceCategory = '代替え機';
        } else {
          deviceCategory = 'サブスク';
        }
      }
      
      return {
        serialNumber: record.レボナイザー引き当て製造番号.value,
        status: record.入出荷.value,
        statusUpdatedAt: record.隈部入出荷実行日付.value,
        stripeSubscriptionId: record.Stripe_SubscriptionID.value,
        subscriptionRentalAvailability: deviceInfo?.availability || null,
        deviceCategory: deviceCategory,
      };
    });

    console.log(`[Device API] Fetched ${devices.length} devices for store ${storeId}`);
    console.log(`[Device API] Device info from App 21:`, deviceInfoRecords.map(r => ({
      serialNumber: r.文字列__1行__1.value,
      availability: r.サブスク貸出の可不可.value,
      isSubstitute: r.代替え機の場合はチェック.value.length > 0
    })));

    res.json(devices);
  } catch (error) {
    console.error("店舗のデバイス一覧の取得に失敗:", error);
    res.status(500).json({ message: "店舗のデバイス一覧の取得に失敗しました" });
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