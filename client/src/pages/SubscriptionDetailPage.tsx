import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle, CreditCard, Calendar, Package, ArrowLeft, Clock,
  Receipt, History, Settings, CreditCard as CardIcon, RefreshCw,
  CheckCircle, Ban, ExternalLink, Loader2, Pencil, Store
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// フォームのスキーマ定義を更新
const storeFormSchema = z.object({
  name: z.string().min(1, "店舗名を入力してください"),
  postalCode: z.string().min(1, "郵便番号を入力してください"),
  state: z.string().min(1, "都道府県を入力してください"),
  city: z.string().min(1, "市区町村を入力してください"),
  line1: z.string().min(1, "住所1を入力してください"),
  line2: z.string(),
  phoneNumber: z.string().min(1, "電話番号を入力してください"),
});

type StoreFormValues = z.infer<typeof storeFormSchema>;

// 型定義部分を更新
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
    metadata: {
      サロン名?: string;
      住所?: string;
      電話番号?: string;
      [key: string]: string | undefined;
    };
  };
  subscriptions: StripeSubscription[];
  payment_history: StripePaymentHistory[];
};

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

type StripePaymentHistory = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  invoice_pdf: string | null;
};

function QuantityInput({
  initialQuantity,
  onChange,
  min = 1,
  max = 99,
  itemId
}: {
  initialQuantity: number;
  onChange: (quantity: number) => void;
  min?: number;
  max?: number;
  itemId?: string;
}) {
  const [quantity, setQuantity] = useState(initialQuantity);

  useEffect(() => {
    console.log(`[QuantityInput ${itemId}] initialQuantity:`, initialQuantity, 'current quantity:', quantity);
    if (initialQuantity !== quantity) {
      console.log(`[QuantityInput ${itemId}] Updating quantity to:`, initialQuantity);
      setQuantity(initialQuantity);
    }
  }, [initialQuantity, quantity, itemId]);

  const handleChange = (value: number) => {
    const newQuantity = Math.max(min, Math.min(max, value));
    console.log(`[QuantityInput ${itemId}] handleChange:`, newQuantity);
    setQuantity(newQuantity);
    onChange(newQuantity);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => handleChange(quantity - 1)}
        disabled={quantity <= min}
        className="h-8 w-8"
      >
        -
      </Button>
      <Input
        type="number"
        value={quantity}
        onChange={(e) => handleChange(parseInt(e.target.value) || min)}
        className="h-8 w-16 text-center"
        min={min}
        max={max}
      />
      <Button
        variant="outline"
        size="icon"
        onClick={() => handleChange(quantity + 1)}
        disabled={quantity >= max}
        className="h-8 w-8"
      >
        +
      </Button>
    </div>
  );
}

