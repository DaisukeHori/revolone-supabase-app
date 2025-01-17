import axios from 'axios';

const KINTONE_BASE_URL = 'https://e18p5.cybozu.com/k/v1';
const KINTONE_APP_ID = '40'; // レボナイザー管理アプリのID

export interface KintoneDeviceRecord {
  $id: { value: string };
  レボナイザー引き当て製造番号: { value: string };
  入出荷: { value: "出荷" | "返却" };
  隈部入出荷実行日付: { value: string };
  Stripe_SubscriptionID: { value: string };
  Stripe_CustomerID: { value: string };
  送り先サロン名: { value: string };
  メールアドレス: { value: string };
}

export async function getKintoneDevices(customerIds?: string[]) {
  try {
    console.log('Kintone APIリクエスト開始');
    let query = '';
    if (customerIds?.length) {
      query = `Stripe_CustomerID in (${customerIds.map(id => `"${id}"`).join(',')})`;
    }

    const response = await axios.get(
      `${KINTONE_BASE_URL}/records.json`, {
        params: {
          app: KINTONE_APP_ID,
          query: query,
        },
        headers: {
          'X-Cybozu-API-Token': process.env.KINTONE_API_TOKEN,
        },
      }
    );
    console.log('Kintone APIレスポンス受信:', response.status);
    return response.data.records as KintoneDeviceRecord[];
  } catch (error: any) {
    console.error('Kintone APIエラー:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw new Error(`Kintoneからのデータ取得に失敗: ${error.message}`);
  }
}

export async function getKintoneDeviceBySerialNumber(serialNumber: string) {
  try {
    const query = `レボナイザー引き当て製造番号 = "${serialNumber}"`;
    const response = await axios.get(
      `${KINTONE_BASE_URL}/records.json`, {
        params: {
          app: KINTONE_APP_ID,
          query: query,
        },
        headers: {
          'X-Cybozu-API-Token': process.env.KINTONE_API_TOKEN,
        },
      }
    );

    const records = response.data.records as KintoneDeviceRecord[];
    return records[0] || null;
  } catch (error: any) {
    console.error('Kintone APIエラー:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw new Error(`Kintoneからのデータ取得に失敗: ${error.message}`);
  }
}