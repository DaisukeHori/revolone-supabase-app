import { Router } from "express";
import { getDeviceRecords, getDevicesByCustomerId, getDeviceInfoBySerialNumbers } from "./services/kintone";
import { db } from "../db";
import { deviceExchangeRequests, deviceActionHistory } from "../db/schema";
import { eq, and, gte } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// デバイス操作制限をチェックする関数
async function checkDeviceActionLock(serialNumber: string, stripeCustomerId: string): Promise<{
  isLocked: boolean;
  lockUntil?: Date;
  actionType?: string;
}> {
  const now = new Date();
  
  const lockRecord = await db
    .select()
    .from(deviceActionHistory)
    .where(
      and(
        eq(deviceActionHistory.serialNumber, serialNumber),
        eq(deviceActionHistory.stripeCustomerId, stripeCustomerId),
        gte(deviceActionHistory.lockUntil, now)
      )
    )
    .orderBy(deviceActionHistory.actionDate)
    .limit(1);

  if (lockRecord.length > 0) {
    return {
      isLocked: true,
      lockUntil: lockRecord[0].lockUntil,
      actionType: lockRecord[0].actionType
    };
  }

  return { isLocked: false };
}

// デバイス操作履歴を記録する関数
async function recordDeviceAction(
  serialNumber: string, 
  stripeCustomerId: string, 
  actionType: "return" | "exchange", 
  userId: number
): Promise<void> {
  const now = new Date();
  const lockUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7日後

  await db.insert(deviceActionHistory).values({
    serialNumber,
    stripeCustomerId,
    actionType,
    lockUntil,
    userId,
  });
}

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

    // 最終的なデバイス一覧を作成（操作制限情報を含む）
    const devices = await Promise.all(
      shippedDevices.map(async record => {
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

        // デバイス操作制限をチェック
        const lockInfo = await checkDeviceActionLock(
          record.レボナイザー引き当て製造番号.value,
          storeId
        );
        
        return {
          serialNumber: record.レボナイザー引き当て製造番号.value,
          status: record.入出荷.value,
          statusUpdatedAt: record.隈部入出荷実行日付.value,
          stripeSubscriptionId: record.Stripe_SubscriptionID.value,
          subscriptionRentalAvailability: deviceInfo?.availability || null,
          deviceCategory: deviceCategory,
          isActionLocked: lockInfo.isLocked,
          lockUntil: lockInfo.lockUntil,
          lastActionType: lockInfo.actionType,
        };
      })
    );

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

