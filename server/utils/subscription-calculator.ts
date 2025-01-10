type PriceLevel = {
  productId: string;
  priceId: string;
  minQuantity: number;
  maxQuantity?: number;
};

export const REVONAIZER_PRICES: PriceLevel[] = [
  {
    productId: 'prod_OkRTix5Mimwc9p',
    priceId: 'price_1NwwacAPdno01lSPWH92pzrl',
    minQuantity: 1,
    maxQuantity: 1,
  },
  {
    productId: 'prod_P0DB3wRLVlz8GV',
    priceId: 'price_1OCCkvAPdno01lSP44FyPiZ3',
    minQuantity: 2,
    maxQuantity: 4,
  },
  {
    productId: 'prod_P1IWo9CT6gNkX2',
    priceId: 'price_1OED1uAPdno01lSP3UESyV7C',
    minQuantity: 5,
  },
];

export interface SubscriptionQuantity {
  priceId: string;
  quantity: number;
}

/**
 * 合計台数から各プランの必要数を計算
 */
export function calculateQuantities(totalQuantity: number): SubscriptionQuantity[] {
  const quantities: SubscriptionQuantity[] = [];
  let remainingQuantity = totalQuantity;

  // 最初の1台は必ずprod_OkRTix5Mimwc9p
  if (remainingQuantity >= 1) {
    quantities.push({
      priceId: REVONAIZER_PRICES[0].priceId,
      quantity: 1,
    });
    remainingQuantity -= 1;
  }

  // 2-4台目はprod_P0DB3wRLVlz8GV
  if (remainingQuantity > 0) {
    const secondTierQuantity = Math.min(remainingQuantity, 3); // 最大3台まで
    quantities.push({
      priceId: REVONAIZER_PRICES[1].priceId,
      quantity: secondTierQuantity,
    });
    remainingQuantity -= secondTierQuantity;
  }

  // 5台目以降はprod_P1IWo9CT6gNkX2
  if (remainingQuantity > 0) {
    quantities.push({
      priceId: REVONAIZER_PRICES[2].priceId,
      quantity: remainingQuantity,
    });
  }

  return quantities;
}

/**
 * 現在の数量から目標数量への変更に必要な各プランの数量変更を計算
 */
export function calculateQuantityChanges(
  currentQuantities: SubscriptionQuantity[],
  targetTotalQuantity: number
): SubscriptionQuantity[] {
  const targetQuantities = calculateQuantities(targetTotalQuantity);
  const changes: SubscriptionQuantity[] = [];

  // 各プランの数量変更を計算
  for (const price of REVONAIZER_PRICES) {
    const currentQty = currentQuantities.find(q => q.priceId === price.priceId)?.quantity || 0;
    const targetQty = targetQuantities.find(q => q.priceId === price.priceId)?.quantity || 0;

    if (currentQty !== targetQty) {
      changes.push({
        priceId: price.priceId,
        quantity: targetQty,
      });
    }
  }

  return changes;
}

/**
 * 合計台数を計算
 */
export function calculateTotalQuantity(quantities: SubscriptionQuantity[]): number {
  return quantities.reduce((total, item) => total + item.quantity, 0);
}
