import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import { CreditCard, ArrowLeft, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

export default function BillingSettingsPage() {
  const [, setLocation] = useLocation();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
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

  return (
    <AppLayout>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(-1)}
            className="hover:bg-primary/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold">支払い設定</h1>
        </div>

        <motion.div variants={item}>
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
            <CardContent className="space-y-6">
              {isSubscriptionPayment && subscription && (
                <Collapsible
                  open={isDetailsOpen}
                  onOpenChange={setIsDetailsOpen}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">現在のサブスクリプション情報</h3>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-9 p-0">
                        {isDetailsOpen ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className="space-y-2">
                    {subscription.items.map((item) => (
                      <div key={item.subscription_item_id} className="flex justify-between items-center p-3 bg-primary/5 rounded-lg text-sm">
                        <div className="flex-1">
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-muted-foreground text-xs">
                            数量: {item.quantity}
                          </p>
                        </div>
                        <p className="font-medium">
                          {item.amount?.toLocaleString()} {item.currency.toUpperCase()}
                        </p>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

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
                    onComplete={() => setLocation(-1)}
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