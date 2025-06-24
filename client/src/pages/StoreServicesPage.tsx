import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import { CreditCard, Loader2, ArrowLeft, Package } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useState } from "react";
import { CreateSubscriptionModal } from "@/components/subscription/CreateSubscriptionModal";
import { UpdateQuantityModal } from "@/components/subscription/UpdateQuantityModal";
import { ConfirmUpdateDialog } from "@/components/subscription/ConfirmUpdateDialog";
import { toast } from "@/components/ui/use-toast";

type StripeSubscription = {
  id: string;
  status: string;
  current_period_end: number;
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
  const [, setLocation] = useLocation();
  const [isCreatingSubscription, setIsCreatingSubscription] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string>("");
  const [selectedSubscriptionItems, setSelectedSubscriptionItems] = useState<any[]>([]);
  const [updatedQuantities, setUpdatedQuantities] = useState<Record<string, number>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: stripeData, isLoading, error, refetch } = useQuery({
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
    const customerId = currentStore?.customer.id;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <Alert variant="destructive">
          <AlertDescription>
            サービス情報の取得に失敗しました
          </AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  if (!currentStore) {
    return (
      <AppLayout>
        <Alert>
          <AlertDescription>
            店舗情報が見つかりませんでした
          </AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  const handleCreateSubscription = () => {
    setIsCreatingSubscription(true);
  };

  const handleOpenUpdateModal = (subscriptionId: string) => {
    const customerData = stripeData?.find(data => data.customer.id === customerId);
    const subscription = customerData?.subscriptions.find(sub => sub.id === subscriptionId);
    if (subscription) {
      setSelectedSubscriptionId(subscriptionId);
      setSelectedSubscriptionItems(subscription.items);
      setShowUpdateModal(true);
    }
  };

  const handleConfirmQuantityUpdate = async (quantities: Record<string, number>) => {
    if (!selectedSubscriptionId) return;

    try {
      setIsUpdating(true);
      const response = await fetch(`/api/stripe/subscription/${selectedSubscriptionId}/quantities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantities }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await refetch();
      toast({
        description: "契約数量を更新しました",
      });
      setShowConfirmDialog(false);
      setShowUpdateModal(false);
    } catch (error) {
      console.error('数量更新エラー:', error);
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "数量の更新中にエラーが発生しました",
      });
    } finally {
      setIsUpdating(false);
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
            onClick={() => setLocation(`/store/${storeId}`)}
            className="hover:bg-primary/10 flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-semibold">契約中のサービス</h1>
        </div>

        {/* サブスクリプション一覧 */}
        <motion.div variants={item}>
          <Card className="bg-white shadow-xl border-0 rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 pb-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Package className="h-6 w-6 text-gray-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-xl sm:text-2xl text-gray-800">契約中のサービス</CardTitle>
                    <p className="text-gray-600 text-sm">現在の契約状況とサービス詳細</p>
                  </div>
                </div>
                <div>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreatingSubscription(true)}
                    className="gap-2 bg-white hover:bg-gray-50"
                  >
                    <Package className="h-4 w-4" />
                    新しいサブスクリプションに加入
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              {currentStore.subscriptions.length > 0 ? (
                currentStore.subscriptions.map((subscription) => (
                  <div
                    key={subscription.id}
                    className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4 sm:p-6 space-y-4 cursor-pointer hover:shadow-lg hover:border-gray-400 transition-all duration-200"
                    onClick={() => handleOpenUpdateModal(subscription.id)}
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
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      {subscription.items.map((item) => (
                        <div key={item.subscription_item_id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-white p-3 rounded-lg">
                          <div className="space-y-1 min-w-0 flex-1">
                            <p className="font-medium text-gray-800 break-words">{item.product.name}</p>
                            {item.product.description && (
                              <p className="text-xs sm:text-sm text-gray-500 break-words">
                                {item.product.description}
                              </p>
                            )}
                          </div>
                          <div className="text-left sm:text-right flex-shrink-0">
                            <p className="font-medium text-gray-800">
                              {item.amount?.toLocaleString()} {item.currency.toUpperCase()}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-500">
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
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
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

        {isCreatingSubscription && currentStore && (
          <CreateSubscriptionModal
            isOpen={isCreatingSubscription}
            onClose={() => setIsCreatingSubscription(false)}
            customerId={customerId}
            onSuccess={refetch}
            onOpenUpdateModal={handleOpenUpdateModal}
          />
        )}

        {showUpdateModal && (
          <UpdateQuantityModal
            isOpen={showUpdateModal}
            onClose={() => setShowUpdateModal(false)}
            items={selectedSubscriptionItems}
            onConfirm={(quantities) => {
              setUpdatedQuantities(quantities);
              setShowUpdateModal(false);
              setShowConfirmDialog(true);
            }}
          />
        )}

        {showConfirmDialog && (
          <ConfirmUpdateDialog
            isOpen={showConfirmDialog}
            onClose={() => setShowConfirmDialog(false)}
            items={selectedSubscriptionItems}
            updatedQuantities={updatedQuantities}
            onConfirm={handleConfirmQuantityUpdate}
            isUpdating={isUpdating}
          />
        )}
      </motion.div>
    </AppLayout>
  );
}