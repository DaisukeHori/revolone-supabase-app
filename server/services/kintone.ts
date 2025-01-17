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

    const requestConfig = {
      params: {
        app: KINTONE_APP_ID,
        query: query,
      },
      headers: {
        'X-Cybozu-API-Token': process.env.KINTONE_API_TOKEN,
      },
    };

    console.log('Kintoneリクエスト詳細:', {
      url: `${KINTONE_BASE_URL}/records.json`,
      params: requestConfig.params,
      headers: {
        ...requestConfig.headers,
        'X-Cybozu-API-Token': '********', // トークンは表示しない
      },
    });

    const response = await axios.get(
      `${KINTONE_BASE_URL}/records.json`,
      requestConfig
    );

    console.log('Kintone APIレスポンス:', {
      status: response.status,
      statusText: response.statusText,
      totalRecords: response.data.records?.length || 0,
    });

    return response.data.records as KintoneDeviceRecord[];
  } catch (error: any) {
    console.error('Kintone APIエラー詳細:', {
      message: error.message,
      response: {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
      },
      request: {
        url: error.config?.url,
        method: error.config?.method,
        params: error.config?.params,
        headers: {
          ...error.config?.headers,
          'X-Cybozu-API-Token': '********', // トークンは表示しない
        },
      },
    });
    throw new Error(`Kintoneからのデータ取得に失敗: ${error.message}`);
  }
}

export async function getKintoneDeviceBySerialNumber(serialNumber: string) {
  try {
    const query = `レボナイザー引き当て製造番号 = "${serialNumber}"`;
    console.log('Kintone APIリクエスト開始 (シリアル番号検索):', { serialNumber });

    const requestConfig = {
      params: {
        app: KINTONE_APP_ID,
        query: query,
      },
      headers: {
        'X-Cybozu-API-Token': process.env.KINTONE_API_TOKEN,
      },
    };

    console.log('Kintoneリクエスト詳細:', {
      url: `${KINTONE_BASE_URL}/records.json`,
      params: requestConfig.params,
      headers: {
        ...requestConfig.headers,
        'X-Cybozu-API-Token': '********', // トークンは表示しない
      },
    });

    const response = await axios.get(
      `${KINTONE_BASE_URL}/records.json`,
      requestConfig
    );

    console.log('Kintone APIレスポンス (シリアル番号検索):', {
      status: response.status,
      statusText: response.statusText,
      recordFound: response.data.records?.length > 0,
    });

    const records = response.data.records as KintoneDeviceRecord[];
    return records[0] || null;
  } catch (error: any) {
    console.error('Kintone APIエラー詳細 (シリアル番号検索):', {
      message: error.message,
      response: {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
      },
      request: {
        url: error.config?.url,
        method: error.config?.method,
        params: error.config?.params,
        headers: {
          ...error.config?.headers,
          'X-Cybozu-API-Token': '********', // トークンは表示しない
        },
      },
    });
    throw new Error(`Kintoneからのデータ取得に失敗: ${error.message}`);
  }
}