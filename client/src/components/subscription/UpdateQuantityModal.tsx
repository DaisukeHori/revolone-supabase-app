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

  // モーダルが開かれたときの初期化処理
  useEffect(() => {
    async function initializeQuantities() {
      setIsLoading(true);
      try {
        // レボナイザー商品の取得と合計台数の計算
        const revonizerItems = await filterRevonizerItems(items);
        console.log('Revonizer items:', revonizerItems);
        const total = await calculateTotalQuantityFromItems(revonizerItems);
        console.log('Current total quantity:', total);

        setCurrentTotalQuantity(total);
        setTotalRevonizerQuantity(total);

        // その他の商品を特定
        const nonRevonizer: SubscriptionItem[] = [];
        const initialOtherQuantities: Record<string, number> = {};

        for (const item of items) {
          const isRevonizer = await isRevonizerProduct(item.subscription_item_id);
          if (!isRevonizer) {
            nonRevonizer.push(item);
            initialOtherQuantities[item.subscription_item_id] = item.quantity;
          }
        }

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
    console.log('Changing total quantity to:', value);
    setTotalRevonizerQuantity(Math.max(1, value));
  };

  const handleNext = () => {
    if (step === 1) {
      if (hasNonRevonizerItems) {
        setStep(2);
      } else {
        handleConfirm();
      }
    } else if (step === 2) {
      handleConfirm();
    }
  };

  const handleConfirm = () => {
    const quantities: Record<string, number> = {
      ...otherQuantities,
    };

    // 合計台数を設定（レボナイザー商品の数量は確認画面で計算）
    console.log('Confirming with total quantity:', totalRevonizerQuantity);
    quantities['total'] = totalRevonizerQuantity;

    onConfirm(quantities);
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>数量設定の準備中</DialogTitle>
            <DialogDescription>
              商品情報を読み込んでいます...
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {step === 1 
              ? "レボナイザーの台数設定" 
              : "その他の商品の数量設定"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "レボナイザーの必要台数を入力してください"
              : "その他の商品の数量を入力してください"}
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
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleNext}>
            {step === 1 && hasNonRevonizerItems ? "次へ" : "確認"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}