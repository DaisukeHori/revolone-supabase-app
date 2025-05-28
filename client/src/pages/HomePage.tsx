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
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  おかえりなさい、{user?.username}さん
                </h1>
                <p className="text-blue-100 text-lg">
                  {new Date().toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    weekday: "long"
                  })}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl font-bold">{stripeData?.length || 0}</div>
                <div className="text-blue-100">総店舗数</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl font-bold">
                  {stripeData?.reduce((acc, customer) => acc + customer.subscriptions.length, 0) || 0}
                </div>
                <div className="text-blue-100">アクティブな契約</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl font-bold">
                  {stripeData?.reduce((acc, customer) => 
                    acc + customer.subscriptions.filter(sub => sub.status === 'active').length, 0) || 0}
                </div>
                <div className="text-blue-100">稼働中のサービス</div>
              </div>
            </div>
          </div>
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
            <Card className="bg-white shadow-xl border-0 rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl text-slate-800">店舗一覧</CardTitle>
                    <p className="text-slate-600">管理中の店舗とサービス状況</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {stripeData.map((customerData) => (
                  <motion.div
                    key={customerData.customer.id}
                    className="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-6 space-y-4 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all duration-200"
                    whileHover={{ scale: 1.01, y: -2 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    onClick={() => {
                      setLocation(`/store/${customerData.customer.id}`);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold text-slate-800">
                          {customerData.customer.metadata?.サロン名 || customerData.customer.name || '店舗名未設定'}
                        </h3>
                        {customerData.customer.metadata?.代理店名 && (
                          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                            <Building2 className="h-3 w-3" />
                            代理店: {customerData.customer.metadata.代理店名}
                          </div>
                        )}
                        <p className="text-sm text-slate-500 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          登録日: {new Date(customerData.customer.created * 1000).toLocaleDateString("ja-JP")}
                        </p>
                      </div>
                    </div>
                    {customerData.subscriptions.length > 0 && (
                      <div className="grid gap-4 pt-4 border-t border-slate-200">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-blue-600" />
                            <p className="text-sm font-medium text-slate-700">契約中のサービス</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {customerData.subscriptions.flatMap(subscription =>
                              subscription.items.map(item => (
                                <div
                                  key={item.subscription_item_id}
                                  className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm"
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
          <Card className="bg-white shadow-xl border-0 rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-green-50 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-slate-800">最近のアクティビティ</CardTitle>
                  <p className="text-slate-600">システムの活動状況</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-500 text-lg">
                アクティビティはまだありません
              </p>
              <p className="text-sm text-slate-400 mt-2">
                新しい活動が発生すると、ここに表示されます
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}