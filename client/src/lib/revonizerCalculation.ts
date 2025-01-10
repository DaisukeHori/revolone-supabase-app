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
export function isRevonizerProduct(productId: string): boolean {
  return Object.values(REVONIZER_PRODUCTS).some(
    product => product.productId === productId || product.priceId === productId
  );
}

// 合計台数から各商品の必要数量を計算する関数
export function calculateRevonizerQuantities(totalQuantity: number): Record<string, number> {
  if (totalQuantity <= 0) {
    throw new Error('数量は1以上である必要があります');
  }

  const quantities: Record<string, number> = {
    [REVONIZER_PRODUCTS.FIRST_UNIT.productId]: 1,
    [REVONIZER_PRODUCTS.SECOND_TO_FOURTH.productId]: 0,
    [REVONIZER_PRODUCTS.FIFTH_AND_MORE.productId]: 0,
  };

  if (totalQuantity > 1) {
    const remainingAfterFirst = totalQuantity - 1;
    const secondToFourthCount = Math.min(remainingAfterFirst, 3);
    quantities[REVONIZER_PRODUCTS.SECOND_TO_FOURTH.productId] = secondToFourthCount;

    if (remainingAfterFirst > 3) {
      quantities[REVONIZER_PRODUCTS.FIFTH_AND_MORE.productId] = remainingAfterFirst - 3;
    }
  }

  return quantities;
}

// 商品名から合計台数を計算する関数（既存のサブスクリプションアイテムから計算）
export function calculateTotalQuantityFromItems(items: Array<{
  product: { name: string };
  quantity: number;
}>): number {
  return items.reduce((total, item) => {
    if (
      item.product.name === REVONIZER_PRODUCTS.FIRST_UNIT.name ||
      item.product.name === REVONIZER_PRODUCTS.SECOND_TO_FOURTH.name ||
      item.product.name === REVONIZER_PRODUCTS.FIFTH_AND_MORE.name
    ) {
      return total + item.quantity;
    }
    return total;
  }, 0);
}

// 既存のサブスクリプションアイテムから、レボナイザー関連の商品のみを抽出する
export function filterRevonizerItems(items: Array<{
  subscription_item_id: string;
  product: { name: string };
  quantity: number;
}>): typeof items {
  return items.filter(item => 
    item.product.name === REVONIZER_PRODUCTS.FIRST_UNIT.name ||
    item.product.name === REVONIZER_PRODUCTS.SECOND_TO_FOURTH.name ||
    item.product.name === REVONIZER_PRODUCTS.FIFTH_AND_MORE.name
  );
}