import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { calculateRevonizerQuantities } from "@/lib/revonizerCalculation";
import { REVONIZER_PRODUCTS } from "@/lib/revonizerProducts";

interface CreateSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  onSuccess: () => Promise<void>;
}

export function CreateSubscriptionModal({
  isOpen,
  onClose,
  customerId,
  onSuccess,
}: CreateSubscriptionModalProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      // レボナイザー商品の数量を自動計算
      const quantities = calculateRevonizerQuantities(quantity);

      // サブスクリプションの作成
      const response = await fetch(`/api/stripe/customer/${customerId}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: Object.entries(quantities).map(([priceId, quantity]) => ({
            price: priceId,
            quantity,
          })),
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await onSuccess();
      onClose();
    } catch (error) {
      console.error('サブスクリプション作成エラー:', error);
      setError(error instanceof Error ? error.message : "サブスクリプションの作成中にエラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 現在の設定での商品内訳を計算
  const quantities = calculateRevonizerQuantities(quantity);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>新しいサブスクリプション</DialogTitle>
          <DialogDescription>
            レボナイザーの利用台数を選択してください
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">利用台数</label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">内訳</h3>
            <div className="space-y-2 pl-4 text-sm text-muted-foreground">
              {quantities[REVONIZER_PRODUCTS.FIRST_UNIT.priceId] > 0 && (
                <p>{REVONIZER_PRODUCTS.FIRST_UNIT.name}: {quantities[REVONIZER_PRODUCTS.FIRST_UNIT.priceId]}台</p>
              )}
              {quantities[REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId] > 0 && (
                <p>{REVONIZER_PRODUCTS.SECOND_TO_FOURTH.name}: {quantities[REVONIZER_PRODUCTS.SECOND_TO_FOURTH.priceId]}台</p>
              )}
              {quantities[REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId] > 0 && (
                <p>{REVONIZER_PRODUCTS.FIFTH_AND_MORE.name}: {quantities[REVONIZER_PRODUCTS.FIFTH_AND_MORE.priceId]}台</p>
              )}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              サブスクリプションを作成
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
