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
  const { data: stripeData, isLoading, error } = useQuery<StripeCustomerData>({
    queryKey: ['/api/stripe/customer'],
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
                サブスクリプション情報の取得に失敗しました
              </AlertDescription>
            </Alert>
          </motion.div>
        ) : stripeData && stripeData.length > 0 ? (
          stripeData.map((customerData) => (
            <motion.div key={customerData.customer.id} variants={item}>
              <Card className="bg-background/95 backdrop-blur-sm border-primary/10">
                <CardHeader className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">
                        {customerData.customer.metadata?.サロン名 || customerData.customer.name || '顧客アカウント'}
                      </CardTitle>
                      {customerData.customer.metadata?.代理店名 && (
                        <p className="text-sm text-muted-foreground">
                          代理店: {customerData.customer.metadata.代理店名}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {customerData.subscriptions.map(subscription => (
                    <motion.div
                      key={subscription.id}
                      className="bg-primary/5 rounded-lg p-6 space-y-4 cursor-pointer hover:bg-primary/10 transition-colors"
                      whileHover={{ scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      onClick={() => setLocation(`/subscription/${subscription.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-primary" />
                            <h4 className="font-medium text-lg">
                              {subscription.plan?.product?.name || 'サブスクリプション'}
                            </h4>
                          </div>
                          {subscription.plan?.product?.description && (
                            <p className="text-sm text-muted-foreground">
                              {subscription.plan.product.description}
                            </p>
                          )}
                        </div>
                        <span className="text-sm px-3 py-1 rounded-full bg-primary/10 text-primary">
                          {subscription.status === 'active' ? '有効' : subscription.status}
                        </span>
                      </div>
                      {subscription.plan?.amount && (
                        <div className="grid grid-cols-2 gap-4 text-sm border-t border-primary/10 pt-4">
                          <div>
                            <div className="text-muted-foreground mb-1">料金</div>
                            <div className="font-medium">
                              {subscription.plan.amount / 100} {subscription.plan.currency.toUpperCase()} / {subscription.plan.interval}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground mb-1">次回更新日</div>
                            <div className="font-medium">
                              {new Date(subscription.current_period_end * 1000).toLocaleDateString("ja-JP")}
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          ))
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