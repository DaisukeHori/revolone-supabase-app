import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock } from "lucide-react";
import { REVONIZER } from '@/lib/constants';

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
  subscriptionId: string;
  items: SubscriptionItem[];
  onSuccess: () => void;
};

type Step = 'revonizer' | 'other_items' | 'confirm';

export function UpdateQuantityModal({ isOpen, onClose, subscriptionId, items, onSuccess }: Props) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>('revonizer');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [totalRevonizerQuantity, setTotalRevonizerQuantity] = useState<number>(0);
  const [calculatedQuantities, setCalculatedQuantities] = useState<{
    single: number;
    medium: number;
    bulk: number;
  }>({ single: 0, medium: 0, bulk: 0 });

  // 初期値の設定
  useEffect(() => {
    const initialQuantities: Record<string, number> = {};
    let initialRevonizerCount = 0;

    items.forEach(item => {
      // 商品がレボナイザー関連かどうかをチェック
      const isRevonizerProduct = Object.values(REVONIZER.PRODUCTS).some(
        product => item.subscription_item_id.includes(product.PRICE_ID)
      );

      if (isRevonizerProduct) {
        initialRevonizerCount += item.quantity;
      }

      initialQuantities[item.subscription_item_id] = item.quantity;
    });

    setQuantities(initialQuantities);
    setTotalRevonizerQuantity(initialRevonizerCount);
  }, [items]);

  // レボナイザーの台数が変更されたときの処理
  useEffect(() => {
    if (totalRevonizerQuantity <= 0) {
      setCalculatedQuantities({ single: 0, medium: 0, bulk: 0 });
      return;
    }

    // 1台目は必ずSINGLEプラン
    let single = Math.min(1, totalRevonizerQuantity);
    let remaining = totalRevonizerQuantity - single;

    // 2-4台目はMEDIUMプラン
    let medium = Math.min(3, Math.max(0, remaining));
    remaining -= medium;

    // 5台目以降はBULKプラン
    let bulk = Math.max(0, remaining);

    setCalculatedQuantities({ single, medium, bulk });
  }, [totalRevonizerQuantity]);

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

  const renderStepContent = () => {
    switch (currentStep) {
      case 'revonizer':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">現在の台数: {totalRevonizerQuantity}台</p>
              <div className="space-y-2">
                <Label htmlFor="revonizer-quantity">
                  レボナイザーの希望台数を入力してください
                </Label>
                <Input
                  id="revonizer-quantity"
                  type="number"
                  min="0"
                  value={totalRevonizerQuantity}
                  onChange={(e) => setTotalRevonizerQuantity(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setCurrentStep('other_items')}>
                次へ
              </Button>
            </DialogFooter>
          </div>
        );

      case 'other_items':
        return (
          <div className="space-y-6">
            {/* レボナイザー関連商品の表示（変更不可） */}
            <div className="space-y-4">
              <h3 className="font-medium">レボナイザー関連商品（自動計算）</h3>
              <div className="space-y-2">
                {calculatedQuantities.single > 0 && (
                  <div className="flex items-center justify-between bg-muted/50 p-2 rounded">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <span>標準プラン</span>
                    </div>
                    <span>{calculatedQuantities.single}台</span>
                  </div>
                )}
                {calculatedQuantities.medium > 0 && (
                  <div className="flex items-center justify-between bg-muted/50 p-2 rounded">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <span>2-4台目用プラン</span>
                    </div>
                    <span>{calculatedQuantities.medium}台</span>
                  </div>
                )}
                {calculatedQuantities.bulk > 0 && (
                  <div className="flex items-center justify-between bg-muted/50 p-2 rounded">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <span>5台目以降用プラン</span>
                    </div>
                    <span>{calculatedQuantities.bulk}台</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">その他の商品</h3>
              {items.map((item) => {
                // レボナイザー関連商品はスキップ
                const isRevonizerProduct = Object.values(REVONIZER.PRODUCTS).some(
                  product => item.subscription_item_id.includes(product.PRICE_ID)
                );
                if (isRevonizerProduct) return null;

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
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCurrentStep('revonizer')}>
                戻る
              </Button>
              <Button onClick={() => setCurrentStep('confirm')}>
                変更内容を確認
              </Button>
            </DialogFooter>
          </div>
        );

      case 'confirm':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium">レボナイザー</h3>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  希望台数: {totalRevonizerQuantity}台
                </p>
                <div className="space-y-1">
                  {calculatedQuantities.single > 0 && (
                    <p className="text-sm">標準プラン: {calculatedQuantities.single}台</p>
                  )}
                  {calculatedQuantities.medium > 0 && (
                    <p className="text-sm">2-4台目用プラン: {calculatedQuantities.medium}台</p>
                  )}
                  {calculatedQuantities.bulk > 0 && (
                    <p className="text-sm">5台目以降用プラン: {calculatedQuantities.bulk}台</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">その他の商品</h3>
              {items.map((item) => {
                const isRevonizerProduct = Object.values(REVONIZER.PRODUCTS).some(
                  product => item.subscription_item_id.includes(product.PRICE_ID)
                );
                if (isRevonizerProduct) return null;

                const newQuantity = quantities[item.subscription_item_id] || 0;
                const quantityDiff = newQuantity - item.quantity;

                return (
                  <div key={item.subscription_item_id} className="space-y-1">
                    <p className="text-sm font-medium">{item.product.name}</p>
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

            <DialogFooter>
              <Button variant="outline" onClick={() => setCurrentStep('other_items')}>
                戻る
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                確定する
              </Button>
            </DialogFooter>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {currentStep === 'revonizer' && "レボナイザーの台数設定"}
            {currentStep === 'other_items' && "商品数量の変更"}
            {currentStep === 'confirm' && "変更内容の確認"}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {renderStepContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}