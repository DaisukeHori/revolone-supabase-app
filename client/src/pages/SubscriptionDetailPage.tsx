import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CreditCard, Calendar, Package, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

type StripeSubscription = {
  id: string;
  status: string;
  current_period_end: number;
  plan: {
    amount: number | null;
    currency: string;
    interval: string;
    product: {
      name: string;
      description: string | null;
    };
  };
};

type StripeCustomerData = {
  customer: {
    id: string;
    name: string | null;
    email: string;
    created: number;
    metadata: Record<string, string>;
  };
  subscriptions: StripeSubscription[];
}[];

export default function SubscriptionDetailPage() {
  const [, setLocation] = useLocation();
  const subscriptionId = window.location.pathname.split("/").pop();
  const { data: stripeData, isLoading, error } = useQuery<StripeCustomerData>({
    queryKey: ['/api/stripe/customer'],
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (error || !stripeData) {
    return (
      <AppLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            サブスクリプション情報の取得に失敗しました
          </AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  const subscription = stripeData
    .flatMap(data => data.subscriptions)
    .find(sub => sub.id === subscriptionId);

  if (!subscription) {
    return (
      <AppLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            指定されたサブスクリプションが見つかりません
          </AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  const customer = stripeData.find(data =>
    data.subscriptions.some(sub => sub.id === subscriptionId)
  )?.customer;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            className="hover:bg-primary/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold">サブスクリプション詳細</h1>
        </div>

        <Card className="bg-background/95 backdrop-blur-sm border-primary/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-3 rounded-lg">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">
                  {subscription.plan?.product?.name || 'サブスクリプション'}
                </CardTitle>
                {subscription.plan?.product?.description && (
                  <CardDescription>
                    {subscription.plan.product.description}
                  </CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {customer && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">契約情報</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">契約者名</p>
                    <p className="text-lg">{customer.metadata?.サロン名 || customer.name || '未設定'}</p>
                  </div>
                  {customer.metadata?.代理店名 && (
                    <div>
                      <p className="text-sm text-muted-foreground">代理店</p>
                      <p className="text-lg">{customer.metadata.代理店名}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">プラン詳細</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {subscription.plan?.amount && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">料金</p>
                      <p className="text-lg">
                        {subscription.plan.amount / 100} {subscription.plan.currency.toUpperCase()} / {subscription.plan.interval}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">次回更新日</p>
                    <p className="text-lg">
                      {new Date(subscription.current_period_end * 1000).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
