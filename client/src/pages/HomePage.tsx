import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import { useUser } from "@/hooks/use-user";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Building2, Clock, Loader2, Plus, MoreVertical, Trash2, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { DeleteStoreModal } from "@/components/store/DeleteStoreModal";
import { useQueryClient } from "@tanstack/react-query";

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
  const [showDeleteStoreModal, setShowDeleteStoreModal] = useState(false);
  const [selectedCustomerData, setSelectedCustomerData] = useState<any>(null);
  const [showFirstTimeMessage, setShowFirstTimeMessage] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const queryClient = useQueryClient();


  const { data: stripeData, isLoading, error } = useQuery({
    queryKey: ['stripe-customer'],
    queryFn: async () => {
      const response = await fetch('/api/stripe/customer', {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 404) {
          // 店舗がない場合は null を返す（エラーではない）
          return null;
        }
        throw new Error('Failed to fetch customer data');
      }
      return response.json() as Promise<StripeCustomerData>;
    }
  });

  // 初回ユーザーの自動リダイレクト処理
  useEffect(() => {
    // すでに初期化済みの場合は何もしない
    if (hasInitialized) {
      return;
    }
    
    // ユーザー情報が読み込まれ、初回設定が完了していない場合のみリダイレクト
    if (user && !user.hasCompletedSetup && !isLoading && stripeData === null) {
      // 初期化フラグを立てる（二度と実行しない）
      setHasInitialized(true);
      
      // データ取得完了後、店舗がない場合
      setShowFirstTimeMessage(true);
      
      // 2秒後に初回設定ページへリダイレクト
      const timer = setTimeout(() => {
        setLocation('/stores/new?firstTime=true');
      }, 2000);
      
      // 初回設定フラグを更新（二度と自動表示しないように）
      fetch('/api/mark-setup-complete', {
        method: 'POST',
        credentials: 'include'
      }).then(() => {
        // フラグ更新後にユーザー情報を再取得
        queryClient.invalidateQueries({ queryKey: ['user'] });
      }).catch(error => {
        console.error('初回設定フラグ更新エラー:', error);
      });

      return () => clearTimeout(timer);
    } else if (user && !user.hasCompletedSetup && !isLoading && stripeData !== null) {
      // Stripe顧客が既に存在する場合は、ウィザードを表示せずにフラグだけ更新
      setHasInitialized(true);
      
      fetch('/api/mark-setup-complete', {
        method: 'POST',
        credentials: 'include'
      }).then(() => {
        // フラグ更新後にユーザー情報を再取得
        queryClient.invalidateQueries({ queryKey: ['user'] });
      }).catch(error => {
        console.error('初回設定フラグ更新エラー:', error);
      });
    }
  }, [user, isLoading, stripeData, setLocation, hasInitialized, queryClient]);

  return (
    <AppLayout>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        <motion.div variants={item}>
          <div className="bg-modern-gradient rounded-xl p-8 text-white shadow-lg">
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                  おかえりなさい、{user?.username}さん
                </h1>
                <p className="text-white/90 text-base sm:text-lg">
                  {new Date().toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    weekday: "long"
                  })}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {error ? (
          <motion.div variants={item}>
            <Alert variant="destructive">
              <AlertDescription>
                サーバーとの通信に失敗しました。しばらく時間を置いてから再度お試しください。
              </AlertDescription>
            </Alert>
          </motion.div>
        ) : isLoading ? (
          <motion.div variants={item}>
            <Card className="bg-white shadow-sm border border-slate-200 rounded-lg overflow-hidden modern-card-hover">
              <CardHeader className="bg-flat-accent pb-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Building2 className="h-6 w-6 text-orange-primary" />
                  </div>
                  <div className="text-center sm:text-left">
                    <CardTitle className="text-xl sm:text-2xl text-slate-800">店舗一覧</CardTitle>
                    <p className="text-slate-600 text-sm sm:text-base">管理中の店舗とサービス状況</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-orange-primary mb-4" />
                <p className="text-slate-500 text-sm">店舗情報を読み込み中...</p>
              </CardContent>
            </Card>
          </motion.div>
        ) : stripeData === null || (Array.isArray(stripeData) && stripeData.length === 0) ? (
          showFirstTimeMessage ? (
            // 初回設定メッセージ表示
            <motion.div variants={item}>
              <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 shadow-lg border border-orange-200 rounded-xl overflow-hidden">
                <CardContent className="flex flex-col items-center justify-center p-16">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, type: "spring" }}
                  >
                    <div className="w-24 h-24 bg-gradient-to-br from-orange-primary to-yellow-green rounded-full flex items-center justify-center mb-6 shadow-lg">
                      <Sparkles className="h-12 w-12 text-white" />
                    </div>
                  </motion.div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-3">
                    ようこそ！初回設定を開始します
                  </h2>
                  <p className="text-slate-600 text-center mb-6 max-w-md">
                    Revol Oneをご利用いただくために、まず最初の店舗情報を登録していただきます
                  </p>
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-orange-primary" />
                    <span className="text-slate-600">自動的に設定画面へ移動します...</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            // 通常の店舗なし表示（手動で店舗追加する場合）
            <motion.div variants={item}>
              <Card className="bg-white shadow-sm border border-slate-200 rounded-lg overflow-hidden modern-card-hover">
                <CardHeader className="bg-flat-accent pb-6">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Building2 className="h-6 w-6 text-orange-primary" />
                    </div>
                    <div className="text-center sm:text-left flex-1">
                      <CardTitle className="text-xl sm:text-2xl text-slate-800">店舗一覧</CardTitle>
                      <p className="text-slate-600 text-sm sm:text-base">まだ店舗が登録されていません</p>
                    </div>
                    <Button 
                      onClick={() => setLocation('/stores/new')}
                      className="bg-orange-primary hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      最初の店舗を登録
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-12">
                <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-4">
                  <Building2 className="h-10 w-10 text-orange-400" />
                </div>
                <p className="text-slate-600 text-base mb-6">店舗を登録してサービスを開始しましょう</p>
                <Button 
                  onClick={() => setLocation('/stores/new')}
                  className="bg-orange-primary hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  店舗を登録する
                </Button>
              </CardContent>
            </Card>
          </motion.div>
          )
        ) : stripeData && stripeData.length > 0 ? (
          <motion.div variants={item}>
            <Card className="bg-white shadow-xl border-0 rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 pb-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-6 w-6 text-gray-600" />
                  </div>
                  <div className="text-center sm:text-left flex-1">
                    <CardTitle className="text-xl sm:text-2xl text-gray-800">店舗一覧</CardTitle>
                    <p className="text-gray-600 text-sm sm:text-base">管理中の店舗とサービス状況</p>
                  </div>
                  <Button 
                    onClick={() => setLocation('/stores/new')}
                    className="bg-green-secondary hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    新規追加
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6">
                {stripeData.map((customerData) => (
                  <motion.div
                    key={customerData.customer.id}
                    className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4 sm:p-6 space-y-4 cursor-pointer hover:shadow-lg hover:border-gray-400 transition-all duration-200"
                    whileHover={{ scale: 1.01, y: -2 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    onClick={() => {
                      setLocation(`/store/${customerData.customer.id}`);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-800 break-words">
                          {customerData.customer.metadata?.サロン名 || customerData.customer.name || '店舗名未設定'}
                        </h3>
                        {customerData.customer.metadata?.代理店名 && (
                          <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                            <Building2 className="h-3 w-3" />
                            <span className="truncate">代理店: {customerData.customer.metadata.代理店名}</span>
                          </div>
                        )}
                        <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-2">
                          <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span>登録日: {new Date(customerData.customer.created * 1000).toLocaleDateString("ja-JP")}</span>
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem 
                            className="text-red-600 focus:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCustomerData(customerData);
                              setShowDeleteStoreModal(true);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            削除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {customerData.subscriptions.length > 0 && (
                      <div className="grid gap-3 pt-4 border-t border-gray-200">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-gray-600 flex-shrink-0" />
                            <p className="text-xs sm:text-sm font-medium text-gray-700">契約中のサービス</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {customerData.subscriptions.flatMap(subscription =>
                              subscription.items.map(item => (
                                <div
                                  key={item.subscription_item_id}
                                  className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-3 py-1 rounded-lg text-xs sm:text-sm font-medium shadow-sm"
                                >
                                  <span className="truncate">{item.product.name} {item.quantity > 1 ? `× ${item.quantity}` : ''}</span>
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

        {selectedCustomerData && (
          <DeleteStoreModal
            open={showDeleteStoreModal}
            onOpenChange={(open) => {
              setShowDeleteStoreModal(open);
              if (!open) {
                setSelectedCustomerData(null);
              }
            }}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['stripe-customer'] });
              setShowDeleteStoreModal(false);
              setSelectedCustomerData(null);
            }}
            customerData={selectedCustomerData}
          />
        )}
      </motion.div>
    </AppLayout>
  );
}