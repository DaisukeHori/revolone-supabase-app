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
  // Step 1: レボナイザーの台数設定
  // Step 2: その他の商品の数量設定
  const [step, setStep] = useState(1);

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
    setStep(1); // モーダルが開かれるたびにステップ1から開始
  }, [items, isOpen]);

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

  const handleNext = () => {
    if (step === 1) {
      // レボナイザー以外の商品が存在しない場合は、直接確認画面へ
      const hasNonRevonizerItems = items.some(item => !isRevonizerProduct(item.subscription_item_id));
      if (hasNonRevonizerItems) {
        setStep(2);
      } else {
        const quantities = {};
        const revonizerItems = filterRevonizerItems(items);
        revonizerItems.forEach(item => {
          quantities[item.subscription_item_id] = totalRevonizerQuantity;
        });
        onConfirm(quantities);
      }
    } else {
      // レボナイザー以外の商品の数量をそのまま使用
      const quantities = { ...otherQuantities };

      // レボナイザー商品の数量を設定
      const revonizerItems = filterRevonizerItems(items);
      revonizerItems.forEach(item => {
        quantities[item.subscription_item_id] = totalRevonizerQuantity;
      });

      onConfirm(quantities);
    }
  };

  // レボナイザー以外の商品があるかどうかを確認
  const hasNonRevonizerItems = items.some(item => !isRevonizerProduct(item.subscription_item_id));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "レボナイザーの台数設定" : "その他の商品の数量設定"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "レボナイザーの必要台数を入力してください"
              : "その他の商品の数量を入力してください"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {step === 1 ? (
            // Step 1: レボナイザーの台数設定
            filterRevonizerItems(items).length > 0 && (
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
            )
          ) : (
            // Step 2: その他の商品の数量設定
            items.map(item => {
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
            })
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleNext}>
            {step === 1 
              ? (hasNonRevonizerItems ? "次へ" : "変更内容を確認")
              : "変更内容を確認"
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}