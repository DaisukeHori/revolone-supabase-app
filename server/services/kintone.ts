import axios from 'axios';

const KINTONE_BASE_URL = 'https://e18p5.cybozu.com/k/v1';
const KINTONE_APP_ID = '40';

interface KintoneDeviceRecord {
  $id: { value: string };
  レボナイザー引き当て製造番号: { value: string };
  入出荷: { value: "出荷" | "返却" };
  隈部入出荷実行日付: { value: string };
  Stripe_SubscriptionID: { value: string };
  Stripe_CustomerID: { value: string };
  送り先サロン名: { value: string };
  メールアドレス: { value: string };
}

interface ProcessedDevice {
  serialNumber: string;
  status: "出荷" | "返却";
  statusUpdatedAt: string;
  stripeSubscriptionId: string;
  customerId: string;
  storeName: string;
}

export async function getDeviceRecords() {
  try {
    // orderBy パラメータを追加して日付順にソート
    const response = await axios.get(
      `${KINTONE_BASE_URL}/records.json?app=${KINTONE_APP_ID}&orderBy=隈部入出荷実行日付 asc`,
      {
        headers: {
          'X-Cybozu-API-Token': process.env.KINTONE_API_TOKEN,
        },
      }
    );

    const records = response.data.records as KintoneDeviceRecord[];
    const deviceStatusMap = new Map<string, ProcessedDevice>();

    // 各レコードを処理し、同じ製造番号のデバイスは最新の状態を保持
    records.forEach(record => {
      const serialNumber = record.レボナイザー引き当て製造番号.value;
      const newDevice: ProcessedDevice = {
        serialNumber,
        status: record.入出荷.value,
        statusUpdatedAt: record.隈部入出荷実行日付.value,
        stripeSubscriptionId: record.Stripe_SubscriptionID.value,
        customerId: record.Stripe_CustomerID.value,
        storeName: record.送り先サロン名.value,
      };

      deviceStatusMap.set(serialNumber, newDevice);
    });

    // 返却済みのデバイスを除外し、現在出荷中のデバイスのみを返す
    return Array.from(deviceStatusMap.values()).filter(
      device => device.status === "出荷"
    );
  } catch (error) {
    console.error('Kintone APIエラー:', error);
    throw new Error('デバイスレコードの取得に失敗しました');
  }
}

export async function getDeviceRecordBySerialNumber(serialNumber: string) {
  try {
    const query = `レボナイザー引き当て製造番号 = "${serialNumber}"`;
    const response = await axios.get(
      `${KINTONE_BASE_URL}/records.json?app=${KINTONE_APP_ID}&query=${encodeURIComponent(query)}`,
      {
        headers: {
          'X-Cybozu-API-Token': process.env.KINTONE_API_TOKEN,
        },
      }
    );

    const records = response.data.records as KintoneDeviceRecord[];
    return records[0] || null;
  } catch (error) {
    console.error('Kintone APIエラー:', error);
    throw new Error('デバイスレコードの取得に失敗しました');
  }
}

export async function getDevicesByCustomerId(customerId: string) {
  try {
    const query = `Stripe_CustomerID = "${customerId}" order by 隈部入出荷実行日付 asc`;
    const response = await axios.get(
      `${KINTONE_BASE_URL}/records.json?app=${KINTONE_APP_ID}&query=${encodeURIComponent(query)}`,
      {
        headers: {
          'X-Cybozu-API-Token': process.env.KINTONE_API_TOKEN,
        },
      }
    );

    const records = response.data.records as KintoneDeviceRecord[];
    const deviceStatusMap = new Map<string, ProcessedDevice>();

    // 各レコードを処理し、同じ製造番号のデバイスは最新の状態を保持
    records.forEach(record => {
      const serialNumber = record.レボナイザー引き当て製造番号.value;
      const newDevice: ProcessedDevice = {
        serialNumber,
        status: record.入出荷.value,
        statusUpdatedAt: record.隈部入出荷実行日付.value,
        stripeSubscriptionId: record.Stripe_SubscriptionID.value,
        customerId: record.Stripe_CustomerID.value,
        storeName: record.送り先サロン名.value,
      };

      deviceStatusMap.set(serialNumber, newDevice);
    });

    // 返却済みのデバイスを除外し、現在出荷中のデバイスのみを返す
    return Array.from(deviceStatusMap.values()).filter(
      device => device.status === "出荷"
    );
  } catch (error) {
    console.error('Kintone APIエラー:', error);
    throw new Error('デバイスレコードの取得に失敗しました');
  }
}