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
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface CreateSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  onSuccess: () => Promise<void>;
}

export function CreateSubscriptionModalContent({
  isOpen,
  onClose,
  customerId,
  onSuccess,
}: CreateSubscriptionModalProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      // レボナイザー商品の数量を自動計算
      const quantities = calculateRevonizerQuantities(quantity);

      // 数量が0の商品を除外
      const items = Object.entries(quantities)
        .filter(([_, quantity]) => quantity > 0)
        .map(([priceId, quantity]) => ({
          price: priceId,
          quantity,
        }));

      // サブスクリプションの作成
      const response = await fetch(`/api/stripe/customer/${customerId}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (error) {
      console.error('サブスクリプション作成エラー:', error);
      setError(error instanceof Error ? error.message : "サブスクリプションの作成中にエラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;

    setIsSubmitting(true);
    setError(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
    });

    if (error) {
      setError(error.message || "支払い処理中にエラーが発生しました");
    } else {
      await onSuccess();
      onClose();
    }
    setIsSubmitting(false);
  };

  // 現在の設定での商品内訳を計算
  const quantities = calculateRevonizerQuantities(quantity);
  const nonZeroQuantities = Object.entries(quantities).filter(([_, qty]) => qty > 0);

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
          {!clientSecret ? (
            <>
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
                  {nonZeroQuantities.map(([priceId, qty]) => {
                    const product = Object.values(REVONIZER_PRODUCTS).find(p => p.priceId === priceId);
                    return product && (
                      <p key={priceId}>{product.name}: {qty}台</p>
                    );
                  })}
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
                  支払い方法を設定
                </Button>
              </div>
            </>
          ) : (
            <form onSubmit={handlePaymentSubmit}>
              <PaymentElement />
              {error && (
                <p className="text-sm text-red-500 mt-4">{error}</p>
              )}
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !stripe || !elements}
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  支払いを確定
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CreateSubscriptionModal(props: CreateSubscriptionModalProps) {
  return (
    <Elements stripe={stripePromise}>
      <CreateSubscriptionModalContent {...props} />
    </Elements>
  );
}