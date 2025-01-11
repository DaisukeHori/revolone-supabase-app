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

// subscription_item_idに対応するpriceIdをキャッシュするMap
const priceIdCache = new Map<string, Promise<string | null>>();

// subscription_item_idからpriceIdを取得する関数
async function getPriceId(subscriptionItemId: string): Promise<string | null> {
  if (!priceIdCache.has(subscriptionItemId)) {
    const promise = fetch(`/api/stripe/subscription-item/${subscriptionItemId}/price`)
      .then(res => res.json())
      .then(data => data.priceId)
      .catch(error => {
        console.error('Error fetching priceId:', error);
        return null;
      });
    priceIdCache.set(subscriptionItemId, promise);
  }
  return priceIdCache.get(subscriptionItemId);
}

// レボナイザー商品かどうかを判定する関数
export async function isRevonizerProduct(subscriptionItemId: string): Promise<boolean> {
  console.log('Checking if product is Revonizer:', subscriptionItemId);

  const priceId = await getPriceId(subscriptionItemId);
  console.log('Retrieved priceId:', priceId);

  const revonizerPriceIds = [
    REVONIZER_PRODUCTS.FIRST_UNIT.priceId,
    REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId,
    REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId,
  ];

  console.log('Registered Revonizer priceIds:', revonizerPriceIds);
  const isRevonizer = priceId ? revonizerPriceIds.includes(priceId) : false;
  console.log('Is Revonizer product:', isRevonizer);

  return isRevonizer;
}

// レボナイザー商品のpriceIdを特定する関数
export async function getRevonizerProductType(subscriptionItemId: string): Promise<'FIRST_UNIT' | 'SECOND_TO_FOURTH' | 'FIFTH_AND_MORE' | null> {
  const priceId = await getPriceId(subscriptionItemId);
  if (!priceId) return null;

  if (priceId === REVONIZER_PRODUCTS.FIRST_UNIT.priceId) return 'FIRST_UNIT';
  if (priceId === REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId) return 'SECOND_TO_FOURTH';
  if (priceId === REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId) return 'FIFTH_AND_MORE';

  return null;
}

// 合計台数から各商品の必要数量を計算する関数
export function calculateRevonizerQuantities(totalQuantity: number): Record<string, number> {
  // 基本ライセンスは必ず1台
  const quantities: Record<string, number> = {
    [REVONIZER_PRODUCTS.FIRST_UNIT.priceId]: 1,
    [REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId]: 0,
    [REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId]: 0,
  };

  // 追加ライセンスの数量を計算（2台目以降）
  if (totalQuantity > 1) {
    // 2-4台目の数量を計算
    const secondToFourthCount = Math.min(totalQuantity - 1, 3);
    quantities[REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId] = secondToFourthCount;

    // 5台目以降の数量を計算
    if (totalQuantity > 4) {
      quantities[REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId] = totalQuantity - 4;
    }
  }

  return quantities;
}

// 既存のサブスクリプションアイテムから合計台数を計算する関数
export async function calculateTotalQuantityFromItems(items: Array<{
  subscription_item_id: string;
  quantity: number;
}>): Promise<number> {
  console.log('Calculating total quantity for items:', JSON.stringify(items, null, 2));

  let total = 0;

  // 各アイテムが非同期で判定される必要があるため、Promise.allを使用
  await Promise.all(items.map(async (item) => {
    const isRevonizer = await isRevonizerProduct(item.subscription_item_id);
    if (isRevonizer) {
      console.log('Found Revonizer item:', item);
      total += item.quantity;
    }
  }));

  console.log('Total quantity calculated:', total);
  return total;
}

// レボナイザー商品のみを抽出する関数
export async function filterRevonizerItems(items: Array<{
  subscription_item_id: string;
  quantity: number;
}>): Promise<typeof items> {
  console.log('Filtering Revonizer items from:', JSON.stringify(items, null, 2));

  const filtered = await Promise.all(
    items.map(async item => ({
      item,
      isRevonizer: await isRevonizerProduct(item.subscription_item_id)
    }))
  ).then(results => 
    results
      .filter(({ isRevonizer }) => isRevonizer)
      .map(({ item }) => item)
  );

  console.log('Filtered Revonizer items:', JSON.stringify(filtered, null, 2));
  return filtered;
}