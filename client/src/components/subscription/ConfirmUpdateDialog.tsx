import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  REVONIZER_PRODUCTS,
  calculateRevonizerQuantities,
  getRevonizerProductType,
} from "@/lib/revonizerCalculation";
import { useState, useEffect } from "react";

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
  const [removedItems, setRemovedItems] = useState<SubscriptionItem[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  // 削除対象の商品を特定
  useEffect(() => {
    async function initializeRemovedItems() {
      setIsInitializing(true);
      try {
        const removed: SubscriptionItem[] = [];

        for (const item of items) {
          const productType = await getRevonizerProductType(item.subscription_item_id);
          const newQuantity = updatedQuantities[item.subscription_item_id] || 0;

          // 基本ライセンスは削除対象から除外
          if (productType === 'FIRST_UNIT') {
            continue;
          }

          if (item.quantity > 0 && newQuantity === 0) {
            removed.push(item);
          }
        }

        setRemovedItems(removed);
      } catch (error) {
        console.error('Error initializing removed items:', error);
      } finally {
        setIsInitializing(false);
      }
    }

    initializeRemovedItems();
  }, [items, updatedQuantities]);

  // 合計台数を計算（基本ライセンスは常に1台）
  const totalRevonizerQuantity = Math.max(1, Math.max(...Object.values(updatedQuantities)));

  // レボナイザー商品の内訳を計算
  const revonizerBreakdown = calculateRevonizerQuantities(totalRevonizerQuantity);

  // 商品ごとの価格を計算する関数
  const calculatePrice = (item: SubscriptionItem, quantity: number) => {
    if (!item.amount) return "価格未定";
    return `${(item.amount * quantity).toLocaleString()} ${item.currency.toUpperCase()}`;
  };

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
              {/* 基本ライセンスは常に1台なので表示を簡素化 */}
            </div>
          </div>

          {/* 各商品の変更内容 */}
          {items.map(async (item) => {
            const productType = await getRevonizerProductType(item.subscription_item_id);
            const newQuantity = productType === 'FIRST_UNIT' 
              ? 1  // 基本ライセンスは常に1
              : (updatedQuantities[item.subscription_item_id] || 0);
            const quantityDiff = newQuantity - item.quantity;

            return (
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
            );
          })}

          {/* 警告メッセージ（削除対象の商品がある場合のみ表示） */}
          {removedItems.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
              <p className="text-yellow-800 font-medium">注意</p>
              <p className="text-sm text-yellow-700 mt-1">
                以下の商品の数量が0になるため、サブスクリプションから削除されます：
              </p>
              <ul className="list-disc list-inside text-sm text-yellow-700 mt-2">
                {removedItems.map(item => (
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