import { REVONIZER_PRODUCTS } from "@/lib/revonizerProducts";

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
  return priceIdCache.get(subscriptionItemId)!;
}

// レボナイザー商品かどうかを判定する関数
export async function isRevonizerProduct(subscriptionItemId: string): Promise<boolean> {
  const priceId = await getPriceId(subscriptionItemId);
  if (!priceId) return false;

  console.log('Registered Revonizer priceIds:', [
    REVONIZER_PRODUCTS.FIRST_UNIT.priceId,
    REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId,
    REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId
  ]);
  console.log('Is Revonizer product:', [
    REVONIZER_PRODUCTS.FIRST_UNIT.priceId,
    REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId,
    REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId
  ].includes(priceId));

  return [
    REVONIZER_PRODUCTS.FIRST_UNIT.priceId,
    REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId,
    REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId
  ].includes(priceId);
}

// レボナイザー商品のpriceIdを特定する関数
export async function getRevonizerProductType(subscriptionItemId: string): Promise<'FIRST_UNIT' | 'SECOND_TO_FOURTH' | 'FIFTH_AND_MORE' | null> {
  const priceId = await getPriceId(subscriptionItemId);
  if (!priceId) return null;

  console.log('Retrieved priceId:', priceId);

  if (priceId === REVONIZER_PRODUCTS.FIRST_UNIT.priceId) return 'FIRST_UNIT';
  if (priceId === REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId) return 'SECOND_TO_FOURTH';
  if (priceId === REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId) return 'FIFTH_AND_MORE';

  return null;
}

// 台数に応じた各商品の必要数量を計算する関数
export function calculateRevonizerQuantities(totalQuantity: number): Record<string, number> {
  console.log('Calculating quantities for total:', totalQuantity);

  // 基本ライセンスは常に1台
  const quantities: Record<string, number> = {
    [REVONIZER_PRODUCTS.FIRST_UNIT.priceId]: 1,
    [REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId]: 0,
    [REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId]: 0,
  };

  if (totalQuantity > 1) {
    // 2-4台目の数量を計算（最大3台）
    const secondToFourthCount = Math.min(totalQuantity - 1, 3);
    quantities[REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId] = secondToFourthCount;

    // 5台目以降の数量を計算
    if (totalQuantity > 4) {
      quantities[REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId] = totalQuantity - 4;
    }
  }

  console.log('Calculated quantities:', quantities);
  return quantities;
}

// サブスクリプションアイテムから合計台数を計算する関数
export async function calculateTotalQuantityFromItems(items: Array<{
  subscription_item_id: string;
  quantity: number;
}>): Promise<number> {
  console.log('Calculating total quantity for items:', items);

  let total = 0;

  for (const item of items) {
    const type = await getRevonizerProductType(item.subscription_item_id);
    if (type === 'FIRST_UNIT') {
      total += 1; // 基本ライセンスは常に1台
    } else if (type === 'SECOND_TO_FOURTH') {
      total += item.quantity;
    } else if (type === 'FIFTH_AND_MORE') {
      total += item.quantity;
    }
  }

  console.log('Total quantity calculated:', total);
  return Math.max(1, total); // 最小1台を保証
}

// レボナイザー商品のみを抽出する関数
export async function filterRevonizerItems(items: Array<{
  subscription_item_id: string;
  quantity: number;
}>): Promise<typeof items> {
  console.log('Filtering Revonizer items:', items);

  const filteredItems = [];
  for (const item of items) {
    const isRevonizer = await isRevonizerProduct(item.subscription_item_id);
    if (isRevonizer) {
      console.log('Found Revonizer item:', item);
      filteredItems.push(item);
    }
  }

  console.log('Filtered items:', filteredItems);
  return filteredItems;
}