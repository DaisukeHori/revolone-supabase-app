import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { 
  AlertCircle, CreditCard, Calendar, Package, ArrowLeft, Clock, 
  Receipt, History, Settings, CreditCard as CardIcon, RefreshCw,
  CheckCircle, Ban
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

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

function getStatusBadgeColor(status: string) {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'trialing':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'past_due':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'canceled':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function formatStatus(status: string) {
  switch (status) {
    case 'active':
      return '有効';
    case 'trialing':
      return 'トライアル中';
    case 'past_due':
      return '支払い期限超過';
    case 'canceled':
      return 'キャンセル済み';
    default:
      return status;
  }
}

function formatCardBrand(brand: string) {
  switch (brand.toLowerCase()) {
    case 'visa':
      return 'VISA';
    case 'mastercard':
      return 'Mastercard';
    case 'amex':
      return 'American Express';
    case 'jcb':
      return 'JCB';
    default:
      return brand;
  }
}

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

  const isTrialing = subscription.trial_end && subscription.trial_end > Date.now() / 1000;

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

        {/* メインの情報カード */}
        <Card className="bg-background/95 backdrop-blur-sm border-primary/10">
          <CardHeader>
            <div className="flex items-center justify-between">
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
              <Badge className={`${getStatusBadgeColor(subscription.status)} px-3 py-1`}>
                {formatStatus(subscription.status)}
              </Badge>
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

            {/* プラン詳細 */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">プラン詳細</h3>
              <div className="grid gap-6 md:grid-cols-2">
                {subscription.plan?.amount && (
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">料金</p>
                      <p className="text-lg font-medium">
                        {subscription.plan.amount.toLocaleString()} {subscription.plan.currency.toUpperCase()}
                        <span className="text-sm text-muted-foreground"> / {subscription.plan.interval}</span>
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">次回更新日</p>
                    <p className="text-lg font-medium">
                      {new Date(subscription.current_period_end * 1000).toLocaleDateString("ja-JP", {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {isTrialing && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">トライアル期間</p>
                      <div>
                        <p className="text-lg font-medium">
                          {new Date(subscription.trial_end! * 1000).toLocaleDateString("ja-JP", {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}まで
                        </p>
                        <p className="text-sm text-muted-foreground">
                          開始日: {new Date(subscription.trial_start! * 1000).toLocaleDateString("ja-JP")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Receipt className="h-5 w-5 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">次回請求額</p>
                    <p className="text-lg font-medium">
                      {subscription.plan?.amount
                        ? `${subscription.plan.amount.toLocaleString()} ${subscription.plan.currency.toUpperCase()}`
                        : '未定'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* 支払い方法 */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">支払い方法</h3>
              <div className="flex items-start gap-3">
                <CardIcon className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                  {subscription.default_payment_method?.card ? (
                    <>
                      <p className="text-lg font-medium">
                        {formatCardBrand(subscription.default_payment_method.card.brand)}
                        **** {subscription.default_payment_method.card.last4}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        有効期限: {subscription.default_payment_method.card.exp_month}/{subscription.default_payment_method.card.exp_year}
                      </p>
                    </>
                  ) : (
                    <p className="text-lg">支払い方法が設定されていません</p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* 自動更新設定 */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">自動更新設定</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <RefreshCw className="h-5 w-5 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-lg font-medium">自動更新</p>
                    <p className="text-sm text-muted-foreground">
                      {subscription.cancel_at_period_end
                        ? '次回更新日で自動更新を停止します'
                        : '自動更新が有効です'}
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={!subscription.cancel_at_period_end}
                  // onCheckedChange={handleAutoRenewalToggle} // TODO: 自動更新の切り替え機能を実装
                />
              </div>
            </div>

            <Separator />

            {/* アクション */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-medium text-muted-foreground">アクション</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setLocation("/settings")}
                >
                  <Settings className="h-4 w-4" />
                  支払い設定を変更
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                >
                  <History className="h-4 w-4" />
                  支払い履歴を表示
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2 text-blue-600 hover:text-blue-600 hover:bg-blue-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  プランを変更
                </Button>
                {subscription.status === 'active' && !subscription.cancel_at_period_end && (
                  <Button
                    variant="outline"
                    className="w-full gap-2 text-red-600 hover:text-red-600 hover:bg-red-50"
                  >
                    <Ban className="h-4 w-4" />
                    解約する
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 支払い履歴 */}
        <Card className="bg-background/95 backdrop-blur-sm border-primary/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-3 rounded-lg">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">支払い履歴</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground text-center py-8">
              支払い履歴は実装中です
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}