// デバイス交換リクエスト（詳細情報付き）
router.post("/api/devices/exchange-request", async (req, res) => {
  try {
    const { serialNumber, issues, notes, stripeCustomerId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "認証が必要です" });
    }

    if (!stripeCustomerId) {
      return res.status(400).json({ message: "顧客番号が必要です" });
    }

    // デバイス操作制限をチェック
    const lockInfo = await checkDeviceActionLock(serialNumber, stripeCustomerId);
    if (lockInfo.isLocked) {
      return res.status(403).json({ 
        message: `このデバイスは${lockInfo.lockUntil?.toLocaleDateString()}まで操作が制限されています（前回の操作: ${lockInfo.actionType === 'return' ? '返却' : '交換'}）`,
        lockUntil: lockInfo.lockUntil,
        lastActionType: lockInfo.actionType
      });
    }

    // DBに交換リクエストを保存（一時的にコメントアウト）
    // const exchangeRequest = await db.insert(deviceExchangeRequests).values({
    //   serialNumber,
    //   userId,
    //   issues,
    //   notes,
    // }).returning();
    
    // 一時的なモック
    const exchangeRequest = [{ id: Date.now() }];

    // Zapier Webhookにリクエストを送信
    const zapierUrl = 'https://hooks.zapier.com/hooks/catch/17071556/u3orkoq/';
    const payload = {
      serialNumber,
      action: "exchange",
      issues,
      notes,
      requestId: exchangeRequest[0].id,
      timestamp: new Date().toISOString(),
      requestedBy: req.user?.email || "unknown"
    };

    const response = await fetch(zapierUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Zapier webhook failed: ${response.status}`);
    }

    const result = await response.json();
    
    // ZapierのレスポンスIDをDBに保存（一時的にコメントアウト）
    // await db.update(deviceExchangeRequests)
    //   .set({ zapierRequestId: result.id })
    //   .where(eq(deviceExchangeRequests.id, exchangeRequest[0].id));

    // 交換リクエスト成功時に操作履歴を記録（7日間の制限開始）
    await recordDeviceAction(serialNumber, stripeCustomerId, "exchange", userId);

    console.log(`[Device Exchange] シリアル番号 ${serialNumber} の交換リクエスト送信成功:`, result);
    console.log(`[Device Exchange] 操作履歴記録完了: ${serialNumber} (顧客: ${stripeCustomerId}) - 7日間制限開始`);
    
    res.json({ 
      success: true, 
      message: "交換リクエストが正常に送信されました。このデバイスは7日間操作が制限されます。",
      requestId: exchangeRequest[0].id,
      zapierResponse: result
    });
  } catch (error) {
    console.error("デバイス交換リクエストの送信に失敗:", error);
    res.status(500).json({ 
      success: false, 
      message: "交換リクエストの送信に失敗しました" 
    });
  }
});

// デバイス返却リクエスト
router.post("/api/devices/return-request", async (req, res) => {
  try {
    const { serialNumber, stripeCustomerId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "認証が必要です" });
    }

    if (!stripeCustomerId) {
      return res.status(400).json({ message: "顧客番号が必要です" });
    }

    // デバイス操作制限をチェック
    const lockInfo = await checkDeviceActionLock(serialNumber, stripeCustomerId);
    if (lockInfo.isLocked) {
      return res.status(403).json({ 
        message: `このデバイスは${lockInfo.lockUntil?.toLocaleDateString()}まで操作が制限されています（前回の操作: ${lockInfo.actionType === 'return' ? '返却' : '交換'}）`,
        lockUntil: lockInfo.lockUntil,
        lastActionType: lockInfo.actionType
      });
    }

    // Zapier Webhookにリクエストを送信
    const zapierUrl = 'https://hooks.zapier.com/hooks/catch/17071556/u3orkoq/';
    const payload = {
      serialNumber: serialNumber,
      action: "return",
      timestamp: new Date().toISOString(),
      requestedBy: req.user?.email || "unknown",
      stripeCustomerId: stripeCustomerId
    };

    const response = await fetch(zapierUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Zapier webhook failed: ${response.status}`);
    }

    const result = await response.json();

    // 返却リクエスト成功時に操作履歴を記録（7日間の制限開始）
    await recordDeviceAction(serialNumber, stripeCustomerId, "return", userId);

    console.log(`[Device Return] シリアル番号 ${serialNumber} の返却リクエスト送信成功:`, result);
    console.log(`[Device Return] 操作履歴記録完了: ${serialNumber} (顧客: ${stripeCustomerId}) - 7日間制限開始`);
    
    res.json({ 
      success: true, 
      message: "返却リクエストが正常に送信されました。このデバイスは7日間操作が制限されます。",
      zapierResponse: result
    });
  } catch (error) {
    console.error("デバイス返却リクエストの送信に失敗:", error);
    res.status(500).json({ 
      success: false, 
      message: "返却リクエストの送信に失敗しました" 
    });
  }
});

// 旧エンドポイント（下位互換性のため残す）
router.post("/api/devices/:serialNumber/exchange", async (req, res) => {
  try {
    const { serialNumber } = req.params;
    
    // Zapier Webhookにリクエストを送信
    const zapierUrl = 'https://hooks.zapier.com/hooks/catch/17071556/u3orkoq/';
    const payload = {
      serialNumber: serialNumber,
      action: "exchange",
      timestamp: new Date().toISOString(),
      requestedBy: req.user?.email || "unknown"
    };

    const response = await fetch(zapierUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Zapier webhook failed: ${response.status}`);
    }

    const result = await response.json();
    console.log(`[Device Exchange] シリアル番号 ${serialNumber} の交換リクエスト送信成功:`, result);
    
    res.json({ 
      success: true, 
      message: "交換リクエストが正常に送信されました",
      zapierResponse: result
    });
  } catch (error) {
    console.error("デバイス交換リクエストの送信に失敗:", error);
    res.status(500).json({ 
      success: false, 
      message: "交換リクエストの送信に失敗しました" 
    });
  }
});

export function setupDeviceRoutes(app: Router) {
  app.use(router);
}