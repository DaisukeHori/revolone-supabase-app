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
    // 1. 開始ログ
    console.log('=== Kintone API リクエスト開始 ===');
    console.log('設定:', {
      baseUrl: KINTONE_BASE_URL,
      appId: KINTONE_APP_ID,
      customerIds: customerIds || 'なし',
    });

    // 2. APIトークンの確認
    if (!process.env.KINTONE_API_TOKEN) {
      console.error('エラー: KINTONE_API_TOKENが設定されていません');
      throw new Error('KINTONE_API_TOKENが設定されていません');
    }

    // 3. クエリの構築
    let query = '';
    if (customerIds && customerIds.length > 0) {
      query = customerIds.length === 1
        ? `Stripe_CustomerID = "${customerIds[0]}"`
        : `Stripe_CustomerID in (${customerIds.map(id => `"${id}"`).join(',')})`;
    }
    console.log('構築されたクエリ:', query || '(クエリなし)');

    // 4. リクエスト設定の構築
    const requestConfig = {
      method: 'GET',
      url: `${KINTONE_BASE_URL}/records.json`,
      params: {
        app: KINTONE_APP_ID,
        ...(query && { query })
      },
      headers: {
        'X-Cybozu-API-Token': process.env.KINTONE_API_TOKEN
      }
    };

    // 5. リクエストの詳細をログ出力
    console.log('リクエスト詳細:', {
      url: requestConfig.url,
      method: requestConfig.method,
      params: requestConfig.params,
      fullUrl: `${requestConfig.url}?${new URLSearchParams(requestConfig.params as Record<string, string>).toString()}`,
      headers: {
        'X-Cybozu-API-Token': '********' // トークンは隠す
      }
    });

    // 6. APIリクエストの実行
    console.log('APIリクエスト実行中...');
    const response = await axios(requestConfig);

    // 7. レスポンスの詳細をログ出力
    console.log('APIレスポンス:', {
      status: response.status,
      statusText: response.statusText,
      totalRecords: response.data.records?.length || 0,
      firstRecord: response.data.records?.[0]
        ? JSON.stringify(response.data.records[0], null, 2)
        : 'データなし'
    });
    console.log('=== Kintone API リクエスト完了 ===');

    return response.data.records as KintoneDeviceRecord[];
  } catch (error: any) {
    // 8. エラー詳細のログ出力
    console.error('=== Kintone API エラー ===');
    console.error('エラー詳細:', {
      message: error.message,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      } : 'レスポンスなし',
      request: error.config ? {
        url: error.config.url,
        method: error.config.method,
        params: error.config.params,
        fullUrl: error.config?.url + (error.config?.params ? '?' + new URLSearchParams(error.config?.params as Record<string, string>).toString() : '')
      } : 'リクエスト設定なし'
    });
    console.error('=== Kintone API エラー終了 ===');
    throw error;
  }
}

export async function getKintoneDeviceBySerialNumber(serialNumber: string) {
  try {
    console.log('=== Kintone API シリアル番号検索開始 ===');
    console.log('検索条件:', { serialNumber });

    const query = `レボナイザー引き当て製造番号 = "${serialNumber}"`;
    console.log('構築されたクエリ:', query);

    const requestConfig = {
      url: `${KINTONE_BASE_URL}/records.json`,
      method: 'GET',
      headers: {
        'X-Cybozu-API-Token': process.env.KINTONE_API_TOKEN
      },
      params: {
        app: KINTONE_APP_ID,
        query
      }
    };

    console.log('リクエスト詳細:', {
      url: requestConfig.url,
      method: requestConfig.method,
      params: requestConfig.params,
      fullUrl: `${requestConfig.url}?${new URLSearchParams(requestConfig.params as Record<string, string>).toString()}`,
      headers: {
        'X-Cybozu-API-Token': '********'
      }
    });

    console.log('APIリクエスト実行中...');
    const response = await axios(requestConfig);

    console.log('APIレスポンス:', {
      status: response.status,
      statusText: response.statusText,
      recordFound: response.data.records?.length > 0,
      firstRecord: response.data.records?.[0]
        ? JSON.stringify(response.data.records[0], null, 2)
        : 'データなし'
    });
    console.log('=== Kintone API シリアル番号検索完了 ===');

    const records = response.data.records as KintoneDeviceRecord[];
    return records[0] || null;
  } catch (error: any) {
    console.error('=== Kintone API シリアル番号検索エラー ===');
    console.error('エラー詳細:', {
      message: error.message,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      } : 'レスポンスなし',
      request: error.config ? {
        url: error.config.url,
        method: error.config.method,
        params: error.config.params,
        fullUrl: error.config?.url + (error.config?.params ? '?' + new URLSearchParams(error.config?.params as Record<string, string>).toString() : '')
      } : 'リクエスト設定なし'
    });
    console.error('=== Kintone API シリアル番号検索エラー終了 ===');
    throw new Error(`Kintoneからのデータ取得に失敗: ${error.message}`);
  }
}