function UpdateQuantityModal({
  isOpen,
  onClose,
  items,
  onConfirm
}: {
  isOpen: boolean;
  onClose: () => void;
  items: StripeSubscription['items'];
  onConfirm: (quantities: Record<string, number>) => void;
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    console.log('[UpdateQuantityModal] Modal opened or items changed. Items:', JSON.stringify(items, null, 2));
    const initialQuantities: Record<string, number> = {};
    items.forEach((item) => {
      const itemId = item.subscription_item_id;
      console.log(`[UpdateQuantityModal] Processing item:`, {
        id: itemId,
        name: item.product.name,
        quantity: item.quantity
      });
      initialQuantities[itemId] = item.quantity;
    });
    console.log('[UpdateQuantityModal] Setting quantities:', initialQuantities);
    setQuantities(initialQuantities);
  }, [items, isOpen]);

  const handleQuantityChange = (itemId: string, quantity: number) => {
    console.log(`[UpdateQuantityModal] Changing quantity for item ${itemId} to:`, quantity);
    setQuantities(prev => {
      const next = {
        ...prev,
        [itemId]: quantity
      };
      console.log('[UpdateQuantityModal] Updated quantities:', next);
      return next;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>プランの数量を変更</DialogTitle>
          <DialogDescription>
            各プランの数量を設定してください。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {items.map((item) => {
            const itemId = item.subscription_item_id;
            console.log(`[UpdateQuantityModal] Rendering item:`, {
              id: itemId,
              name: item.product.name,
              currentQuantity: quantities[itemId],
              originalQuantity: item.quantity
            });

            return (
              <div key={itemId} className="p-4 bg-primary/5 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-medium text-lg">{item.product.name}</h4>
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
                  <QuantityInput
                    key={`${itemId}-${quantities[itemId] || item.quantity}`}
                    itemId={itemId}
                    initialQuantity={quantities[itemId] || item.quantity}
                    onChange={(quantity) => handleQuantityChange(itemId, quantity)}
                  />
                </div>
              </div>
            );
          })}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
            >
              キャンセル
            </Button>
            <Button
              onClick={() => onConfirm(quantities)}
              disabled={Object.keys(quantities).length === 0}
            >
              変更内容を確認
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmUpdateDialog({
  isOpen,
  onClose,
  items,
  updatedQuantities,
  onConfirm,
  isUpdating
}: {
  isOpen: boolean;
  onClose: () => void;
  items: StripeSubscription['items'];
  updatedQuantities: Record<string, number>;
  onConfirm: () => Promise<void>;
  isUpdating: boolean;
}) {
  // 変更のある商品のみをフィルタリング
  const changedItems = items.filter((item) => {
    const itemId = item.subscription_item_id;
    return updatedQuantities[itemId] !== item.quantity;
  });

  // 合計金額の計算（全商品の合計）
  const totalAmount = items.reduce((total, item) => {
    const itemId = item.subscription_item_id;
    const quantity = updatedQuantities[itemId] || item.quantity;
    if (item.amount) {
      return total + (item.amount * quantity);
    }
    return total;
  }, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>変更内容の確認</DialogTitle>
          <DialogDescription>
            以下の内容で更新します。更新後、次回の請求から反映されます。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-4">
            {items.map((item) => {
              const itemId = item.subscription_item_id;
              const updatedQuantity = updatedQuantities[itemId];
              const hasChanged = updatedQuantity !== item.quantity;

              return (
                <div key={itemId} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity}個 → {updatedQuantity || item.quantity}個
                    </p>
                  </div>
                  {item.amount && (
                    <p className="font-medium">
                      {((updatedQuantity || item.quantity) * item.amount).toLocaleString()} {item.currency.toUpperCase()}
                    </p>
                  )}
                </div>
              );
            })}
            <div className="pt-4 border-t border-primary/10">
              <div className="flex justify-between items-center">
                <p className="font-medium">次回請求額（合計）</p>
                <p className="font-medium text-lg">
                  {totalAmount.toLocaleString()} {items[0]?.currency.toUpperCase()}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isUpdating}
            >
              キャンセル
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isUpdating || changedItems.length === 0}
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              更新する
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatAddress(address: StripeCustomerData['customer']['address'] | null): string {
  if (!address) return '未設定';

  const parts = [
    address.state,
    address.city,
    address.line1,
    address.line2
  ].filter(Boolean);

  return parts.join(' ') || '未設定';
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

function SubscriptionDetailPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const subscriptionId = window.location.pathname.split("/").pop();
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [updatedQuantities, setUpdatedQuantities] = useState<Record<string, number>>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditingStore, setIsEditingStore] = useState(false);

  const { data: stripeData, isLoading, error, refetch } = useQuery<StripeCustomerData[]>({
    queryKey: ['/api/stripe/customer'],
    staleTime: 0, // 常に最新のデータを取得
  });

  console.log('Stripe Data:', stripeData); // デバッグログ

  const customerData = stripeData?.find(data =>
    data.subscriptions.some(sub => sub.id === subscriptionId)
  );

  console.log('Customer Data:', customerData); // デバッグログ

  const subscription = customerData?.subscriptions.find(sub => sub.id === subscriptionId);
  const customer = customerData?.customer;

  console.log('Customer:', customer); // デバッグログ

  const form = useForm<StoreFormValues>({
    resolver: zodResolver(storeFormSchema),
    defaultValues: {
      name: customer?.metadata?.サロン名 || '',
      postalCode: customer?.address?.postal_code || '',
      state: customer?.address?.state || '',
      city: customer?.address?.city || '',
      line1: customer?.address?.line1 || '',
      line2: customer?.address?.line2 || '',
      phoneNumber: customer?.phone || '',
    },
  });

  useEffect(() => {
    if (customer) {
      form.reset({
        name: customer.metadata?.サロン名 || '',
        postalCode: customer?.address?.postal_code || '',
        state: customer?.address?.state || '',
        city: customer?.address?.city || '',
        line1: customer?.address?.line1 || '',
        line2: customer?.address?.line2 || '',
        phoneNumber: customer.phone || '',
      });
    }
  }, [customer, form]);

  const handleUpdateStore = async (values: StoreFormValues) => {
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

  const handleUpdateQuantities = async () => {
    if (Object.keys(updatedQuantities).length === 0) {
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/stripe/subscription/${subscriptionId}/update-quantities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: Object.entries(updatedQuantities).map(([id, quantity]) => ({
            id,
            quantity
          }))
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await refetch();
      toast({
        description: "プランの数量を更新しました",
      });

      setUpdatedQuantities({});
      setShowConfirmDialog(false);
    } catch (error) {
      console.error('数量更新エラー:', error);
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "予期せぬエラーが発生しました",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleAutoRenewalMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const response = await fetch(`/api/stripe/subscription/${subscriptionId}/auto-renewal`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: () => {
      refetch();
      toast({
        description: "自動更新設定を変更しました",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        description: "設定の変更に失敗しました",
      });
    }
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const response = await fetch(`/api/stripe/subscription/${subscriptionId}/cancel`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: () => {
      refetch();
      toast({
        description: "サブスクリプションをキャンセルしました",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        description: "キャンセルに失敗しました",
      });
    }
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

  if (!subscription || !customerData) {
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

  const isTrialing = subscription.trial_end && subscription.trial_end > Date.now() / 1000;

  const handleAutoRenewalToggle = async () => {
    try {
      await toggleAutoRenewalMutation.mutateAsync(subscription.id);
    } catch (error) {
      console.error('自動更新設定の変更に失敗:', error);
    }
  };

  const handleCancelSubscription = async () => {
    if (window.confirm('本当にサブスクリプションをキャンセルしますか？')) {
      try {
        await cancelSubscriptionMutation.mutateAsync(subscription.id);
      } catch (error) {
        console.error('サブスクリプションのキャンセルに失敗:', error);
      }
    }
  };


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

        {/* 店舗情報カード */}
        <Card className="bg-background/95 backdrop-blur-sm border-primary/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Store className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">店舗情報</CardTitle>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditingStore(!isEditingStore)}
                className="hover:bg-primary/10"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isEditingStore ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleUpdateStore)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>店舗名</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="店舗名を入力" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>郵便番号</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="郵便番号を入力" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>都道府県</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="都道府県を入力" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>市区町村</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="市区町村を入力" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="line1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>住所1（番地など）</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="住所1を入力" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="line2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>住所2（建物名など）</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="住所2を入力（任意）" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>電話番号</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="電話番号を入力" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditingStore(false)}
                    >
                      キャンセル
                    </Button>
                    <Button type="submit">
                      保存
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">店舗名</div>
                  <div className="text-lg">{customer?.metadata?.サロン名 || '未設定'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">郵便番号</div>
                  <div className="text-lg">{customer?.address?.postal_code || '未設定'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">住所</div>
                  <div className="text-lg">{formatAddress(customer?.address)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">電話番号</div>
                  <div className="text-lg">{customer?.phone || '未設定'}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-background/95 backdrop-blur-sm border-primary/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">
                    {subscription.items[0]?.product?.name || 'サブスクリプション'}
                  </CardTitle>
                  {subscription.items[0]?.product?.description && (
                    <CardDescription>
                      {subscription.items[0].product.description}
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
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">契約情報</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">契約者名</p>
                  <p className="text-lg">{customer.metadata?.サロン名 || customer.name || '未設定'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">契約番号</p>
                  <p className="text-lg font-mono">{subscription.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">契約開始日</p>
                  <p className="text-lg">
                    {new Date(customer.created * 1000).toLocaleDateString("ja-JP", {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">契約ステータス</p>
                  <Badge className={`${getStatusBadgeColor(subscription.status)} mt-1`}>
                    {formatStatus(subscription.status)}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">契約中のサービス</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQuantityModal(true)}
                  className="gap-2"
                >
                  <Settings className="h-4 w-4" />
                  数量を変更
                </Button>
              </div>
              <div className="space-y-4">
                {subscription.items.map((item) => (
                  <div key={item.subscription_item_id} className="p-4 bg-primary/5 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium text-lg">{item.product.name}</h4>
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
                          <span>×</span>
                          <span>{item.quantity}個</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">次回更新日</h3>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                  <p className="text-lg font-medium">
                    {new Date(subscription.current_period_end * 1000).toLocaleDateString("ja-JP", {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
            {isTrialing && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">トライアル期間</h3>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-1" />
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


            <Separator />

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
                  onCheckedChange={handleAutoRenewalToggle}
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
                  onClick={() => setLocation("/billing")}
                >
                  <Settings className="h-4 w-4" />
                  支払い設定を変更
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setLocation("/payment-history")}
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
                    onClick={handleCancelSubscription}
                  >
                    <Ban className="h-4 w-4" />
                    解約する
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

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

        <ConfirmUpdateDialog
          isOpen={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          items={subscription.items}
          updatedQuantities={updatedQuantities}
          onConfirm={handleUpdateQuantities}
          isUpdating={isUpdating}
        />
      </div>
    </AppLayout>
  );
}

export default SubscriptionDetailPage;