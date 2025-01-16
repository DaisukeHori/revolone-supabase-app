import { REVONIZER_PRODUCTS, type RevonizerPriceId } from "@/lib/revonizerProducts";

const priceIdCache = new Map<string, string>();

// subscription_item_idからpriceIdを取得する関数
export async function getPriceId(subscriptionItemId: string): Promise<string | null> {
  if (priceIdCache.has(subscriptionItemId)) {
    return priceIdCache.get(subscriptionItemId) || null;
  }

  try {
    const response = await fetch(`/api/stripe/subscription-item/${subscriptionItemId}/price`);
    const data = await response.json();
    const priceId = data.priceId;
    priceIdCache.set(subscriptionItemId, priceId);
    return priceId;
  } catch (error) {
    console.error('Error fetching price ID:', error);
    return null;
  }
}

// レボナイザー商品かどうかを判定する関数
export async function isRevonizerProduct(subscriptionItemId: string): Promise<boolean> {
  const priceId = await getPriceId(subscriptionItemId);
  if (!priceId) return false;

  return Object.values(REVONIZER_PRODUCTS).some(product => product.priceId === priceId);
}

// レボナイザー商品のタイプを特定する関数
export async function getRevonizerProductType(subscriptionItemId: string): Promise<'FIRST_UNIT' | 'SECOND_TO_FOURTH' | 'FIFTH_AND_MORE' | null> {
  const priceId = await getPriceId(subscriptionItemId);
  if (!priceId) return null;

  if (priceId === REVONIZER_PRODUCTS.FIRST_UNIT.priceId) return 'FIRST_UNIT';
  if (priceId === REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId) return 'SECOND_TO_FOURTH';
  if (priceId === REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId) return 'FIFTH_AND_MORE';
  return null;
}

// 台数に応じた各商品の必要数量を計算する関数
export function calculateRevonizerQuantities(totalQuantity: number): Record<RevonizerPriceId, number> {
  console.log('Calculating quantities for total:', totalQuantity);

  // 入力値の検証（最小1台）
  const validQuantity = Math.max(1, totalQuantity);

  // 初期化：すべての商品の数量を0に設定
  const quantities: Record<RevonizerPriceId, number> = {
    [REVONIZER_PRODUCTS.FIRST_UNIT.priceId]: 0,
    [REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId]: 0,
    [REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId]: 0,
  };

  // 基本ライセンス（1台目）は常に1台
  quantities[REVONIZER_PRODUCTS.FIRST_UNIT.priceId] = 1;

  // 2台目以上の処理
  if (validQuantity > 1) {
    // 2-4台目の処理
    const secondToFourthQuantity = Math.min(validQuantity - 1, 3);
    quantities[REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId] = secondToFourthQuantity;

    // 5台目以降の処理（4台を超える場合のみ）
    if (validQuantity > 4) {
      quantities[REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId] = validQuantity - 4;
    }
  }

  console.log('Calculated quantities:', quantities);
  return quantities;
}

// レボナイザー商品のみを抽出する関数
export async function filterRevonizerItems(items: Array<{
  subscription_item_id: string;
  quantity: number;
}>): Promise<typeof items> {
  const filteredItems = [];
  for (const item of items) {
    if (await isRevonizerProduct(item.subscription_item_id)) {
      filteredItems.push(item);
    }
  }
  return filteredItems;
}

// 既存のサブスクリプションアイテムから合計台数を計算する関数
export async function calculateTotalQuantityFromItems(items: Array<{
  subscription_item_id: string;
  quantity: number;
}>): Promise<number> {
  let total = 0;

  for (const item of items) {
    const productType = await getRevonizerProductType(item.subscription_item_id);
    if (productType) {
      switch (productType) {
        case 'FIRST_UNIT':
          total += 1; // 基本ライセンスは常に1台
          break;
        case 'SECOND_TO_FOURTH':
          total += item.quantity;
          break;
        case 'FIFTH_AND_MORE':
          total += item.quantity;
          break;
      }
    }
  }

  return Math.max(1, total); // 最小1台を保証
}

export const REVONIZER_PRODUCTS = {
  FIRST_UNIT: {
    productId: 'prod_OkRTix5Mimwc9p',
    priceId: 'price_1NwwacAPdno01lSPWH92pzrl',
    name: 'Revol Oneサブスクリプション',
    minQuantity: 1,
    maxQuantity: 1,
  },
  SECOND_TO_FOURTH: {
    productId: 'prod_P0DB3wRLVlz8GV',
    priceId: 'price_1OCCkvAPdno01lSP44FyPiZ3',
    name: 'レボナイザー追加利用ライセンス（2-4台目）',
    minQuantity: 0,
    maxQuantity: 3,
  },
  FIFTH_AND_MORE: {
    productId: 'prod_P1IWo9CT6gNkX2',
    priceId: 'price_1OED1uAPdno01lSP3UESyV7C',
    name: 'レボナイザー追加利用ライセンス（5台目以降）',
    minQuantity: 0,
    maxQuantity: null,
  },
} as const;