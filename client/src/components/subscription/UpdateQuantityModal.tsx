import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";
import { REVONIZER } from '@/lib/constants';
import { useState, useEffect } from 'react';

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
  onConfirm: (quantities: Record<string, number>) => void;
};

type Step = 'revonizer' | 'other_items' | 'confirm';

export function UpdateQuantityModal({ isOpen, onClose, subscriptionId, items, onConfirm }: Props) {
  const [currentStep, setCurrentStep] = useState<Step>('revonizer');
  const [totalRevonizerQuantity, setTotalRevonizerQuantity] = useState<number>(0);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [calculatedQuantities, setCalculatedQuantities] = useState<{
    single: number;
    medium: number;
    bulk: number;
  }>({ single: 0, medium: 0, bulk: 0 });

  // モーダルが開かれた時の初期化
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('revonizer');
      const initialQuantities: Record<string, number> = {};
      let initialRevonizerCount = 0;

      items.forEach(item => {
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
    }
  }, [isOpen, items]);

  // レボナイザーの台数変更時にプラン別の数量を計算
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 'revonizer':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="revonizer-quantity">レボナイザーの希望台数</Label>
                <Input
                  id="revonizer-quantity"
                  type="number"
                  min="0"
                  value={totalRevonizerQuantity}
                  onChange={(e) => setTotalRevonizerQuantity(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  現在の合計台数: {totalRevonizerQuantity}台
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">プランの自動計算結果：</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-muted/50 p-2 rounded">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <span>標準プラン（1台目）</span>
                    </div>
                    <span>{calculatedQuantities.single}台</span>
                  </div>
                  <div className="flex items-center justify-between bg-muted/50 p-2 rounded">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <span>2-4台目用プラン</span>
                    </div>
                    <span>{calculatedQuantities.medium}台</span>
                  </div>
                  <div className="flex items-center justify-between bg-muted/50 p-2 rounded">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <span>5台目以降用プラン</span>
                    </div>
                    <span>{calculatedQuantities.bulk}台</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={onClose} variant="outline">
                キャンセル
              </Button>
              <Button onClick={() => setCurrentStep('other_items')}>
                次へ
              </Button>
            </div>
          </div>
        );

      case 'other_items':
        return (
          <div className="space-y-6">
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
                  <div key={item.subscription_item_id} className="space-y-2">
                    <Label htmlFor={item.subscription_item_id}>
                      {item.product.name}
                    </Label>
                    <Input
                      id={item.subscription_item_id}
                      type="number"
                      min="0"
                      value={quantities[item.subscription_item_id] || 0}
                      onChange={(e) => handleQuantityChange(item.subscription_item_id, Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCurrentStep('revonizer')}>
                戻る
              </Button>
              <Button onClick={() => setCurrentStep('confirm')}>
                内容を確認
              </Button>
            </div>
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

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCurrentStep('other_items')}>
                戻る
              </Button>
              <Button onClick={() => {
                onConfirm(quantities);
                onClose();
              }}>
                確定する
              </Button>
            </div>
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
          <DialogDescription>
            {currentStep === 'revonizer' && "希望するレボナイザーの合計台数を入力してください"}
            {currentStep === 'other_items' && "レボナイザー以外の商品の数量を変更できます"}
            {currentStep === 'confirm' && "変更内容を確認してください"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {renderStepContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}