import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Store, CreditCard, Calendar, Package, ArrowLeft, Clock,
  Receipt, History, Settings, RefreshCw, Building2,
  CheckCircle, Ban, ExternalLink, Loader2, Pencil
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState } from 'react';
import { Switch } from "@/components/ui/switch";
import { StoreEditModal } from "@/components/store/StoreEditModal";
import { CreateSubscriptionModal } from "@/components/subscription/CreateSubscriptionModal";

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

type StripeCustomerData = {
  customer: {
    id: string;
    name: string | null;
    email: string;
    created: number;
    phone: string | null;
    address: {
      line1: string | null;
      line2: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
      country: string | null;
    } | null;
    shipping: {
      address: {
        line1: string | null;
        line2: string | null;
        city: string | null;
        state: string | null;
        postal_code: string | null;
        country: string | null;
      };
      name: string | null;
      phone: string | null;
    } | null;
    metadata: {
      サロン名?: string;
      代理店名?: string;
      [key: string]: string | undefined;
    };
  };
  subscriptions: Array<{
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
    items: Array<{
      subscription_item_id: string;
      amount: number | null;
      currency: string;
      interval: string;
      quantity: number;
      product: {
        name: string;
        description: string | null;
      };
    }>;
  }>;
};

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

function formatCardBrand(brand: string): string {
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
      return brand.toUpperCase();
  }
}

function formatAddress(address: {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
} | null | undefined): string {
  if (!address) return '未設定';

  const parts = [
    address.postal_code,
    address.state,
    address.city,
    address.line1,
    address.line2
  ].filter(Boolean);

  return parts.join(' ') || '未設定';
}

export default function StoreDetailPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const customerId = window.location.pathname.split("/").pop();
  const [isEditingStore, setIsEditingStore] = useState(false);
  const [isCreatingSubscription, setIsCreatingSubscription] = useState(false);

  const { data: stripeData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/stripe/customer'],
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

  const updateAutoRenewalMutation = useMutation({
    mutationFn: async ({ subscriptionId, isEnabled }: { subscriptionId: string, isEnabled: boolean }) => {
      const response = await fetch(`/api/stripe/subscription/${subscriptionId}/auto-renewal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/customer'] });
      toast({
        description: "自動更新設定を更新しました",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "自動更新設定の更新中にエラーが発生しました",
      });
    },
  });

  const handleAutoRenewalToggle = async (subscriptionId: string, currentValue: boolean) => {
    try {
      await updateAutoRenewalMutation.mutateAsync({
        subscriptionId,
        isEnabled: currentValue,
      });
    } catch (error) {
      console.error('自動更新設定の更新エラー:', error);
    }
  };

  const customerData = stripeData?.find(data => data.customer.id === customerId);
  const customer = customerData?.customer;

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
            店舗情報の取得に失敗しました
          </AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  if (!customer) {
    return (
      <AppLayout>
        <Alert variant="destructive">
          <AlertDescription>
            指定された店舗が見つかりません
          </AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  const handleUpdateStore = async (values: any) => {
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

  return (
    <AppLayout>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            className="hover:bg-primary/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold">店舗詳細</h1>
        </div>

        {/* 店舗基本情報 */}
        <motion.div variants={item}>
          <Card className="bg-background/95 backdrop-blur-sm border-primary/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Store className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">
                      {customer.metadata?.サロン名 || '店舗名未設定'}
                    </CardTitle>
                    {customer.metadata?.代理店名 && (
                      <CardDescription>
                        代理店: {customer.metadata.代理店名}
                      </CardDescription>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingStore(true)}
                  className="gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  編集
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">基本情報</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">メールアドレス</p>
                      <p className="text-sm">{customer.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">電話番号</p>
                      <p className="text-sm">{customer.phone || '未設定'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">登録日</p>
                      <p className="text-sm">{new Date(customer.created * 1000).toLocaleDateString("ja-JP")}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">請求先住所</h3>
                  <p className="text-sm">{formatAddress(customer.address)}</p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">配送先住所</h3>
                  <p className="text-sm">{formatAddress(customer.shipping?.address)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* サブスクリプション一覧 */}
        <motion.div variants={item}>
          <Card className="bg-background/95 backdrop-blur-sm border-primary/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">契約中のサービス</CardTitle>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setIsCreatingSubscription(true)}
                  className="gap-2"
                >
                  <Package className="h-4 w-4" />
                  新しいサブスクリプションに加入
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {customerData?.subscriptions.length > 0 ? (
                customerData.subscriptions.map((subscription) => (
                  <div
                    key={subscription.id}
                    className="bg-primary/5 rounded-lg p-6 space-y-4 cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => setLocation(`/subscription/${subscription.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={getStatusBadgeColor(subscription.status)}
                          >
                            {formatStatus(subscription.status)}
                          </Badge>
                          {subscription.status === 'active' && (
                            <div className="flex items-center gap-2 ml-4">
                              <span className="text-sm text-muted-foreground">自動更新</span>
                              <Switch
                                checked={!subscription.cancel_at_period_end}
                                onCheckedChange={(checked) => {
                                  handleAutoRenewalToggle(subscription.id, checked);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      {subscription.items.map((item) => (
                        <div key={item.subscription_item_id} className="flex justify-between items-center">
                          <div className="space-y-1">
                            <p className="font-medium">{item.product.name}</p>
                            {item.product.description && (
                              <p className="text-sm text-muted-foreground">
                                {item.product.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {item.amount?.toLocaleString()} {item.currency.toUpperCase()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              × {item.quantity}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {subscription.default_payment_method && (
                      <div className="pt-4 border-t border-primary/10">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CreditCard className="h-4 w-4" />
                          <span>
                            {formatCardBrand(subscription.default_payment_method.card.brand)}
                            **** {subscription.default_payment_method.card.last4}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">
                  現在契約中のサブスクリプションはありません。新しいサブスクリプションに加入するには上のボタンをクリックしてください。
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {isCreatingSubscription && customer && (
          <CreateSubscriptionModal
            isOpen={isCreatingSubscription}
            onClose={() => setIsCreatingSubscription(false)}
            customerId={customer.id}
            onSuccess={refetch}
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
      </motion.div>
    </AppLayout>
  );
}