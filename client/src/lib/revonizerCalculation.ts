import { REVONIZER_PRODUCTS, type RevonizerPriceId } from "@/lib/revonizerProducts";

const priceIdCache = new Map<string, string>();

// priceIdからproduct typeを取得する関数
async function getPriceId(subscriptionItemId: string): Promise<string | null> {
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

  return [
    REVONIZER_PRODUCTS.FIRST_UNIT.priceId,
    REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId,
    REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId
  ].includes(priceId as RevonizerPriceId);
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

  // 基本ライセンスは常に1台
  const quantities: Record<RevonizerPriceId, number> = {
    [REVONIZER_PRODUCTS.FIRST_UNIT.priceId]: 1,
    [REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId]: 0,
    [REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId]: 0,
  };

  if (validQuantity > 1) {
    // 2台目から4台目までは SECOND_TO_FOURTH を使用（最大3台）
    const remainingUnits = validQuantity - 1; // 1台目を除いた残りの台数
    const secondToFourthCount = Math.min(remainingUnits, 3); // 最大3台まで
    quantities[REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId] = secondToFourthCount;

    // 5台目以降がある場合（4台を超える分）
    if (remainingUnits > 3) {
      // 4台（1台目 + 2-4台目の3台）を超える分
      quantities[REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId] = remainingUnits - 3;
    }
  }

  console.log('Calculated quantities:', quantities);
  return quantities;
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

// レボナイザー商品の定義
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

// 既存のサブスクリプションアイテムから合計台数を計算する関数 (original function - kept for completeness, though now redundant)
export async function calculateTotalQuantityFromItemsOld(items: Array<{
  subscription_item_id: string;
  quantity: number;
}>): Promise<number> {
  let total = 0;

  for (const item of items) {
    const productType = await getRevonizerProductType(item.subscription_item_id);
    if (productType) {
      total += item.quantity;
    }
  }

  return Math.max(1, total); // 最小1台を保証
}


// レボナイザー商品かどうかを判定する関数 (original function - kept for completeness, though now redundant)
export function isRevonizerProductSync(id: string): boolean {
  const priceIds = [
    REVONIZER_PRODUCTS.FIRST_UNIT.priceId,
    REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId,
    REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId,
  ];
  return priceIds.includes(id);
}


// 合計台数から各商品の必要数量を計算する関数 (original function - kept for completeness, though now redundant)
export function calculateRevonizerQuantitiesSync(totalQuantity: number): Record<string, number> {
  if (totalQuantity <= 0) {
    throw new Error('数量は1以上である必要があります');
  }

  // 初期化：すべての商品の数量を0に設定
  const quantities: Record<string, number> = {
    [REVONIZER_PRODUCTS.FIRST_UNIT.priceId]: 0,
    [REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId]: 0,
    [REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId]: 0,
  };

  // 1台目は必ずFIRST_UNITを使用
  quantities[REVONIZER_PRODUCTS.FIRST_UNIT.priceId] = 1;

  if (totalQuantity > 1) {
    // 2-4台目はSECOND_TO_FOURTHを使用
    const secondToFourthCount = Math.min(totalQuantity - 1, 3);
    quantities[REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId] = secondToFourthCount;

    // 5台目以降はFIFTH_AND_MOREを使用
    if (totalQuantity > 4) {
      quantities[REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId] = totalQuantity - 4;
    }
  }

  return quantities;
}

// 既存のサブスクリプションアイテムから合計台数を計算する関数 (original function - kept for completeness, though now redundant)
export function calculateTotalQuantityFromItemsSync(items: Array<{
  subscription_item_id: string;
  quantity: number;
}>): number {
  let total = 0;

  // 各レボナイザー商品の数量を合算
  items.forEach(item => {
    if (isRevonizerProductSync(item.subscription_item_id)) {
      total += item.quantity;
    }
  });

  return total;
}

// レボナイザー商品のみを抽出する関数 (original function - kept for completeness, though now redundant)
export function filterRevonizerItemsSync(items: Array<{
  subscription_item_id: string;
  quantity: number;
}>): typeof items {
  return items.filter(item => isRevonizerProductSync(item.subscription_item_id));
}