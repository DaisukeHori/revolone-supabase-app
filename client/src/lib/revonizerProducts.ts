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
