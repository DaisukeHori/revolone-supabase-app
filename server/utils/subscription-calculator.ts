import { REVONAIZER_PRICES } from './subscription-config';

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

  // 最初の1台は必ずprice_1NwwacAPdno01lSPWH92pzrl（基本ライセンス）
  if (remainingQuantity >= 1) {
    quantities.push({
      priceId: REVONAIZER_PRICES[0].priceId,
      quantity: 1,
    });
    remainingQuantity -= 1;
  }

  // 2-4台目はprice_1OCCkvAPdno01lSP44FyPiZ3（追加利用ライセンス 2-4台）
  if (remainingQuantity > 0) {
    const secondTierQuantity = Math.min(remainingQuantity, 3); // 最大3台まで
    quantities.push({
      priceId: REVONAIZER_PRICES[1].priceId,
      quantity: secondTierQuantity,
    });
    remainingQuantity -= secondTierQuantity;
  }

  // 5台目以降はprice_1OED1uAPdno01lSP3UESyV7C（追加利用ライセンス 5台以上）
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

    // 数量が変更された場合のみ変更を記録
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