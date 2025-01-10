import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import { CreditCard, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

// フレーマーモーションのアニメーション設定
const animations = {
  container: {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  },
  item: {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }
};

type StripeSubscription = {
  id: string;
  status: string;
  current_period_end: number;
  trial_end: number | null;
  trial_start: number | null;
  cancel_at_period_end: boolean;
  default_payment_method: {
    card: {
      brand: string;
      last4: string;
      exp_month: number;
      exp_year: number;
    };
  } | null;
  items: {
    subscription_item_id: string;
    amount: number | null;
    currency: string;
    interval: string;
    quantity: number;
    product: {
      name: string;
      description: string | null;
    };
  }[];
};

type StripeCustomerData = {
  customer: {
    id: string;
    name: string | null;
    email: string;
    metadata: Record<string, string>;
  };
  subscriptions: StripeSubscription[];
  payment_history: StripePaymentHistory[];
};

function PaymentForm({ onComplete, isSubscriptionPayment = false }: { onComplete: () => void, isSubscriptionPayment?: boolean }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
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

      const subscriptionId = isSubscriptionPayment ? window.location.pathname.split("/subscription/")[1] : undefined;
      console.log('Setting up payment method for subscription:', subscriptionId);

      const response = await fetch('/api/stripe/set-default-payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethodId: setupIntent.payment_method,
          subscriptionId
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text);
      }

      toast({
        description: "支払い方法を更新しました",
      });

      onComplete();
    } catch (error) {
      console.error('支払い方法の更新エラー:', error);
      setError(error instanceof Error ? error.message : "予期せぬエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <PaymentElement />

      <Button
        type="submit"
        disabled={!stripe || isLoading}
        className="w-full"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <CreditCard className="h-4 w-4 mr-2" />
        )}
        支払い方法を更新
      </Button>
    </form>
  );
}

function getPageTitle(subscription: StripeSubscription | undefined): string {
  if (!subscription || subscription.items.length === 0) {
    return "支払い設定";
  }

  const firstProduct = subscription.items[0].product;
  const remainingItems = subscription.items.length - 1;

  if (remainingItems === 0) {
    return `${firstProduct.name}の支払い設定`;
  }

  return `${firstProduct.name}およびその他${remainingItems}個の商品の支払い設定`;
}

export default function BillingSettingsPage() {
  const [location, setLocation] = useLocation();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isSubscriptionPayment = window.location.pathname.includes("/subscription/");
  const subscriptionId = isSubscriptionPayment ? window.location.pathname.split("/subscription/")[1] : undefined;

  const { data: stripeData, isLoading: isLoadingStripeData } = useQuery<StripeCustomerData[]>({
    queryKey: ['/api/stripe/customer'],
    staleTime: 0,
    retry: false,
  });

  // データ取得のデバッグ
  console.log('Current path:', window.location.pathname);
  console.log('Is subscription payment:', isSubscriptionPayment);
  console.log('Subscription ID:', subscriptionId);
  console.log('Stripe data:', stripeData);

  const customerData = stripeData?.[0];
  console.log('Customer data:', customerData);

  const subscription = isSubscriptionPayment && customerData?.subscriptions
    ? customerData.subscriptions.find(sub => sub.id === subscriptionId)
    : undefined;

  console.log('Subscription:', subscription);

  useEffect(() => {
    async function initializeStripe() {
      try {
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
        setPublishableKey(data.publishableKey);
        setStripePromise(loadStripe(data.publishableKey));
      } catch (error) {
        console.error('Stripe初期化エラー:', error);
        setError(error instanceof Error ? error.message : "支払い方法の設定準備中にエラーが発生しました");
      }
    }

    initializeStripe();
  }, []);

  if (isLoadingStripeData) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  if (isSubscriptionPayment && !subscription) {
    return (
      <AppLayout>
        <Alert variant="destructive">
          <AlertDescription>
            指定されたサブスクリプションが見つかりません
          </AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  const handleBack = () => {
    window.history.back();
  };

  return (
    <AppLayout>
      <motion.div
        variants={animations.container}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="hover:bg-primary/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold">{getPageTitle(subscription)}</h1>
        </div>

        <motion.div variants={animations.item}>
          <Card className="bg-background/95 backdrop-blur-sm border-primary/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">支払い方法の変更</CardTitle>
                  <CardDescription>
                    {isSubscriptionPayment
                      ? "このサブスクリプション専用の支払い方法を設定します"
                      : "新しいクレジットカードまたはデビットカードを登録します"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {clientSecret && stripePromise ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'stripe',
                    },
                  }}
                >
                  <PaymentForm
                    onComplete={() => handleBack()}
                    isSubscriptionPayment={isSubscriptionPayment}
                  />
                </Elements>
              ) : (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}

type StripePaymentHistory = {
  id: string;
  amount: number;
  currency: string;
  created: number;
  description: string;
};