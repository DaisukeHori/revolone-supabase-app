import axios from 'axios';

const KINTONE_BASE_URL = 'https://e18p5.cybozu.com/k/v1';
const KINTONE_APP_ID = '40';
const KINTONE_DEVICE_APP_ID = '21'; // レボナイザー情報用のアプリID
const KINTONE_REPAIR_HISTORY_APP_ID = '22'; // 修理履歴用のアプリID

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

// App 21からデバイス情報を取得（製造番号で検索）
export async function getDeviceInfoBySerialNumber(serialNumber: string) {
  try {
    const query = `製造番号 = "${serialNumber}"`;
    const response = await axios.get(
      `${KINTONE_BASE_URL}/records.json?app=${KINTONE_DEVICE_APP_ID}&query=${encodeURIComponent(query)}`,
      {
        headers: {
          'X-Cybozu-API-Token': process.env.KINTONE_API_TOKEN,
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
          'X-Cybozu-API-Token': process.env.KINTONE_API_TOKEN,
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
        'X-Cybozu-API-Token': process.env.KINTONE_API_TOKEN,
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

// App22から修理履歴を取得する関数
export async function getRepairHistoryBySerialNumber(serialNumber: string) {
  try {
    // まずスキーマを確認
    const schema = await getApp22Schema();
    
    // 製造番号フィールドを特定する（フィールド名が不明なため）
    const serialNumberField = Object.keys(schema).find(key => 
      schema[key].label?.includes('製造番号') || 
      schema[key].label?.includes('シリアル') ||
      key.includes('製造番号') ||
      key.includes('serial')
    );

    if (!serialNumberField) {
      console.warn('App22で製造番号フィールドが見つかりませんでした');
      return [];
    }

    const query = `${serialNumberField} = "${serialNumber}"`;
    const response = await axios.get(
      `${KINTONE_BASE_URL}/records.json?app=${KINTONE_REPAIR_HISTORY_APP_ID}&query=${encodeURIComponent(query)}`,
      {
        headers: {
          'X-Cybozu-API-Token': process.env.KINTONE_API_TOKEN,
        },
      }
    );

    console.log(`App22から${serialNumber}の修理履歴を取得:`, response.data.records);
    return response.data.records as KintoneRepairHistoryRecord[];
  } catch (error: any) {
    console.error('修理履歴取得エラー:', error);
    if (error.response?.status === 403) {
      throw new Error('App 22へのAPIアクセス権限がありません。APIトークンの設定を確認してください。');
    }
    throw new Error('修理履歴の取得に失敗しました');
  }
}