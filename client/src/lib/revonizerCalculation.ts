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
  // デバッグ用：判定対象のIDをログ出力
  console.log('Checking if product is Revonizer:', id);

  const priceIds = [
    REVONIZER_PRODUCTS.FIRST_UNIT.priceId,
    REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId,
    REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId,
  ];

  // デバッグ用：登録されているpriceIdsをログ出力
  console.log('Registered Revonizer priceIds:', priceIds);

  const isRevonizer = priceIds.includes(id);
  console.log('Is Revonizer product:', isRevonizer);
  return isRevonizer;
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
  // デバッグ用：受け取ったアイテムの内容をログ出力
  console.log('Calculating total quantity for items:', JSON.stringify(items, null, 2));

  let total = 0;

  // 各レボナイザー商品の数量を合算
  items.forEach(item => {
    if (isRevonizerProduct(item.subscription_item_id)) {
      console.log('Found Revonizer item:', item);
      total += item.quantity;
    }
  });

  console.log('Total quantity calculated:', total);
  return total;
}

// レボナイザー商品のみを抽出する関数
export function filterRevonizerItems(items: Array<{
  subscription_item_id: string;
  quantity: number;
}>): typeof items {
  // デバッグ用：フィルタリング前のアイテムをログ出力
  console.log('Filtering Revonizer items from:', JSON.stringify(items, null, 2));

  const filtered = items.filter(item => isRevonizerProduct(item.subscription_item_id));

  // デバッグ用：フィルタリング後のアイテムをログ出力
  console.log('Filtered Revonizer items:', JSON.stringify(filtered, null, 2));

  return filtered;
}