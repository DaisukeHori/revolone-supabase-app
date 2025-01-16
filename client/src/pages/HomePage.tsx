import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import { useUser } from "@/hooks/use-user";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Building2, Clock, Activity } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation } from "wouter";

type StripeSubscription = {
  id: string;
  status: string;
  current_period_end: number;
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
    created: number;
    metadata: Record<string, string>;
  };
  subscriptions: StripeSubscription[];
}[];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function HomePage() {
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const { data: stripeData, isLoading, error } = useQuery({
    queryKey: ['stripe-customer'],
    queryFn: async () => {
      const response = await fetch('/api/stripe/customer', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch customer data');
      }
      return response.json() as Promise<StripeCustomerData>;
    }
  });

  return (
    <AppLayout>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        <motion.div variants={item}>
          <Card className="bg-background/95 backdrop-blur-sm border-primary/10">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">
                    ようこそ、{user?.username}さん
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    今日は{new Date().toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      weekday: "long"
                    })}です
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </motion.div>

        {error ? (
          <motion.div variants={item}>
            <Alert variant="destructive">
              <AlertDescription>
                店舗情報の取得に失敗しました
              </AlertDescription>
            </Alert>
          </motion.div>
        ) : stripeData && stripeData.length > 0 ? (
          <motion.div variants={item}>
            <Card className="bg-background/95 backdrop-blur-sm border-primary/10">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">店舗一覧</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {stripeData.map((customerData) => (
                  <motion.div
                    key={customerData.customer.id}
                    className="bg-primary/5 rounded-lg p-6 space-y-4 cursor-pointer hover:bg-primary/10 transition-colors"
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    onClick={() => {
                      setLocation(`/store/${customerData.customer.id}`);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="text-xl font-semibold">
                          {customerData.customer.metadata?.サロン名 || customerData.customer.name || '店舗名未設定'}
                        </h3>
                        {customerData.customer.metadata?.代理店名 && (
                          <p className="text-sm text-muted-foreground">
                            代理店: {customerData.customer.metadata.代理店名}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          登録日: {new Date(customerData.customer.created * 1000).toLocaleDateString("ja-JP")}
                        </p>
                      </div>
                    </div>
                    {customerData.subscriptions.length > 0 && (
                      <div className="grid gap-4 pt-4 border-t border-primary/10">
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">契約中のサービス</p>
                          <div className="flex flex-wrap gap-2">
                            {customerData.subscriptions.flatMap(subscription =>
                              subscription.items.map(item => (
                                <div
                                  key={item.subscription_item_id}
                                  className="bg-primary/10 px-3 py-1 rounded-full text-sm text-primary"
                                >
                                  {item.product.name} {item.quantity > 1 ? `× ${item.quantity}` : ''}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        ) : null}

        <motion.div variants={item}>
          <Card className="bg-background/95 backdrop-blur-sm border-primary/10">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">最近のアクティビティ</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                アクティビティはまだありません
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}