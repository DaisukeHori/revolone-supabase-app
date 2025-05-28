import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import { CreditCard, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

export default function StoreServicesPage() {
  const { id: storeId } = useParams();
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

  const currentStore = stripeData?.find((customer: any) => customer.customer.id === storeId);

  return (
    <AppLayout>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {error ? (
          <motion.div variants={item}>
            <Alert variant="destructive">
              <AlertDescription>
                サービス情報の取得に失敗しました
              </AlertDescription>
            </Alert>
          </motion.div>
        ) : isLoading ? (
          <motion.div variants={item}>
            <Card className="bg-white shadow-xl border-0 rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl sm:text-2xl text-gray-800">契約中のサービス</CardTitle>
                    <p className="text-gray-600 text-sm sm:text-base">現在ご利用中のサービス一覧</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
                <p className="text-gray-500 text-sm">サービス情報を読み込み中...</p>
              </CardContent>
            </Card>
          </motion.div>
        ) : currentStore ? (
          <motion.div variants={item}>
            <Card className="bg-white shadow-xl border-0 rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl sm:text-2xl text-gray-800">契約中のサービス</CardTitle>
                    <p className="text-gray-600 text-sm sm:text-base">現在ご利用中のサービス一覧</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {currentStore.subscriptions.length > 0 ? (
                  <div className="space-y-6">
                    {currentStore.subscriptions.map((subscription) => (
                      <div key={subscription.id} className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-6">
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold text-gray-800">
                              サブスクリプション ID: {subscription.id}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              subscription.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {subscription.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            次回更新: {new Date(subscription.current_period_end * 1000).toLocaleDateString("ja-JP")}
                          </p>
                        </div>
                        
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-700">サービス詳細</h4>
                          <div className="grid gap-3">
                            {subscription.items.map((item) => (
                              <div key={item.subscription_item_id} className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h5 className="font-medium text-gray-800">{item.product.name}</h5>
                                    {item.product.description && (
                                      <p className="text-sm text-gray-600 mt-1">{item.product.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                      <span>数量: {item.quantity}</span>
                                      <span>間隔: {item.interval === 'month' ? '月額' : '年額'}</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-lg font-semibold text-gray-800">
                                      ¥{(item.amount || 0).toLocaleString()}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      /{item.interval === 'month' ? '月' : '年'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      契約中のサービスがありません
                    </h3>
                    <p className="text-gray-500">
                      現在ご利用中のサービスはございません
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={item}>
            <Alert>
              <AlertDescription>
                店舗情報が見つかりませんでした
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </motion.div>
    </AppLayout>
  );
}