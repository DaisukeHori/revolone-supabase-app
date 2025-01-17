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

export async function getDeviceRecords() {
  try {
    const response = await axios.get(`${KINTONE_BASE_URL}/records.json?app=${KINTONE_APP_ID}`, {
      headers: {
        'X-Cybozu-API-Token': process.env.KINTONE_API_TOKEN,
      },
    });

    return response.data.records as KintoneDeviceRecord[];
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
    const query = `Stripe_CustomerID = "${customerId}"`;
    const response = await axios.get(
      `${KINTONE_BASE_URL}/records.json?app=${KINTONE_APP_ID}&query=${encodeURIComponent(query)}`,
      {
        headers: {
          'X-Cybozu-API-Token': process.env.KINTONE_API_TOKEN,
        },
      }
    );

    return response.data.records as KintoneDeviceRecord[];
  } catch (error) {
    console.error('Kintone APIエラー:', error);
    throw new Error('デバイスレコードの取得に失敗しました');
  }
}