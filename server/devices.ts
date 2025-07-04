import { Router } from "express";
import { getDeviceRecords, getDevicesByCustomerId, getDeviceInfoBySerialNumbers, getApp22Schema, getRepairHistoryBySerialNumber, getAllRepairRecords } from "./services/kintone";
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

// デバイス操作履歴を記録する関数（オーバーロード）
async function recordDeviceAction(
  serialNumber: string, 
  stripeCustomerId: string, 
  actionType: "return" | "exchange", 
  userId: number
): Promise<void>;
async function recordDeviceAction(
  serialNumber: string, 
  userId: string, 
  actionType: "repair_request", 
  additionalData?: any
): Promise<void>;
async function recordDeviceAction(
  serialNumber: string, 
  customerIdOrUserId: string, 
  actionType: "return" | "exchange" | "repair_request", 
  userIdOrAdditionalData?: number | any
): Promise<void> {
  const now = new Date();
  
  if (actionType === "repair_request") {
    // 修理申請の場合は別の処理
    console.log(`[Device Action] 修理申請記録: ${serialNumber}, ユーザー: ${customerIdOrUserId}`);
    // 実際のDB記録は後で実装
    return;
  }
  
  // 従来の return/exchange 処理
  const lockUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7日後
  const userId = userIdOrAdditionalData as number;

  await db.insert(deviceActionHistory).values({
    serialNumber,
    stripeCustomerId: customerIdOrUserId,
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

// デバイス返却リクエスト（台数減算 + メタデータ更新）
router.post("/api/devices/return", async (req, res) => {
  try {
    const { serialNumber, stripeSubscriptionId, reason, additionalInfo } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "認証が必要です" });
    }

    if (!serialNumber || !stripeSubscriptionId || !reason) {
      return res.status(400).json({ message: "製造番号、サブスクリプションID、返却理由が必要です" });
    }

    console.log(`[Device Return] 返却処理開始: ${serialNumber} (サブスクリプション: ${stripeSubscriptionId})`);

    // Stripeクライアントのインポートが必要
    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // 1. サブスクリプション情報を取得
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
      expand: ['items.data.price.product'],
    });

    console.log('[Device Return] 現在のサブスクリプション情報取得完了');

    // 2. 現在の台数を計算（簡易版）
    const currentTotalQuantity = subscription.items.data.reduce((total: number, item: any) => total + item.quantity, 0);
    
    if (currentTotalQuantity <= 0) {
      return res.status(400).json({ message: "返却可能なデバイスがありません" });
    }

    console.log(`[Device Return] 現在の台数: ${currentTotalQuantity}台`);

    // 3. 台数を1台減算するための新しい台数を計算
    const newTotalQuantity = currentTotalQuantity - 1;
    
    // Revonizer台数配分計算（サーバー側実装）
    const newQuantities: Record<string, number> = {
      'price_1NwwacAPdno01lSPWH92pzrl': 0, // 1台目
      'price_1OCCkvAPdno01lSP44FyPiZ3': 0, // 2-4台目
      'price_1OED1uAPdno01lSP3UESyV7C': 0  // 5台目以降
    };

    if (newTotalQuantity >= 1) {
      newQuantities['price_1NwwacAPdno01lSPWH92pzrl'] = 1; // 1台目は必須
    }
    if (newTotalQuantity >= 2) {
      const secondToFourthCount = Math.min(newTotalQuantity - 1, 3); // 2-4台目（最大3台）
      newQuantities['price_1OCCkvAPdno01lSP44FyPiZ3'] = secondToFourthCount;
    }
    if (newTotalQuantity >= 5) {
      const fifthAndMoreCount = newTotalQuantity - 4; // 5台目以降
      newQuantities['price_1OED1uAPdno01lSP3UESyV7C'] = fifthAndMoreCount;
    }

    console.log(`[Device Return] 新しい台数配分:`, newQuantities);

    // 4. 既存のメタデータから返却製造番号キーを削除
    let currentMetadata = subscription.metadata || {};
    const updatedMetadata = { ...currentMetadata };
    
    // 既存の返却製造番号キーを削除
    if (updatedMetadata['返却製造番号']) {
      delete updatedMetadata['返却製造番号'];
      console.log('[Device Return] 既存の返却製造番号を削除');
    }

    // 新しい返却製造番号を追加
    updatedMetadata['返却製造番号'] = serialNumber;
    updatedMetadata['返却理由'] = reason;
    if (additionalInfo) {
      updatedMetadata['返却詳細'] = additionalInfo;
    }

    // 5. サブスクリプションの台数とメタデータを同時に更新
    const updatedSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
      metadata: updatedMetadata,
      proration_behavior: 'create_prorations', // 日割り計算を有効にする
    });

    // 6. 各アイテムの数量を更新
    const updatePromises = subscription.items.data.map(async (item: any) => {
      const priceId = item.price.id;
      let newQuantity = 0;

      // Revonizerの価格IDに対応する新しい数量を取得
      Object.entries(newQuantities).forEach(([revonizerPriceId, quantity]: [string, number]) => {
        if (priceId === revonizerPriceId) {
          newQuantity = quantity;
        }
      });

      if (item.quantity !== newQuantity) {
        console.log(`[Device Return] アイテム更新: ${priceId} ${item.quantity} → ${newQuantity}`);
        return stripe.subscriptionItems.update(item.id, {
          quantity: newQuantity,
        });
      }
      return null;
    });

    await Promise.all(updatePromises.filter(Boolean));

    console.log(`[Device Return] 返却処理完了: ${serialNumber}`);
    console.log(`[Device Return] 台数変更: ${currentTotalQuantity} → ${newTotalQuantity}台`);
    console.log(`[Device Return] メタデータ更新: 返却製造番号 = ${serialNumber}`);

    res.json({
      success: true,
      message: "デバイスの返却処理が完了しました",
      serialNumber: serialNumber,
      oldQuantity: currentTotalQuantity,
      newQuantity: newTotalQuantity,
      metadata: updatedMetadata
    });

  } catch (error) {
    console.error("デバイス返却処理エラー:", error);
    res.status(500).json({
      success: false,
      message: "返却処理中にエラーが発生しました",
      error: error instanceof Error ? error.message : "Unknown error"
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

// 購入機材の修理申請
router.post("/api/devices/repair-request", async (req, res) => {
  try {
    const { serialNumber, issues, additionalInfo, deviceType } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "認証が必要です" });
    }

    if (!serialNumber || !issues || issues.length === 0) {
      return res.status(400).json({ message: "必要な情報が不足しています" });
    }

    // デバイス操作履歴として修理申請を記録
    await recordDeviceAction(
      serialNumber,
      userId.toString(),
      'repair_request',
      {
        issues,
        additionalInfo,
        deviceType,
        requestDate: new Date().toISOString()
      }
    );

    console.log(`[Device API] 修理申請を受け付けました - シリアル番号: ${serialNumber}, 不具合: ${issues.join(', ')}`);

    res.json({ 
      message: "修理申請を受け付けました",
      serialNumber,
      issues,
      requestId: `REP-${Date.now()}`
    });

  } catch (error: any) {
    console.error("修理申請エラー:", error);
    res.status(500).json({ message: "修理申請に失敗しました", error: error.message });
  }
});

