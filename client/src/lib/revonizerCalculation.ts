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
  const revonizerIds = [
    REVONIZER_PRODUCTS.FIRST_UNIT.productId,
    REVONIZER_PRODUCTS.FIRST_UNIT.priceId,
    REVONIZER_PRODUCTS.SECOND_TO_FOURTH.productId,
    REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId,
    REVONIZER_PRODUCTS.FIFTH_AND_MORE.productId,
    REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId,
  ];
  return revonizerIds.includes(id);
}

// 合計台数から各商品の必要数量を計算する関数
export function calculateRevonizerQuantities(totalQuantity: number): Record<string, number> {
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

// 既存のサブスクリプションアイテムから合計台数を計算する関数
export function calculateTotalQuantityFromItems(items: Array<{
  subscription_item_id: string;
  quantity: number;
}>): number {
  let total = 0;

  // 各レボナイザー商品の数量を合算
  const firstUnit = items.find(item => 
    item.subscription_item_id === REVONIZER_PRODUCTS.FIRST_UNIT.priceId
  );
  if (firstUnit) total += firstUnit.quantity;

  const secondToFourth = items.find(item => 
    item.subscription_item_id === REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId
  );
  if (secondToFourth) total += secondToFourth.quantity;

  const fifthAndMore = items.find(item => 
    item.subscription_item_id === REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId
  );
  if (fifthAndMore) total += fifthAndMore.quantity;

  return total;
}

// レボナイザー商品のみを抽出する関数
export function filterRevonizerItems(items: Array<{
  subscription_item_id: string;
  quantity: number;
}>): typeof items {
  return items.filter(item => isRevonizerProduct(item.subscription_item_id));
}