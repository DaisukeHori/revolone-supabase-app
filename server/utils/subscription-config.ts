type PriceLevel = {
  productId: string;
  priceId: string;
  minQuantity: number;
  maxQuantity?: number;
  name: string;
};

export const REVONAIZER_PRICES: PriceLevel[] = [
  {
    productId: 'prod_OkRTix5Mimwc9p',
    priceId: 'price_1NwwacAPdno01lSPWH92pzrl',
    minQuantity: 1,
    maxQuantity: 1,
    name: 'レボナイザー基本ライセンス',
  },
  {
    productId: 'prod_P0DB3wRLVlz8GV',
    priceId: 'price_1OCCkvAPdno01lSP44FyPiZ3',
    minQuantity: 2,
    maxQuantity: 4,
    name: 'レボナイザー追加利用ライセンス（2-4台）',
  },
  {
    productId: 'prod_P1IWo9CT6gNkX2',
    priceId: 'price_1OED1uAPdno01lSP3UESyV7C',
    minQuantity: 5,
    name: 'レボナイザー追加利用ライセンス（5台以上）',
  },
];