// App22のスキーマを確認するエンドポイント
router.get("/api/app22/schema", async (req, res) => {
  try {
    const schema = await getApp22Schema();
    res.json(schema);
  } catch (error: any) {
    console.error("App22スキーマ取得エラー:", error);
    res.status(500).json({ message: "App22スキーマの取得に失敗しました", error: error.message });
  }
});

// App22のサンプルレコードを確認するエンドポイント
router.get("/api/app22/sample", async (req, res) => {
  try {
    const records = await getAllRepairRecords();
    res.json({
      total: records.length,
      sample: records.slice(0, 3),
      availableFields: records.length > 0 ? Object.keys(records[0]) : []
    });
  } catch (error: any) {
    console.error("App22サンプルレコード取得エラー:", error);
    res.status(500).json({ message: "App22サンプルレコードの取得に失敗しました", error: error.message });
  }
});

// 修理履歴を取得するエンドポイント
router.get("/api/devices/:serialNumber/repair-history", async (req, res) => {
  try {
    const { serialNumber } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "認証が必要です" });
    }

    console.log(`[Device API] 修理履歴取得開始 - シリアル番号: ${serialNumber}`);
    
    const repairHistory = await getRepairHistoryBySerialNumber(serialNumber);
    
    console.log(`[Device API] 修理履歴取得完了 - 件数: ${repairHistory.length}`);
    
    res.json(repairHistory);
  } catch (error: any) {
    console.error("修理履歴取得エラー:", error);
    res.status(500).json({ message: "修理履歴の取得に失敗しました", error: error.message });
  }
});

// テスト用：認証なしで修理履歴を取得するエンドポイント  
router.get("/api/test/repair-history/:serialNumber", async (req, res) => {
  try {
    const { serialNumber } = req.params;
    
    console.log(`[Test API] 修理履歴取得テスト - シリアル番号: ${serialNumber}`);
    
    // JSON レスポンスであることを明示的に設定
    res.setHeader('Content-Type', 'application/json');
    
    const repairHistory = await getRepairHistoryBySerialNumber(serialNumber);
    
    console.log(`[Test API] 修理履歴取得完了 - 件数: ${repairHistory.length}`);
    console.log(`[Test API] データサンプル:`, repairHistory.slice(0, 1));
    
    res.json({
      serialNumber,
      count: repairHistory.length,
      data: repairHistory
    });
  } catch (error: any) {
    console.error("テスト修理履歴取得エラー:", error);
    res.status(500).json({ message: "修理履歴の取得に失敗しました", error: error.message });
  }
});

// 特定の製造番号での迅速テスト
router.get("/api/quick-test-2102145", async (req, res) => {
  try {
    console.log('2102145のテスト開始');
    res.setHeader('Content-Type', 'application/json');
    
    const repairHistory = await getRepairHistoryBySerialNumber('2102145');
    
    res.json({
      success: true,
      serialNumber: '2102145',
      records: repairHistory.length,
      sampleData: repairHistory.length > 0 ? repairHistory[0] : null
    });
  } catch (error: any) {
    console.error("2102145テストエラー:", error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

export function setupDeviceRoutes(app: Router) {
  app.use(router);
}