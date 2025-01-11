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

  const revonizerPriceIds = [
    REVONIZER_PRODUCTS.FIRST_UNIT.priceId,
    REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId,
    REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId,
  ];

  return revonizerPriceIds.includes(priceId);
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
  // 入力値の検証（最小1台）
  const validatedQuantity = Math.max(1, totalQuantity);

  // 基本ライセンスは常に1台
  const quantities: Record<string, number> = {
    [REVONIZER_PRODUCTS.FIRST_UNIT.priceId]: 1,
    [REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId]: 0,
    [REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId]: 0,
  };

  // 2台目以降の追加ライセンスの数量を計算
  if (validatedQuantity > 1) {
    // 2-4台目の数量を計算（最大3台）
    const secondToFourthCount = Math.min(validatedQuantity - 1, 3);
    quantities[REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId] = secondToFourthCount;

    // 5台目以降の数量を計算
    if (validatedQuantity > 4) {
      quantities[REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId] = validatedQuantity - 4;
    }
  }

  return quantities;
}

// サブスクリプションアイテムから合計台数を計算する関数
export async function calculateTotalQuantityFromItems(items: Array<{
  subscription_item_id: string;
  quantity: number;
}>): Promise<number> {
  let total = 0;

  // 各アイテムが非同期で判定される必要があるため、Promise.allを使用
  const itemResults = await Promise.all(
    items.map(async (item) => ({
      isRevonizer: await isRevonizerProduct(item.subscription_item_id),
      quantity: item.quantity,
      type: await getRevonizerProductType(item.subscription_item_id)
    }))
  );

  // レボナイザー商品の数量を合計（基本ライセンスは常に1台）
  itemResults.forEach(({ isRevonizer, quantity, type }) => {
    if (isRevonizer) {
      if (type === 'FIRST_UNIT') {
        total += 1; // 基本ライセンスは常に1台
      } else {
        total += quantity;
      }
    }
  });

  // 最小台数は1台
  return Math.max(1, total);
}

// レボナイザー商品のみを抽出する関数
export async function filterRevonizerItems(items: Array<{
  subscription_item_id: string;
  quantity: number;
}>): Promise<typeof items> {
  const itemsWithRevonizerFlag = await Promise.all(
    items.map(async item => ({
      item,
      isRevonizer: await isRevonizerProduct(item.subscription_item_id)
    }))
  );

  return itemsWithRevonizerFlag
    .filter(({ isRevonizer }) => isRevonizer)
    .map(({ item }) => item);
}