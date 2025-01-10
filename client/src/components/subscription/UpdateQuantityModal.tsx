import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QuantityInput } from "@/components/ui/QuantityInput";
import {
  isRevonizerProduct,
  calculateRevonizerQuantities,
  calculateTotalQuantityFromItems,
  filterRevonizerItems,
  REVONIZER_PRODUCTS,
} from "@/lib/revonizerCalculation";

type SubscriptionItem = {
  subscription_item_id: string;
  product: {
    name: string;
    description: string | null;
  };
  quantity: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  items: SubscriptionItem[];
  onConfirm: (quantities: Record<string, number>) => void;
};

export function UpdateQuantityModal({ isOpen, onClose, items, onConfirm }: Props) {
  const [step, setStep] = useState(1);

  // レボナイザーの合計台数（現在の契約台数を初期値として計算）
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
      // レボナイザー以外の商品が存在しない場合は直接確認画面へ
      const hasNonRevonizerItems = items.some(item => !isRevonizerProduct(item.subscription_item_id));
      if (hasNonRevonizerItems) {
        setStep(2);
      } else {
        setStep(3);
      }
    } else if (step === 2) {
      setStep(3);
    } else {
      // 確認画面で確定ボタンが押された場合
      const quantities = { ...otherQuantities };

      // レボナイザー商品の数量を自動計算して設定
      const calculatedQuantities = calculateRevonizerQuantities(totalRevonizerQuantity);
      Object.entries(calculatedQuantities).forEach(([productId, quantity]) => {
        quantities[productId] = quantity;
      });

      onConfirm(quantities);
    }
  };

  // レボナイザー以外の商品があるかどうかを確認
  const hasNonRevonizerItems = items.some(item => !isRevonizerProduct(item.subscription_item_id));

  // レボナイザー以外の商品を抽出
  const nonRevonizerItems = items.filter(item => !isRevonizerProduct(item.subscription_item_id));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {step === 1 
              ? "レボナイザーの台数設定" 
              : step === 2 
              ? "その他の商品の数量設定"
              : "変更内容の確認"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "レボナイザーの必要台数を入力してください"
              : step === 2
              ? "その他の商品の数量を入力してください"
              : "以下の内容で変更を適用します"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {step === 1 && (
            // Step 1: レボナイザーの合計台数設定
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="col-span-2">
                <h3 className="font-medium">レボナイザー（合計台数）</h3>
                <p className="text-sm text-muted-foreground">
                  現在の契約台数: {calculateTotalQuantityFromItems(filterRevonizerItems(items))}台
                </p>
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

          {step === 2 && (
            // Step 2: その他の商品の数量設定（レボナイザー以外）
            nonRevonizerItems.map(item => (
              <div key={item.subscription_item_id} className="grid grid-cols-4 items-center gap-4">
                <div className="col-span-2">
                  <h3 className="font-medium">{item.product.name}</h3>
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
            ))
          )}

          {step === 3 && (
            // Step 3: 変更内容の確認
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">レボナイザー利用ライセンス</h3>
                <div className="space-y-1 text-sm">
                  <p>合計: {totalRevonizerQuantity}台</p>
                  <div className="pl-4 space-y-1 text-muted-foreground">
                    <p>・{REVONIZER_PRODUCTS.FIRST_UNIT.name}: 1台</p>
                    {totalRevonizerQuantity > 1 && (
                      <p>・{REVONIZER_PRODUCTS.SECOND_TO_FOURTH.name}: {Math.min(totalRevonizerQuantity - 1, 3)}台</p>
                    )}
                    {totalRevonizerQuantity > 4 && (
                      <p>・{REVONIZER_PRODUCTS.FIFTH_AND_MORE.name}: {totalRevonizerQuantity - 4}台</p>
                    )}
                  </div>
                </div>
              </div>

              {hasNonRevonizerItems && (
                <div className="space-y-2">
                  <h3 className="font-medium">その他の商品</h3>
                  {nonRevonizerItems.map(item => (
                    <div key={item.subscription_item_id} className="pl-4 space-y-1 text-sm">
                      <p>{item.product.name}</p>
                      <div className="pl-4 text-muted-foreground">
                        <p>変更前: {item.quantity}個</p>
                        <p>変更後: {otherQuantities[item.subscription_item_id]}個</p>
                        {otherQuantities[item.subscription_item_id] !== item.quantity && (
                          <p className={otherQuantities[item.subscription_item_id] > item.quantity ? "text-green-600" : "text-red-600"}>
                            {otherQuantities[item.subscription_item_id] > item.quantity ? "+" : ""}
                            {otherQuantities[item.subscription_item_id] - item.quantity}個
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleNext}>
            {step === 3 
              ? "変更を確定"
              : hasNonRevonizerItems && step === 1 
              ? "次へ" 
              : "変更内容を確認"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}