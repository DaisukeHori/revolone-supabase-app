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
import { Loader2 } from "lucide-react";
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
  const [isLoading, setIsLoading] = useState(true);
  const [currentTotalQuantity, setCurrentTotalQuantity] = useState(0);
  const [totalRevonizerQuantity, setTotalRevonizerQuantity] = useState(0);
  const [otherQuantities, setOtherQuantities] = useState<Record<string, number>>({});
  const [nonRevonizerItems, setNonRevonizerItems] = useState<SubscriptionItem[]>([]);
  const [hasNonRevonizerItems, setHasNonRevonizerItems] = useState(false);

  // 初期化処理
  useEffect(() => {
    async function initializeQuantities() {
      setIsLoading(true);
      try {
        const revonizerItems = await filterRevonizerItems(items);
        const total = await calculateTotalQuantityFromItems(revonizerItems);
        setCurrentTotalQuantity(total);
        setTotalRevonizerQuantity(total);

        // 非レボナイザー商品を特定
        const nonRevonizer: SubscriptionItem[] = [];
        const initialOtherQuantities: Record<string, number> = {};

        await Promise.all(items.map(async item => {
          const isRevonizer = await isRevonizerProduct(item.subscription_item_id);
          if (!isRevonizer) {
            nonRevonizer.push(item);
            initialOtherQuantities[item.subscription_item_id] = item.quantity;
          }
        }));

        setNonRevonizerItems(nonRevonizer);
        setHasNonRevonizerItems(nonRevonizer.length > 0);
        setOtherQuantities(initialOtherQuantities);
      } catch (error) {
        console.error('Error initializing quantities:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (isOpen) {
      initializeQuantities();
      setStep(1);
    }
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

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="col-span-2">
                <h3 className="font-medium">レボナイザー（合計台数）</h3>
                <p className="text-sm text-muted-foreground">
                  現在の契約台数: {currentTotalQuantity}台
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
            <div className="space-y-4">
              {nonRevonizerItems.map(item => (
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
              ))}
            </div>
          )}

          {step === 3 && (
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
            {step === 3 ? "変更を確定" : "次へ"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}