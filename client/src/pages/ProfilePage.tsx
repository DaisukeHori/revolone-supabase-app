import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Background } from "@/components/ui/background";
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

export default function ProfilePage() {
  const { user, isLoading: isUserLoading, logout } = useUser();
  const [, setLocation] = useLocation();

  const { data: stripeData, isLoading: isStripeLoading, error: stripeError } = useQuery<StripeCustomerData>({
    queryKey: ['/api/stripe/customer'],
    enabled: !!user,
  });

  if (isUserLoading || isStripeLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  // デバッグ用のデータ構造チェック
  console.log('[Debug] Current stripeData:', stripeData);
  if (stripeData) {
    console.log('[Debug] Customer count:', stripeData.length);
  }

  return (
    <div className="min-h-screen p-4 space-y-4">
      <Background />

      {/* ユーザープロフィール */}
      <Card className="w-full max-w-2xl mx-auto bg-background/95 backdrop-blur-sm border-primary/10">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center font-medium">
            プロフィール
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">ユーザー名</p>
            <p className="text-foreground font-medium">{user.username}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">メールアドレス</p>
            <p className="text-foreground font-medium">{user.email}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">登録日</p>
            <p className="text-foreground font-medium">
              {new Date(user.createdAt).toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric"
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stripe顧客情報とサブスクリプション */}
      {stripeError ? (
        <Card className="w-full max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertDescription>
                サブスクリプション情報の取得に失敗しました
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      ) : stripeData && stripeData.length > 0 ? (
        <div className="space-y-4">
          {stripeData.map((customerData) => (
            <Card key={customerData.customer.id} className="w-full max-w-2xl mx-auto bg-background/95 backdrop-blur-sm border-primary/10">
              <CardHeader className="space-y-1">
                <CardTitle className="text-xl font-medium">
                  {customerData.customer.metadata?.サロン名 || customerData.customer.name || '顧客アカウント'}
                </CardTitle>
                {customerData.customer.metadata?.代理店名 && (
                  <p className="text-sm text-muted-foreground">
                    代理店: {customerData.customer.metadata.代理店名}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">サブスクリプション情報</h3>
                  {customerData.subscriptions.length > 0 ? (
                    customerData.subscriptions.map(subscription => {
                      return (
                        <div key={subscription.id} className="space-y-2 bg-primary/5 p-4 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">
                                {subscription.plan?.product?.name || 'サブスクリプション'}
                              </h4>
                              {subscription.plan?.product?.description && (
                                <p className="text-sm text-muted-foreground">
                                  {subscription.plan.product.description}
                                </p>
                              )}
                            </div>
                            <span className="text-sm px-2 py-1 rounded-full bg-primary/10">
                              {subscription.status === 'active' ? '有効' : subscription.status}
                            </span>
                          </div>
                          {subscription.plan?.amount && (
                            <div className="text-sm">
                              <p>料金: {subscription.plan.amount / 100} {subscription.plan.currency.toUpperCase()} / {subscription.plan.interval}</p>
                              <p>次回更新日: {new Date(subscription.current_period_end * 1000).toLocaleDateString("ja-JP")}</p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-muted-foreground">アクティブなサブスクリプションはありません</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {/* アクションボタン */}
      <Card className="w-full max-w-2xl mx-auto bg-background/95 backdrop-blur-sm border-primary/10">
        <CardContent className="pt-6 space-y-2">
          <Button
            onClick={() => setLocation("/edit-profile")}
            className="w-full bg-primary/90 hover:bg-primary transition-colors"
          >
            プロフィールを編集
          </Button>
          <Button
            onClick={() => logout()}
            variant="outline"
            className="w-full border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
          >
            ログアウト
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}