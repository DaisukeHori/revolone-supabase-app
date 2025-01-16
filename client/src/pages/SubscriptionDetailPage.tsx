import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import {
  CreditCard, Calendar, Package, ArrowLeft,
  RefreshCw, Loader2, Settings, History
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { UpdateQuantityModal } from "@/components/subscription/UpdateQuantityModal";
import { ConfirmUpdateDialog } from "@/components/subscription/ConfirmUpdateDialog";


/* 前半部分は変更なし - 型定義など */

export default function SubscriptionDetailPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const subscriptionId = window.location.pathname.split("/").pop();
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [updatedQuantities, setUpdatedQuantities] = useState<Record<string, number>>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditingStore, setIsEditingStore] = useState(false);

  const { data: stripeData, isLoading, error, refetch } = useQuery({
    queryKey: ['stripe-customer'],
    queryFn: async () => {
      const response = await fetch('/api/stripe/customer', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch customer data');
      }
      return response.json();
    }
  });

  const customerData = stripeData?.find(data =>
    data.subscriptions.some(sub => sub.id === subscriptionId)
  );

  const subscription = customerData?.subscriptions.find(sub => sub.id === subscriptionId);
  const customer = customerData?.customer;

  const handleUpdateStore = async (values: any) => { // Added any type for values
    if (!customer) return;

    try {
      const response = await fetch(`/api/stripe/customer/${customer.id}/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: {
            postal_code: values.postalCode,
            state: values.state,
            city: values.city,
            line1: values.line1,
            line2: values.line2,
            country: 'JP'
          },
          shipping: {
            address: {
              postal_code: values.shippingPostalCode,
              state: values.shippingState,
              city: values.shippingCity,
              line1: values.shippingLine1,
              line2: values.shippingLine2,
              country: 'JP'
            },
            name: customer.name,
            phone: values.phoneNumber
          },
          phone: values.phoneNumber,
          metadata: {
            サロン名: values.name,
          }
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await refetch();
      toast({
        description: "店舗情報を更新しました",
      });
      setIsEditingStore(false);
    } catch (error) {
      console.error('店舗情報更新エラー:', error);
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "店舗情報の更新中にエラーが発生しました",
      });
    }
  };

  const handleAutoRenewalToggle = async () => {
    if (!subscription) return;

    try {
      setIsUpdating(true);
      const response = await fetch(`/api/stripe/subscription/${subscription.id}/auto-renewal`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await refetch();
      toast({
        description: subscription.cancel_at_period_end
          ? "自動更新を有効にしました"
          : "次回更新時に契約は終了します",
      });
    } catch (error) {
      console.error('自動更新設定の変更エラー:', error);
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "自動更新設定の変更中にエラーが発生しました",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (window.confirm('本当にサブスクリプションをキャンセルしますか？')) {
      try {
        // await cancelSubscriptionMutation.mutateAsync(subscription.id);
      } catch (error) {
        console.error('サブスクリプションのキャンセルに失敗:', error);
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0 }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'trialing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'incomplete':
      case 'incomplete_expired':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'canceled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'unpaid':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'trialing':
        return 'トライアル中';
      case 'active':
        return '有効';
      case 'incomplete':
        return '未完了';
      case 'incomplete_expired':
        return '未完了（期限切れ）';
      case 'canceled':
        return 'キャンセル済み';
      case 'unpaid':
        return '未払い';
      default:
        return status;
    }
  };

  const formatCardBrand = (brand: string) => {
    switch (brand) {
      case 'Visa':
        return 'Visa';
      case 'MasterCard':
        return 'MasterCard';
      case 'American Express':
        return 'American Express';
      case 'JCB':
        return 'JCB';
      default:
        return brand;
    }
  };

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
          <AlertDescription>
            サブスクリプション情報の取得に失敗しました
          </AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  if (!subscription || !customer) {
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

  const isTrialing = subscription.trial_end && subscription.trial_end > Date.now() / 1000;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(`/store/${customer.id}`)}
            className="hover:bg-primary/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold">サブスクリプション詳細</h1>
        </div>

        {/* メインのサブスクリプション情報 */}
        <motion.div initial="hidden" animate="visible" variants={item}>
          <Card className="bg-background/95 backdrop-blur-sm border-primary/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">
                    契約内容
                  </CardTitle>
                  {customer?.metadata?.サロン名 && (
                    <CardDescription>
                      {customer.metadata.サロン名}
                    </CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* サブスクリプションステータス */}
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={getStatusBadgeColor(subscription.status)}
                >
                  {formatStatus(subscription.status)}
                </Badge>
                {subscription.cancel_at_period_end && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                    次回更新時に終了
                  </Badge>
                )}
              </div>

              {/* サブスクリプションアイテム一覧 */}
              <div className="space-y-4">
                {subscription.items.map((item) => (
                  <div key={item.subscription_item_id} className="bg-primary/5 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="font-medium">{item.product.name}</p>
                        {item.product.description && (
                          <p className="text-sm text-muted-foreground">
                            {item.product.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CreditCard className="h-4 w-4" />
                          <span>
                            {item.amount?.toLocaleString()} {item.currency.toUpperCase()} / {item.interval}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          数量: {item.quantity}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-between items-center pt-4">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setShowQuantityModal(true)}
                    disabled={isUpdating}
                  >
                    <RefreshCw className="h-4 w-4" />
                    数量を変更
                  </Button>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!subscription.cancel_at_period_end}
                        onCheckedChange={handleAutoRenewalToggle}
                        disabled={isUpdating}
                      />
                      <span className="text-sm flex items-center gap-2">
                        自動更新
                        {isUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive/90"
                      onClick={handleCancelSubscription}
                      disabled={isUpdating}
                    >
                      サブスクリプションを解約
                    </Button>
                  </div>
                </div>
              </div>

              {/* 支払い情報 */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">支払い方法</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>
                      {subscription.default_payment_method ? (
                        `${formatCardBrand(subscription.default_payment_method.card.brand)}
                        **** ${subscription.default_payment_method.card.last4} (
                        ${subscription.default_payment_method.card.exp_month}/
                        ${subscription.default_payment_method.card.exp_year})`
                      ) : (
                        '支払い方法が設定されていません'
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/billing/subscription/${subscription.id}`)}
                      className="gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      変更
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation("/payment-history")}
                      className="gap-2"
                    >
                      <History className="h-4 w-4" />
                      購入履歴
                    </Button>
                  </div>
                </div>
              </div>

              {/* 更新日情報 */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">次回更新日</h3>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(subscription.current_period_end * 1000).toLocaleDateString("ja-JP")}
                  </span>
                </div>
                {isTrialing && subscription.trial_end && (
                  <p className="text-sm text-muted-foreground">
                    トライアル期間: {new Date(subscription.trial_end * 1000).toLocaleDateString("ja-JP")}まで
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {showQuantityModal && subscription && (
          <UpdateQuantityModal
            isOpen={showQuantityModal}
            onClose={() => setShowQuantityModal(false)}
            items={subscription.items}
            onConfirm={(quantities) => {
              setUpdatedQuantities(quantities);
              setShowQuantityModal(false);
              setShowConfirmDialog(true);
            }}
          />
        )}

        {showConfirmDialog && subscription && (
          <ConfirmUpdateDialog
            isOpen={showConfirmDialog}
            onClose={() => setShowConfirmDialog(false)}
            items={subscription.items}
            updatedQuantities={updatedQuantities}
            onConfirm={() => {}} // Placeholder - needs actual implementation
            isUpdating={isUpdating}
          />
        )}

        {isEditingStore && customer && (
          <StoreEditModal
            isOpen={isEditingStore}
            onClose={() => setIsEditingStore(false)}
            customer={customer}
            onSubmit={handleUpdateStore}
          />
        )}
      </div>
    </AppLayout>
  );
}