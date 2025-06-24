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
import { Loader2, ArrowLeft } from "lucide-react";
import { calculateRevonizerQuantities } from "@/lib/revonizerCalculation";
import { REVONIZER_PRODUCTS } from "@/lib/revonizerProducts";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useQuery } from '@tanstack/react-query';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface CreateSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  onSuccess: () => Promise<void>;
}

type Step = 'quantity' | 'payment' | 'confirm';

// 数量選択フォームコンポーネント
function QuantityFormContent({
  onNext,
  quantity,
  setQuantity,
  isSubmitting,
  error,
}: {
  onNext: () => void;
  quantity: number;
  setQuantity: (quantity: number) => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  // 現在の設定での商品内訳を計算
  const quantities = calculateRevonizerQuantities(quantity);
  const nonZeroQuantities = Object.entries(quantities).filter(([_, qty]) => qty > 0);

  return (
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
          onClick={onNext}
          disabled={isSubmitting}
        >
          次へ：支払い方法を設定
        </Button>
      </div>
    </>
  );
}

// 支払いフォームコンポーネント
function PaymentFormContent({
  onBack,
  onNext,
  setClientSecret,
  isSubmitting,
  setIsSubmitting,
  error,
  setError,
  customer,
}: {
  onBack: () => void;
  onNext: () => void;
  setClientSecret: (secret: string | null) => void;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  customer: {
    name: string | null;
    email: string;
  };
}) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSetupPayment = async () => {
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Setup Intentを作成
      const response = await fetch('/api/stripe/setup-intent', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text);
      }

      const data = await response.json();
      setClientSecret(data.clientSecret);
      onNext(); // 確認画面に進む
    } catch (error) {
      console.error('Setup Intent作成エラー:', error);
      setError(error instanceof Error ? error.message : "支払い方法の設定準備中にエラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PaymentElement options={{
        paymentMethodOrder: ['card'],
        defaultValues: {
          billingDetails: {
            name: customer.name || customer.email,
            email: customer.email,
          }
        },
        wallets: {
          applePay: 'auto',
          googlePay: 'auto',
        }
      }} />
      {error && (
        <p className="text-sm text-red-500 mt-4">{error}</p>
      )}
      <div className="flex justify-between gap-2 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          戻る
        </Button>
        <Button
          onClick={handleSetupPayment}
          disabled={isSubmitting || !stripe || !elements}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          確認画面へ
        </Button>
      </div>
    </>
  );
}

