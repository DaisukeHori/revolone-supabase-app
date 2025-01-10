import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { REVONIZER } from '@/lib/constants';

type SubscriptionItem = {
  subscription_item_id: string;
  amount: number;
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
  subscriptionId: string;
  items: SubscriptionItem[];
  onSuccess: () => void;
};

export function UpdateQuantityModal({ isOpen, onClose, subscriptionId, items, onSuccess }: Props) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmStep, setIsConfirmStep] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [totalRevonizerQuantity, setTotalRevonizerQuantity] = useState<number>(0);

  // 初期値の設定
  useEffect(() => {
    console.log('[UpdateQuantityModal] Modal opened or items changed. Items:', JSON.stringify(items, null, 2));
    const initialQuantities: Record<string, number> = {};
    let initialRevonizerCount = 0;

    items.forEach(item => {
      console.log('[UpdateQuantityModal] Processing item:', {
        id: item.subscription_item_id,
        name: item.product.name,
        quantity: item.quantity
      });

      // 商品がレボナイザー関連かどうかをチェック
      const isRevonizerProduct = Object.values(REVONIZER.PRODUCTS).some(
        product => item.subscription_item_id.includes(product.PRICE_ID)
      );

      if (isRevonizerProduct) {
        initialRevonizerCount += item.quantity;
      }

      initialQuantities[item.subscription_item_id] = item.quantity;
    });

    console.log('[UpdateQuantityModal] Setting quantities:', initialQuantities);
    setQuantities(initialQuantities);
    setTotalRevonizerQuantity(initialRevonizerCount);
  }, [items]);

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    setQuantities(prev => ({ ...prev, [itemId]: newQuantity }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/stripe/subscription/${subscriptionId}/update-quantities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          totalRevonizerQuantity,
          items: Object.entries(quantities).map(([id, quantity]) => ({
            id,
            quantity: Number(quantity)
          }))
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast({
        description: "サブスクリプションの数量を更新しました",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('数量更新エラー:', error);
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "数量の更新中にエラーが発生しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProceedToConfirm = () => {
    setIsConfirmStep(true);
  };

  const handleBack = () => {
    setIsConfirmStep(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isConfirmStep ? "変更内容の確認" : "数量の変更"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {!isConfirmStep ? (
            <>
              {/* レボナイザーの合計数量入力 */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="revonizer-quantity" className="col-span-2">
                  レボナイザー（合計）
                </Label>
                <Input
                  id="revonizer-quantity"
                  type="number"
                  min="0"
                  value={totalRevonizerQuantity}
                  onChange={(e) => setTotalRevonizerQuantity(Number(e.target.value))}
                  className="col-span-2"
                />
              </div>

              {/* 他の商品の数量入力 */}
              {items.map((item) => {
                // レボナイザー関連商品はスキップ
                const isRevonizerProduct = Object.values(REVONIZER.PRODUCTS).some(
                  product => item.subscription_item_id.includes(product.PRICE_ID)
                );
                if (isRevonizerProduct) return null;

                console.log('[UpdateQuantityModal] Rendering item:', {
                  id: item.subscription_item_id,
                  name: item.product.name,
                  currentQuantity: quantities[item.subscription_item_id],
                  originalQuantity: item.quantity
                });

                return (
                  <div key={item.subscription_item_id} className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor={item.subscription_item_id} className="col-span-2">
                      {item.product.name}
                    </Label>
                    <Input
                      id={item.subscription_item_id}
                      type="number"
                      min="0"
                      value={quantities[item.subscription_item_id] || 0}
                      onChange={(e) => handleQuantityChange(item.subscription_item_id, Number(e.target.value))}
                      className="col-span-2"
                    />
                  </div>
                );
              })}
            </>
          ) : (
            // 確認ステップの表示
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">レボナイザー</h4>
                <p className="text-sm text-muted-foreground">
                  合計台数: {totalRevonizerQuantity}台
                </p>
              </div>

              {items.map((item) => {
                const isRevonizerProduct = Object.values(REVONIZER.PRODUCTS).some(
                  product => item.subscription_item_id.includes(product.PRICE_ID)
                );
                if (isRevonizerProduct) return null;

                const newQuantity = quantities[item.subscription_item_id] || 0;
                const quantityDiff = newQuantity - item.quantity;

                return (
                  <div key={item.subscription_item_id} className="space-y-1">
                    <h4 className="font-medium">{item.product.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      数量: {item.quantity} → {newQuantity}
                      {quantityDiff !== 0 && (
                        <span className={quantityDiff > 0 ? "text-green-600" : "text-red-600"}>
                          {" "}({quantityDiff > 0 ? "+" : ""}{quantityDiff})
                        </span>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          {isConfirmStep ? (
            <>
              <Button variant="outline" onClick={handleBack} disabled={isLoading}>
                戻る
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                確定する
              </Button>
            </>
          ) : (
            <Button onClick={handleProceedToConfirm}>
              変更内容を確認
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
