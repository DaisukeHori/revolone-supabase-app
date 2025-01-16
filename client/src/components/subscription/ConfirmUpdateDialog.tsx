import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { getRevonizerProductType, calculateRevonizerQuantities } from "@/lib/revonizerCalculation";
import { REVONIZER_PRODUCTS } from "@/lib/revonizerProducts";

type SubscriptionItem = {
  subscription_item_id: string;
  amount: number | null;
  currency: string;
  interval: string;
  quantity: number;
  product: {
    name: string;
    description: string | null;
  };
};

type ItemWithUpdatedQuantity = {
  item: SubscriptionItem;
  newQuantity: number;
  quantityDiff: number;
  isRevonizerProduct: boolean;
  productType: 'FIRST_UNIT' | 'SECOND_TO_FOURTH' | 'FIFTH_AND_MORE' | null;
  priceId: string | null;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  items: SubscriptionItem[];
  updatedQuantities: Record<string, number>;
  onConfirm: (quantities: Record<string, number>) => Promise<void>;
  isUpdating: boolean;
};

export function ConfirmUpdateDialog({
  isOpen,
  onClose,
  items,
  updatedQuantities,
  onConfirm,
  isUpdating,
}: Props) {
  const [itemsWithQuantities, setItemsWithQuantities] = useState<ItemWithUpdatedQuantity[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [totalRevonizerQuantity, setTotalRevonizerQuantity] = useState(1);

  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      if (!items.length) return;

      try {
        // 合計台数を計算（最小1台）
        const validTotalQuantity = Math.max(1, updatedQuantities['total'] || 1);
        if (isMounted) {
          setTotalRevonizerQuantity(validTotalQuantity);
        }

        // レボナイザー商品の数量を計算
        const revonizerQuantities = calculateRevonizerQuantities(validTotalQuantity);
        const itemsData: ItemWithUpdatedQuantity[] = [];

        // 既存のアイテムを処理
        for (const item of items) {
          const productType = await getRevonizerProductType(item.subscription_item_id);
          let newQuantity = item.quantity;
          let priceId = null;

          if (productType) {
            try {
              const response = await fetch(`/api/stripe/subscription-item/${item.subscription_item_id}/price`);
              const data = await response.json();
              priceId = data.priceId;

              if (priceId && revonizerQuantities[priceId] !== undefined) {
                newQuantity = revonizerQuantities[priceId];
              }
            } catch (error) {
              console.error('Error fetching price ID:', error);
            }
          } else {
            newQuantity = updatedQuantities[item.subscription_item_id] || 0;
          }

          if (isMounted) {
            itemsData.push({
              item,
              newQuantity,
              quantityDiff: newQuantity - item.quantity,
              isRevonizerProduct: productType !== null,
              productType,
              priceId,
            });
          }
        }

        // 5台目以降の商品が存在しない場合は新規作成
        const hasFifthAndMore = itemsData.some(item => item.productType === 'FIFTH_AND_MORE');
        if (!hasFifthAndMore && validTotalQuantity > 4) {
          const fifthAndMoreQuantity = validTotalQuantity - 4;
          const dummyItem: SubscriptionItem = {
            subscription_item_id: REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId,
            amount: 8800, // 仮の金額
            currency: 'jpy',
            interval: 'month',
            quantity: 0,
            product: {
              name: REVONIZER_PRODUCTS.FIFTH_AND_MORE.name,
              description: null,
            },
          };

          itemsData.push({
            item: dummyItem,
            newQuantity: fifthAndMoreQuantity,
            quantityDiff: fifthAndMoreQuantity,
            isRevonizerProduct: true,
            productType: 'FIFTH_AND_MORE',
            priceId: REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId,
          });
        }

        if (isMounted) {
          setItemsWithQuantities(itemsData);
          setIsInitializing(false);
        }
      } catch (error) {
        console.error('Error initializing items:', error);
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    }

    setIsInitializing(true);
    initialize();

    return () => {
      isMounted = false;
    };
  }, [items, updatedQuantities]);

  // 商品ごとの価格を計算
  const calculatePrice = (item: SubscriptionItem, quantity: number) => {
    if (!item.amount) return "価格未定";
    return `${(item.amount * quantity).toLocaleString()} ${item.currency.toUpperCase()}`;
  };

  // 削除対象の商品を抽出（基本ライセンス以外で数量が0になるもの）
  const removedItems = itemsWithQuantities.filter(
    ({ newQuantity, productType }) => newQuantity === 0 && productType !== 'FIRST_UNIT'
  );

  if (isInitializing) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>変更内容の確認</DialogTitle>
            <DialogDescription>
              内容を確認しています...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>変更内容の確認</DialogTitle>
          <DialogDescription>
            以下の内容で変更を適用します。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* レボナイザー商品の変更内容 */}
          <div className="space-y-2">
            <h3 className="font-medium">レボナイザー利用ライセンス</h3>
            <div className="space-y-1 text-sm">
              <p>合計: {totalRevonizerQuantity}台</p>
              <div className="pl-4 text-muted-foreground">
                {itemsWithQuantities
                  .filter(({ isRevonizerProduct }) => isRevonizerProduct)
                  .sort((a, b) => {
                    const order = ['FIRST_UNIT', 'SECOND_TO_FOURTH', 'FIFTH_AND_MORE'];
                    return order.indexOf(a.productType!) - order.indexOf(b.productType!);
                  })
                  .map(({ item, newQuantity, quantityDiff }) => (
                    <div key={item.subscription_item_id} className="space-y-1 mt-2">
                      <p className="font-medium">{item.product.name}</p>
                      <p>変更前: {item.quantity}個（{calculatePrice(item, item.quantity)}）</p>
                      <p>変更後: {newQuantity}個（{calculatePrice(item, newQuantity)}）</p>
                      {quantityDiff !== 0 && (
                        <p className={quantityDiff > 0 ? "text-green-600" : "text-red-600"}>
                          {quantityDiff > 0 ? "+" : ""}{quantityDiff}個
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* その他の商品の変更内容 */}
          {itemsWithQuantities
            .filter(({ isRevonizerProduct }) => !isRevonizerProduct)
            .map(({ item, newQuantity, quantityDiff }) => (
              <div key={item.subscription_item_id} className="space-y-1">
                <h3 className="font-medium">{item.product.name}</h3>
                <div className="space-y-1 text-sm pl-4 text-muted-foreground">
                  <p>変更前: {item.quantity}個（{calculatePrice(item, item.quantity)}）</p>
                  <p>変更後: {newQuantity}個（{calculatePrice(item, newQuantity)}）</p>
                  {quantityDiff !== 0 && (
                    <p className={quantityDiff > 0 ? "text-green-600" : "text-red-600"}>
                      {quantityDiff > 0 ? "+" : ""}{quantityDiff}個
                    </p>
                  )}
                </div>
              </div>
            ))}

          {/* 警告メッセージ（削除対象の商品がある場合のみ表示） */}
          {removedItems.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
              <p className="text-yellow-800 font-medium">注意</p>
              <p className="text-sm text-yellow-700 mt-1">
                以下の商品の数量が0になるため、サブスクリプションから削除されます：
              </p>
              <ul className="list-disc list-inside text-sm text-yellow-700 mt-2">
                {removedItems.map(({ item }) => (
                  <li key={item.subscription_item_id}>{item.product.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isUpdating}>
            キャンセル
          </Button>
          <Button onClick={() => onConfirm(updatedQuantities)} disabled={isUpdating}>
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            変更を確定
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}