// 確認画面コンポーネント
function ConfirmationContent({
  onBack,
  onConfirm,
  customerId,
  quantity,
  clientSecret,
  isSubmitting,
  setIsSubmitting,
  error,
  setError,
  customer,
  onSuccess,
  onClose,
}: {
  onBack: () => void;
  onConfirm: () => void;
  customerId: string;
  quantity: number;
  clientSecret: string;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  customer: {
    name: string | null;
    email: string;
  };
  onSuccess: () => Promise<void>;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const quantities = calculateRevonizerQuantities(quantity);
  const nonZeroQuantities = Object.entries(quantities).filter(([_, qty]) => qty > 0);

  // Fetch prices from Stripe API
  const { data: priceData, isLoading: isPriceLoading, error: priceError } = useQuery({
    queryKey: ['stripe-prices'],
    queryFn: async () => {
      const response = await fetch('/api/stripe/prices', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch prices data');
      }
      return response.json();
    }
  });

  // 合計金額を計算（priceDataから価格を取得）
  const totalAmount = nonZeroQuantities.reduce((total, [priceId, qty]) => {
    const priceInfo = priceData?.find((price: any) => price.id === priceId);
    return total + (priceInfo?.unit_amount || 0) * qty;
  }, 0);

  const handleFinalConfirm = async () => {
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // まず支払い方法を確認
      const { error: setupError, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
      });

      if (setupError) {
        setError(setupError.message || "支払い方法の設定に失敗しました");
        return;
      }

      if (!setupIntent?.payment_method) {
        setError("支払い方法の設定に失敗しました");
        return;
      }

      // 数量が0の商品を除外してアイテムを準備
      const items = nonZeroQuantities.map(([priceId, quantity]) => ({
        price: priceId,
        quantity,
      }));

      // サブスクリプションを作成
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

      // 作成したサブスクリプションの支払い方法を設定
      const setPaymentResponse = await fetch('/api/stripe/set-default-payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethodId: setupIntent.payment_method,
        }),
        credentials: 'include',
      });

      if (!setPaymentResponse.ok) {
        console.warn('支払い方法の設定に失敗しましたが、サブスクリプションは作成されました');
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

  if (isPriceLoading) return <p>Loading prices...</p>;
  if (priceError) return <p>Error loading prices: {priceError.message}</p>;

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">契約内容の確認</h3>

          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex justify-between">
              <span className="font-medium">利用台数:</span>
              <span>{quantity}台</span>
            </div>

            <div className="space-y-2">
              <span className="font-medium">サービス内訳:</span>
              {nonZeroQuantities.map(([priceId, qty]) => {
                const product = Object.values(REVONIZER_PRODUCTS).find(p => p.priceId === priceId);
                const priceInfo = priceData?.find((price: any) => price.id === priceId);
                const unitAmount = priceInfo?.unit_amount || 0;
                return product && priceInfo && (
                  <div key={priceId} className="flex justify-between text-sm pl-4">
                    <span>{product.name}</span>
                    <span>{qty}台 × ¥{unitAmount.toLocaleString()} = ¥{(qty * unitAmount).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>

            <div className="border-t pt-2 flex justify-between font-bold">
              <span>月額合計:</span>
              <span>¥{totalAmount.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">お客様情報</h4>
            <div className="text-sm space-y-1">
              <p><span className="font-medium">お名前:</span> {customer.name || 'なし'}</p>
              <p><span className="font-medium">メールアドレス:</span> {customer.email}</p>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <div className="flex justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isSubmitting}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            戻る
          </Button>
          <Button
            onClick={handleFinalConfirm}
            disabled={isSubmitting || !stripe || !elements}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            新しいサブスクリプション申し込み確定する
          </Button>
        </div>
      </div>
    </>
  );
}

export function CreateSubscriptionModal({
  isOpen,
  onClose,
  customerId,
  onSuccess,
}: CreateSubscriptionModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('quantity');
  const [quantity, setQuantity] = useState<number>(1);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: customerData, isLoading } = useQuery({
    queryKey: ['stripe-customer'],
    queryFn: async () => {
      const response = await fetch('/api/stripe/customer', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch customer data');
      }
      return response.json();
    }
  });

  const customer = customerData?.find((data: any) => data.customer.id === customerId)?.customer;

  // モーダルが閉じられた時にステートをリセット
  const handleClose = () => {
    setCurrentStep('quantity');
    setQuantity(1);
    setClientSecret(null);
    setIsSubmitting(false);
    setError(null);
    onClose();
  };

  const handleNext = () => {
    setError(null);
    if (currentStep === 'quantity') {
      setCurrentStep('payment');
    } else if (currentStep === 'payment') {
      setCurrentStep('confirm');
    }
  };

  const handleBack = () => {
    setError(null);
    if (currentStep === 'payment') {
      setCurrentStep('quantity');
    } else if (currentStep === 'confirm') {
      setCurrentStep('payment');
    }
  };

  if (isLoading) return <p>Loading customer data...</p>;

  const getTitle = () => {
    switch (currentStep) {
      case 'quantity':
        return '新しいサブスクリプション - 利用台数選択';
      case 'payment':
        return '新しいサブスクリプション - 支払い方法設定';
      case 'confirm':
        return '新しいサブスクリプション - 契約内容確認';
      default:
        return '新しいサブスクリプション';
    }
  };

  const getDescription = () => {
    switch (currentStep) {
      case 'quantity':
        return 'レボナイザーの利用台数を選択してください';
      case 'payment':
        return '支払いに使用するクレジットカード情報を入力してください';
      case 'confirm':
        return '契約内容をご確認の上、申し込みを確定してください';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {currentStep === 'quantity' && (
            <QuantityFormContent
              onNext={handleNext}
              quantity={quantity}
              setQuantity={setQuantity}
              isSubmitting={isSubmitting}
              error={error}
            />
          )}

          {currentStep === 'payment' && customer && (
            <Elements stripe={stripePromise} options={{
              mode: 'setup',
              currency: 'jpy',
              appearance: {
                theme: 'stripe',
              },
            }}>
              <PaymentFormContent
                onBack={handleBack}
                onNext={handleNext}
                setClientSecret={setClientSecret}
                isSubmitting={isSubmitting}
                setIsSubmitting={setIsSubmitting}
                error={error}
                setError={setError}
                customer={customer}
              />
            </Elements>
          )}

          {currentStep === 'confirm' && customer && clientSecret && (
            <Elements stripe={stripePromise} options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
              },
            }}>
              <ConfirmationContent
                onBack={handleBack}
                onConfirm={() => {}}
                customerId={customerId}
                quantity={quantity}
                clientSecret={clientSecret}
                isSubmitting={isSubmitting}
                setIsSubmitting={setIsSubmitting}
                error={error}
                setError={setError}
                customer={customer}
                onSuccess={onSuccess}
                onClose={handleClose}
              />
            </Elements>
          )}

          {!customer && currentStep !== 'quantity' && (
            <p>Customer data not found.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}