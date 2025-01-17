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

    // APIトークンの存在確認
    if (!process.env.KINTONE_API_TOKEN) {
      throw new Error('KINTONE_API_TOKENが設定されていません');
    }

    let url = `${KINTONE_BASE_URL}/records.json`;
    const params = new URLSearchParams({
      app: KINTONE_APP_ID,
    });

    // クエリパラメータの構築
    if (customerIds?.length) {
      const query = `Stripe_CustomerID in (${customerIds.map(id => `"${id}"`).join(',')})`;
      params.append('query', query);
    }

    const fullUrl = `${url}?${params.toString()}`;
    console.log('Kintone APIリクエストURL:', fullUrl);

    // リクエストの詳細をログ出力
    console.log('Kintoneリクエスト詳細:', {
      url: fullUrl,
      method: 'GET',
      headers: {
        'X-Cybozu-API-Token': '********' // トークンは表示しない
      }
    });

    const response = await axios.get(fullUrl, {
      headers: {
        'X-Cybozu-API-Token': process.env.KINTONE_API_TOKEN
      }
    });

    console.log('Kintone APIレスポンス:', {
      status: response.status,
      statusText: response.statusText,
      totalRecords: response.data.records?.length || 0,
      firstRecord: response.data.records?.[0] ? '存在します' : 'データがありません',
      responseData: response.data // レスポンスの詳細を確認
    });

    return response.data.records as KintoneDeviceRecord[];
  } catch (error: any) {
    console.error('Kintone APIエラー詳細:', {
      message: error.message,
      response: {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      },
      request: {
        url: error.config?.url,
        method: error.config?.method,
        params: error.config?.params,
        fullUrl: error.config?.url + (error.config?.params ? '?' + new URLSearchParams(error.config?.params).toString() : ''),
      }
    });
    throw new Error(`Kintoneからのデータ取得に失敗: ${error.message}`);
  }
}

export async function getKintoneDeviceBySerialNumber(serialNumber: string) {
  try {
    const query = `レボナイザー引き当て製造番号 = "${serialNumber}"`;
    console.log('Kintone APIリクエスト開始 (シリアル番号検索):', { serialNumber });

    let url = `${KINTONE_BASE_URL}/records.json`;
    const params = new URLSearchParams({
      app: KINTONE_APP_ID,
      query: query,
    });

    const fullUrl = `${url}?${params.toString()}`;
    console.log('Kintone APIリクエストURL:', fullUrl);

    const response = await axios.get(fullUrl, {
      headers: {
        'X-Cybozu-API-Token': process.env.KINTONE_API_TOKEN
      }
    });

    console.log('Kintone APIレスポンス (シリアル番号検索):', {
      status: response.status,
      statusText: response.statusText,
      recordFound: response.data.records?.length > 0,
      responseData: response.data // レスポンスの詳細を確認
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
      },
      request: {
        url: error.config?.url,
        method: error.config?.method,
        params: error.config?.params,
        fullUrl: error.config?.url + (error.config?.params ? '?' + new URLSearchParams(error.config?.params).toString() : ''),
      }
    });
    throw new Error(`Kintoneからのデータ取得に失敗: ${error.message}`);
  }
}