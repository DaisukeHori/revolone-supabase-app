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

// レボナイザー商品かどうかを判定する関数
export function isRevonizerProduct(id: string): boolean {
  const revonizerIds = Object.values(REVONIZER_PRODUCTS).flatMap(product => [
    product.productId,
    product.priceId
  ]);
  return revonizerIds.includes(id);
}

// 合計台数から各商品の必要数量を計算する関数
export function calculateRevonizerQuantities(totalQuantity: number): Record<string, number> {
  if (totalQuantity <= 0) {
    throw new Error('数量は1以上である必要があります');
  }

  // 初期化：すべての商品の数量を0に設定
  const quantities: Record<string, number> = {
    [REVONIZER_PRODUCTS.FIRST_UNIT.productId]: 0,
    [REVONIZER_PRODUCTS.SECOND_TO_FOURTH.productId]: 0,
    [REVONIZER_PRODUCTS.FIFTH_AND_MORE.productId]: 0,
  };

  // 1台目の処理
  quantities[REVONIZER_PRODUCTS.FIRST_UNIT.productId] = 1;

  if (totalQuantity > 1) {
    // 2-4台目の処理
    const secondToFourthCount = Math.min(totalQuantity - 1, 3);
    quantities[REVONIZER_PRODUCTS.SECOND_TO_FOURTH.productId] = secondToFourthCount;

    // 5台目以降の処理
    if (totalQuantity > 4) {
      quantities[REVONIZER_PRODUCTS.FIFTH_AND_MORE.productId] = totalQuantity - 4;
    }
  }

  return quantities;
}

// 商品名から合計台数を計算する関数（既存のサブスクリプションアイテムから計算）
export function calculateTotalQuantityFromItems(items: Array<{
  subscription_item_id: string;
  quantity: number;
}>): number {
  let total = 0;

  // FIRST_UNITの数量を加算（通常は1）
  const firstUnit = items.find(item => 
    item.subscription_item_id === REVONIZER_PRODUCTS.FIRST_UNIT.productId
  );
  if (firstUnit) total += firstUnit.quantity;

  // SECOND_TO_FOURTHの数量を加算
  const secondToFourth = items.find(item => 
    item.subscription_item_id === REVONIZER_PRODUCTS.SECOND_TO_FOURTH.productId
  );
  if (secondToFourth) total += secondToFourth.quantity;

  // FIFTH_AND_MOREの数量を加算
  const fifthAndMore = items.find(item => 
    item.subscription_item_id === REVONIZER_PRODUCTS.FIFTH_AND_MORE.productId
  );
  if (fifthAndMore) total += fifthAndMore.quantity;

  return total;
}

// 既存のサブスクリプションアイテムから、レボナイザー関連の商品のみを抽出する
export function filterRevonizerItems(items: Array<{
  subscription_item_id: string;
  quantity: number;
}>): typeof items {
  return items.filter(item => isRevonizerProduct(item.subscription_item_id));
}