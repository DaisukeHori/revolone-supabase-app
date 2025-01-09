import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Background } from "@/components/ui/background";
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";

type StripeCustomerData = {
  customer: {
    id: string;
    name: string | null;
    email: string;
    created: number;
    currency: string | null;
  };
  subscriptions: Array<{
    id: string;
    status: string;
    current_period_end: number;
    plan: {
      amount: number;
      currency: string;
      interval: string;
      product: {
        name: string;
        description: string | null;
      };
    };
  }>;
};

export default function ProfilePage() {
  const { user, isLoading: isUserLoading, logout } = useUser();
  const [, setLocation] = useLocation();

  const { data: stripeData, isLoading: isStripeLoading, error: stripeError } = useQuery<StripeCustomerData>({
    queryKey: ['/api/stripe/customer'],
    enabled: !!user, // ユーザーがログインしている場合のみクエリを実行
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Background />
      <Card className="w-full max-w-md bg-background/95 backdrop-blur-sm border-primary/10">
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

          {stripeError ? (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>
                サブスクリプション情報の取得に失敗しました
              </AlertDescription>
            </Alert>
          ) : stripeData ? (
            <div className="space-y-4 pt-4 border-t border-primary/10">
              <h3 className="text-lg font-medium">サブスクリプション情報</h3>
              {stripeData.subscriptions.length > 0 ? (
                stripeData.subscriptions.map(subscription => (
                  <div key={subscription.id} className="space-y-2 bg-primary/5 p-4 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{subscription.plan.product.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {subscription.plan.product.description}
                        </p>
                      </div>
                      <span className="text-sm px-2 py-1 rounded-full bg-primary/10">
                        {subscription.status}
                      </span>
                    </div>
                    <div className="text-sm">
                      <p>料金: {subscription.plan.amount / 100} {subscription.plan.currency.toUpperCase()} / {subscription.plan.interval}</p>
                      <p>次回更新日: {new Date(subscription.current_period_end * 1000).toLocaleDateString("ja-JP")}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">アクティブなサブスクリプションはありません</p>
              )}
            </div>
          ) : null}

          <div className="pt-4 space-y-2">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}