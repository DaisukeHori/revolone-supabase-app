import axios from 'axios';
import { currentConfig } from '../config';

// Kintone APIのレスポンス型定義
interface KintoneRecord {
  $id: {
    type: string;
    value: string;
  };
  Stripe_CustomerID: {
    type: string;
    value: string;
  };
  送り状伝票番号: {
    type: string;
    value: string;
  };
  [key: string]: {
    type: string;
    value: string;
  };
}

interface KintoneResponse {
  records: KintoneRecord[];
}

export async function getDeviceRecords(customerId: string) {
  try {
    const response = await axios.get<KintoneResponse>(
      `${currentConfig.kintone.baseUrl}/records.json`,
      {
        params: {
          app: '40',
          query: `Stripe_CustomerID="${customerId}"`,
        },
        headers: {
          'X-Cybozu-API-Token': currentConfig.kintone.apiToken,
        },
      }
    );

    return response.data.records;
  } catch (error) {
    console.error('Kintone API error:', error);
    throw new Error('デバイス情報の取得に失敗しました');
  }
}

export async function getDevicesByCustomerId(customerId: string) {
  try {
    const records = await getDeviceRecords(customerId);
    return records.map(record => ({
      id: record.$id.value,
      stripeCustomerId: record.Stripe_CustomerID.value,
      // 他の必要なフィールドもマッピング
      ...Object.entries(record).reduce((acc, [key, value]) => {
        if (key !== '$id' && key !== 'Stripe_CustomerID') {
          acc[key] = value.value;
        }
        return acc;
      }, {} as Record<string, string>)
    }));
  } catch (error) {
    console.error('Kintone API error:', error);
    throw new Error('デバイス情報の取得に失敗しました');
  }
}

export async function getShippingDetailsByCustomerId(customerId: string) {
  try {
    const response = await axios.get<KintoneResponse>(
      `${currentConfig.kintone.baseUrl}/records.json`,
      {
        params: {
          app: '55',
          query: `Stripe_CustomerID="${customerId}"`,
        },
        headers: {
          'X-Cybozu-API-Token': currentConfig.kintone.apiToken,
        },
      }
    );

    return response.data.records.map(record => ({
      id: record.$id.value,
      stripeCustomerId: record.Stripe_CustomerID.value,
      trackingNumber: record.送り状伝票番号.value,
      // 他の必要なフィールドもマッピング
      ...Object.entries(record).reduce((acc, [key, value]) => {
        if (key !== '$id' && key !== 'Stripe_CustomerID' && key !== '送り状伝票番号') {
          acc[key] = value.value;
        }
        return acc;
      }, {} as Record<string, string>)
    }));
  } catch (error) {
    console.error('Kintone API error:', error);
    throw new Error('配送情報の取得に失敗しました');
  }
}