import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { QuantityInput } from "@/components/ui/QuantityInput";
import {
  isRevonizerProduct,
  calculateTotalQuantityFromItems,
  filterRevonizerItems,
} from "@/lib/revonizerCalculation";

type SubscriptionItem = {
  subscription_item_id: string;
  product: {
    name: string;
    description: string | null;
  };
  quantity: number;
  amount?: number | null;
  currency?: string;
  interval?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  items: SubscriptionItem[];
  onConfirm: (quantities: Record<string, number>) => void;
};

export function UpdateQuantityModal({ isOpen, onClose, items, onConfirm }: Props) {
  // レボナイザー関連の商品の合計台数
  const [totalRevonizerQuantity, setTotalRevonizerQuantity] = useState<number>(
    calculateTotalQuantityFromItems(filterRevonizerItems(items))
  );

  // その他の商品の数量
  const [otherQuantities, setOtherQuantities] = useState<Record<string, number>>({});

  // 初期化
  useEffect(() => {
    const initialOtherQuantities: Record<string, number> = {};
    items.forEach(item => {
      if (!isRevonizerProduct(item.subscription_item_id)) {
        initialOtherQuantities[item.subscription_item_id] = item.quantity;
      }
    });
    setOtherQuantities(initialOtherQuantities);
  }, [items]);

  // 数量変更ハンドラー
  const handleQuantityChange = (itemId: string, value: number) => {
    setOtherQuantities(prev => ({
      ...prev,
      [itemId]: value,
    }));
  };

  const handleRevonizerQuantityChange = (value: number) => {
    setTotalRevonizerQuantity(value);
  };

  const handleConfirm = () => {
    // レボナイザー以外の商品の数量をそのまま使用
    const quantities = { ...otherQuantities };

    // レボナイザー商品の数量を計算して追加
    const revonizerItems = filterRevonizerItems(items);
    revonizerItems.forEach(item => {
      quantities[item.subscription_item_id] = totalRevonizerQuantity;
    });

    onConfirm(quantities);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>サブスクリプションの数量を変更</DialogTitle>
          <DialogDescription>
            各商品の数量を入力してください。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* レボナイザー商品の数量入力 */}
          {filterRevonizerItems(items).length > 0 && (
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="col-span-2">
                <h3 className="font-medium">レボナイザー（合計台数）</h3>
                {items[0]?.amount && (
                  <p className="text-sm text-muted-foreground">
                    {items[0].amount.toLocaleString()} {items[0].currency?.toUpperCase()} / {items[0].interval}
                  </p>
                )}
              </div>
              <div className="col-span-2">
                <QuantityInput
                  initialQuantity={totalRevonizerQuantity}
                  onChange={handleRevonizerQuantityChange}
                  min={1}
                />
              </div>
            </div>
          )}

          {/* その他の商品の数量入力 */}
          {items.map(item => {
            if (!isRevonizerProduct(item.subscription_item_id)) {
              return (
                <div key={item.subscription_item_id} className="grid grid-cols-4 items-center gap-4">
                  <div className="col-span-2">
                    <h3 className="font-medium">{item.product.name}</h3>
                    {item.amount && (
                      <p className="text-sm text-muted-foreground">
                        {item.amount.toLocaleString()} {item.currency?.toUpperCase()} / {item.interval}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <QuantityInput
                      itemId={item.subscription_item_id}
                      initialQuantity={otherQuantities[item.subscription_item_id] || 0}
                      onChange={(quantity) =>
                        handleQuantityChange(item.subscription_item_id, quantity)
                      }
                      min={0}
                    />
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleConfirm}>
            変更内容を確認
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}