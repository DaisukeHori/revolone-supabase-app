import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

// Axiosインターセプターでリクエスト/レスポンスをログ出力
axios.interceptors.request.use(
  (config) => {
    console.log('========== Axios リクエスト開始 ==========');
    console.log('URL:', config.url);
    console.log('メソッド:', config.method);
    console.log('ヘッダー:', JSON.stringify(config.headers, null, 2));
    if (config.data) {
      console.log('ボディ:', JSON.stringify(config.data, null, 2));
    }
    console.log('========================================');
    return config;
  },
  (error) => {
    console.error('リクエストエラー:', error);
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => {
    console.log('========== Axios レスポンス ==========');
    console.log('ステータス:', response.status);
    console.log('ステータステキスト:', response.statusText);
    console.log('ヘッダー:', JSON.stringify(response.headers, null, 2));
    console.log('データ:', JSON.stringify(response.data, null, 2).substring(0, 1000) + '...');
    console.log('=====================================');
    return response;
  },
  (error) => {
    console.error('========== Axios エラーレスポンス ==========');
    if (error.response) {
      console.error('ステータス:', error.response.status);
      console.error('ステータステキスト:', error.response.statusText);
      console.error('ヘッダー:', JSON.stringify(error.response.headers, null, 2));
      console.error('データ:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('リクエストエラー:', error.request);
    } else {
      console.error('エラー:', error.message);
    }
    console.error('==========================================');
    return Promise.reject(error);
  }
);

// 実際に使用しているKintoneドメインを使用
const KINTONE_BASE_URL = 'https://e18p5.cybozu.com/k/v1';
const KINTONE_APP_ID = '40';
const KINTONE_DEVICE_APP_ID = '21'; // レボナイザー情報用のアプリID
const KINTONE_REPAIR_HISTORY_APP_ID = '22';
const KINTONE_WORK_RECORD_APP_ID = '23'; // 修理履歴用のアプリID

// APIトークンの取得（開発・本番共通）
function getKintoneApiToken() {
  const token = process.env.KINTONE_API_TOKEN;
  
  console.log('========== 環境変数詳細 ==========');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('KINTONE_API_TOKEN存在:', !!token);
  console.log('KINTONE_API_TOKEN長さ:', token?.length || 0);
  console.log('==================================');
  
  if (!token) {
    throw new Error('Kintone APIトークンが設定されていません');
  }
  
  // トークンの前後の空白と改行を削除
  const trimmedToken = token.trim().replace(/[\r\n]/g, '');
  
  console.log(`[Kintone] 環境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[Kintone] 元のトークン長: ${token.length}`);
  console.log(`[Kintone] トリム後のトークン長: ${trimmedToken.length}`);
  console.log(`[Kintone] トークン先頭20文字: ${trimmedToken.substring(0, 20)}...`);
  console.log(`[Kintone] トークン末尾10文字: ...${trimmedToken.substring(trimmedToken.length - 10)}`);
  
  if (token.length !== trimmedToken.length) {
    console.log(`[Kintone] トークンに空白または改行が含まれていました（${token.length - trimmedToken.length}文字削除）`);
  }
  
  return trimmedToken;
}

interface KintoneDeviceRecord {
  $id: { value: string };
  レボナイザー引き当て製造番号: { value: string };
  入出荷: { value: "出荷" | "返却" };
  隈部入出荷実行日付: { value: string };
  Stripe_SubscriptionID: { value: string };
  Stripe_CustomerID: { value: string };
  送り先サロン名: { value: string };
  送り先住所?: { value: string | undefined };
  メールアドレス: { value: string };
}

interface KintoneDeviceInfoRecord {
  $id: { value: string };
  文字列__1行__1: { value: string }; // App 21の製造番号フィールド（ラベル: "製造番号"）
  サブスク貸出の可不可: { value: string };
  代替え機の場合はチェック: { value: string[] }; // チェックボックス
}

interface KintoneRepairHistoryRecord {
  $id: { value: string };
  [key: string]: { value: any }; // 動的にフィールドを追加するため
}

interface KintoneWorkRecord {
  $id: { value: string };
  ルックアップ: { value: string };
  日時: { value: string };
  ドロップダウン: { value: string };
  [key: string]: { value: any }; // 動的にフィールドを追加するため
}

export async function getDeviceRecords() {
  try {
    const response = await axios.get(`${KINTONE_BASE_URL}/records.json?app=${KINTONE_APP_ID}`, {
      headers: {
        'X-Cybozu-API-Token': getKintoneApiToken(),
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
          'X-Cybozu-API-Token': getKintoneApiToken(),
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
          'X-Cybozu-API-Token': getKintoneApiToken(),
        },
      }
    );

    return response.data.records as KintoneDeviceRecord[];
  } catch (error) {
    console.error('Kintone APIエラー:', error);
    throw new Error('デバイスレコードの取得に失敗しました');
  }
}

// App 21からデバイス情報を取得（製造番号で検索）
export async function getDeviceInfoBySerialNumber(serialNumber: string) {
  try {
    const query = `製造番号 = "${serialNumber}"`;
    const response = await axios.get(
      `${KINTONE_BASE_URL}/records.json?app=${KINTONE_DEVICE_APP_ID}&query=${encodeURIComponent(query)}`,
      {
        headers: {
          'X-Cybozu-API-Token': getKintoneApiToken(),
        },
      }
    );

    const records = response.data.records as KintoneDeviceInfoRecord[];
    return records[0] || null;
  } catch (error) {
    console.error('Kintone APIエラー（デバイス情報）:', error);
    throw new Error('デバイス情報の取得に失敗しました');
  }
}

// 複数の製造番号に対してデバイス情報を一括取得
export async function getDeviceInfoBySerialNumbers(serialNumbers: string[]) {
  try {
    if (serialNumbers.length === 0) return [];
    
    // IN句を使用して複数の製造番号を一度に検索
    const serialNumbersQuery = serialNumbers.map(sn => `"${sn}"`).join(', ');
    const query = `文字列__1行__1 in (${serialNumbersQuery})`;
    
    const response = await axios.get(
      `${KINTONE_BASE_URL}/records.json?app=${KINTONE_DEVICE_APP_ID}&query=${encodeURIComponent(query)}`,
      {
        headers: {
          'X-Cybozu-API-Token': getKintoneApiToken(),
        },
      }
    );

    return response.data.records as KintoneDeviceInfoRecord[];
  } catch (error: any) {
    console.error('Kintone APIエラー（デバイス情報一括取得）:', error);
    if (error.response?.status === 403) {
      throw new Error('App 21へのAPIアクセス権限がありません。APIトークンの設定を確認してください。');
    }
    throw new Error('デバイス情報の一括取得に失敗しました');
  }
}

// App22のスキーマを確認するための関数
export async function getApp22Schema() {
  try {
    const response = await axios.get(`${KINTONE_BASE_URL}/app/form/fields.json?app=${KINTONE_REPAIR_HISTORY_APP_ID}`, {
      headers: {
        'X-Cybozu-API-Token': getKintoneApiToken(),
      },
    });

    console.log('App22 Schema:', JSON.stringify(response.data.properties, null, 2));
    return response.data.properties;
  } catch (error: any) {
    console.error('App22スキーマ取得エラー:', error);
    if (error.response?.status === 403) {
      throw new Error('App 22へのAPIアクセス権限がありません。APIトークンの設定を確認してください。');
    }
    throw new Error('App22スキーマの取得に失敗しました');
  }
}

// App22から最小限のレコードを取得してフィールド構造を確認する関数
export async function getApp22SampleRecords() {
  try {
    // 最初の10件のみを取得してフィールド構造を確認
    const response = await axios.get(`${KINTONE_BASE_URL}/records.json?app=${KINTONE_REPAIR_HISTORY_APP_ID}&limit=10`, {
      headers: {
        'X-Cybozu-API-Token': getKintoneApiToken(),
      },
    });

    console.log('App22 サンプルレコード:', response.data.records.slice(0, 2));
    return response.data.records as KintoneRepairHistoryRecord[];
  } catch (error: any) {
    console.error('App22サンプルレコード取得エラー:', error);
    if (error.response?.status === 403) {
      throw new Error('App 22へのAPIアクセス権限がありません。APIトークンの設定を確認してください。');
    }
    throw new Error('App22レコードの取得に失敗しました');
  }
}

// 後方互換性のため
export async function getAllRepairRecords() {
  console.warn('getAllRepairRecords は非推奨です。getApp22SampleRecords を使用してください。');
  return await getApp22SampleRecords();
}

export async function getApp23Schema() {
  try {
    const response = await axios.get(`${KINTONE_BASE_URL}/app/form/fields.json?app=${KINTONE_WORK_RECORD_APP_ID}`, {
      headers: {
        'X-Cybozu-API-Token': getKintoneApiToken(),
      },
    });

    console.log('App23 Schema:', JSON.stringify(response.data.properties, null, 2));
    return response.data.properties;
  } catch (error: any) {
    console.error('App23スキーマ取得エラー:', error);
    if (error.response?.status === 403) {
      throw new Error('App 23へのAPIアクセス権限がありません。APIトークンの設定を確認してください。');
    }
    throw new Error('App23スキーマの取得に失敗しました');
  }
}

export async function getApp23SampleRecords() {
  try {
    // 最初の5件のみを取得してフィールド構造を確認
    const response = await axios.get(`${KINTONE_BASE_URL}/records.json?app=${KINTONE_WORK_RECORD_APP_ID}&limit=5`, {
      headers: {
        'X-Cybozu-API-Token': getKintoneApiToken(),
      },
    });

    console.log('App23 サンプルレコード:', JSON.stringify(response.data.records, null, 2));
    return response.data.records as KintoneWorkRecord[];
  } catch (error: any) {
    console.error('App23サンプルレコード取得エラー:', error);
    if (error.response?.status === 403) {
      throw new Error('App 23へのAPIアクセス権限がありません。APIトークンの設定を確認してください。');
    }
    throw new Error('App23レコードの取得に失敗しました');
  }
}

export async function getWorkRecordsByRepairTicketNumber(repairTicketNumber: string) {
  try {
    console.log(`App23からApp22レコード番号${repairTicketNumber}の作業レコードを検索中...`);
    
    // ルックアップフィールドでApp22のレコード番号を検索
    try {
      console.log(`フィールド「ルックアップ」でApp22レコード番号での検索実行中...`);
      
      const query = `ルックアップ = "${repairTicketNumber}"`;
      console.log(`送信クエリ: ${query}`);
      
      const response = await axios.get(
        `${KINTONE_BASE_URL}/records.json?app=${KINTONE_WORK_RECORD_APP_ID}&query=${encodeURIComponent(query)}`,
        {
          headers: {
            'X-Cybozu-API-Token': getKintoneApiToken(),
          },
        }
      );
      
      console.log(`ルックアップフィールドでの検索結果: ${response.data.records.length}件`);
      
      if (response.data.records.length > 0) {
        console.log(`App22レコード番号${repairTicketNumber}の作業レコードが見つかりました`);
        console.log('見つかった作業レコード:', JSON.stringify(response.data.records[0], null, 2));
        return response.data.records as KintoneWorkRecord[];
      }
      
    } catch (lookupError: any) {
      console.error(`ルックアップフィールドでの検索失敗:`, lookupError.response?.data?.message || lookupError.message);
    }
    
    console.log(`App22レコード番号${repairTicketNumber}の作業レコードが見つかりませんでした`);
    return [];
    
  } catch (error: any) {
    console.error('作業レコード取得エラー:', error);
    console.error('エラーレスポンス:', error.response?.data);
    
    if (error.response?.status === 403) {
      throw new Error('App 23へのAPIアクセス権限がありません。APIトークンの設定を確認してください。');
    }
    throw new Error('作業レコードの取得に失敗しました');
  }
}

export async function getRepairHistoryBySerialNumber(serialNumber: string) {
  try {
    console.log(`App22から製造番号${serialNumber}の修理履歴を検索中...`);
    console.log(`[Kintone Debug] NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`[Kintone Debug] API Token (first 20 chars): ${process.env.KINTONE_API_TOKEN?.substring(0, 20)}...`);
    console.log(`[Kintone Debug] API Token length: ${process.env.KINTONE_API_TOKEN?.length}`);
    console.log(`[Kintone Debug] Base URL: ${KINTONE_BASE_URL}`);
    console.log(`[Kintone Debug] App ID: ${KINTONE_REPAIR_HISTORY_APP_ID}`);
    
    // 完全一致検索を実行
    console.log('完全一致検索を実行中...');
    
    const query = `ルックアップ = "${serialNumber}"`;
    console.log(`送信クエリ: ${query}`);
    
    const url = `${KINTONE_BASE_URL}/records.json?app=${KINTONE_REPAIR_HISTORY_APP_ID}&query=${encodeURIComponent(query)}`;
    const apiToken = getKintoneApiToken();
    
    console.log(`[Kintone Debug] Request URL: ${url}`);
    console.log(`[Kintone Debug] Using token (trimmed): ${apiToken.substring(0, 20)}... (length: ${apiToken.length})`);
    
    // Axiosリクエストにインターセプターを追加して詳細なログを記録
    const response = await axios.get(url, {
      headers: {
        'X-Cybozu-API-Token': apiToken,
      },
    });
    
    console.log(`検索結果: ${response.data.records.length}件`);
    
    if (response.data.records.length > 0) {
      console.log(`製造番号${serialNumber}の修理履歴が見つかりました`);
      console.log('見つかった修理履歴レコード:', response.data.records[0]);
      return response.data.records as KintoneRepairHistoryRecord[];
    }
    
    // 完全一致で見つからない場合、部分一致検索を試行
    console.log('部分一致検索を試行中...');
    
    const likeQuery = `ルックアップ like "${serialNumber}"`;
    console.log(`送信クエリ: ${likeQuery}`);
    
    const likeResponse = await axios.get(
      `${KINTONE_BASE_URL}/records.json?app=${KINTONE_REPAIR_HISTORY_APP_ID}&query=${encodeURIComponent(likeQuery)}`,
      {
        headers: {
          'X-Cybozu-API-Token': getKintoneApiToken(),
        },
      }
    );
    
    console.log(`部分一致検索結果: ${likeResponse.data.records.length}件`);
    
    if (likeResponse.data.records.length > 0) {
      console.log(`製造番号${serialNumber}の修理履歴が見つかりました（部分一致）`);
      console.log('見つかった修理履歴レコード:', likeResponse.data.records[0]);
      return likeResponse.data.records as KintoneRepairHistoryRecord[];
    }
    
    // 両方で見つからない場合、データが存在しない
    console.log(`製造番号${serialNumber}の修理履歴が見つかりませんでした`);
    return [];
    
  } catch (error: any) {
    console.error('========== 修理履歴取得エラー開始 ==========');
    console.error('エラーステータス:', error.response?.status);
    console.error('エラーメッセージ:', error.response?.statusText);
    console.error('エラーレスポンスデータ:', JSON.stringify(error.response?.data, null, 2));
    console.error('リクエストURL:', error.config?.url);
    console.error('環境変数KINTONE_API_TOKEN存在:', !!process.env.KINTONE_API_TOKEN);
    console.error('環境変数KINTONE_API_TOKEN長さ:', process.env.KINTONE_API_TOKEN?.length || 0);
    
    const token = getKintoneApiToken();
    console.error('使用したトークン先頭20文字:', token.substring(0, 20));
    console.error('使用したトークン末尾10文字:', token.substring(token.length - 10));
    console.error('使用したトークン全長:', token.length);
    
    // トークンに不正な文字が含まれているかチェック
    const hasWhitespace = /\s/.test(token);
    const hasNewline = /[\r\n]/.test(token);
    console.error('トークンに空白含む:', hasWhitespace);
    console.error('トークンに改行含む:', hasNewline);
    console.error('========== 修理履歴取得エラー終了 ==========');
    
    if (error.response?.status === 403) {
      throw new Error('App 22へのAPIアクセス権限がありません。APIトークンの設定を確認してください。');
    }
    if (error.response?.status === 400 && error.response?.data?.code === 'CB_IL02') {
      throw new Error('Kintone APIリクエスト形式エラー。パラメータを確認してください。');
    }
    
    const errorMessage = error.response?.data?.message || error.message || '修理履歴の取得に失敗しました';
    throw new Error(`修理履歴取得エラー: ${errorMessage}`);
  }
}