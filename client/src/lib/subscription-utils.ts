type ProductConfig = {
  price_id: string;
  product_id: string;
  min_quantity: number;
  max_quantity: number;
};

export const REVONAIZER_PRODUCTS = {
  TIER1: {
    price_id: 'price_1NwwacAPdno01lSPWH92pzrl',
    product_id: 'prod_OkRTix5Mimwc9p',
    min_quantity: 1,
    max_quantity: 1,
  },
  TIER2: {
    price_id: 'price_1OCCkvAPdno01lSP44FyPiZ3',
    product_id: 'prod_P0DB3wRLVlz8GV',
    min_quantity: 0,
    max_quantity: 3,
  },
  TIER3: {
    price_id: 'price_1OED1uAPdno01lSP3UESyV7C',
    product_id: 'prod_P1IWo9CT6gNkX2',
    min_quantity: 0,
    max_quantity: Infinity,
  },
} as const;

export type SubscriptionQuantities = {
  [K in keyof typeof REVONAIZER_PRODUCTS]?: number;
};

export function calculateProductQuantities(totalQuantity: number): SubscriptionQuantities {
  if (totalQuantity < 1) {
    throw new Error('数量は1以上である必要があります');
  }

  const quantities: SubscriptionQuantities = {
    TIER1: 1, // 1台目は必ずTIER1
  };

  if (totalQuantity === 1) {
    return quantities;
  }

  // 2-4台目はTIER2
  const tier2Quantity = Math.min(3, totalQuantity - 1);
  if (tier2Quantity > 0) {
    quantities.TIER2 = tier2Quantity;
  }

  // 5台目以降はTIER3
  const remainingQuantity = totalQuantity - 1 - (quantities.TIER2 || 0);
  if (remainingQuantity > 0) {
    quantities.TIER3 = remainingQuantity;
  }

  return quantities;
}

export function getTotalQuantityFromProducts(items: Array<{
  subscription_item_id: string;
  product: { name: string };
  quantity: number;
}>): number {
  let total = 0;
  
  items.forEach(item => {
    // レボナイザー製品のIDと一致するものを集計
    if (Object.values(REVONAIZER_PRODUCTS).some(
      product => item.subscription_item_id.includes(product.product_id)
    )) {
      total += item.quantity;
    }
  });

  return total;
}

export function isRevonaizer(productId: string): boolean {
  return Object.values(REVONAIZER_PRODUCTS).some(
    product => product.product_id === productId
  );
}

export function getQuantityDifference(
  currentQuantities: SubscriptionQuantities,
  newTotalQuantity: number
): { [key: string]: number } {
  const newQuantities = calculateProductQuantities(newTotalQuantity);
  const differences: { [key: string]: number } = {};

  // 各ティアの差分を計算
  (Object.keys(REVONAIZER_PRODUCTS) as Array<keyof typeof REVONAIZER_PRODUCTS>).forEach(tier => {
    const currentQty = currentQuantities[tier] || 0;
    const newQty = newQuantities[tier] || 0;
    if (currentQty !== newQty) {
      differences[tier] = newQty - currentQty;
    }
  });

  return differences;
}
