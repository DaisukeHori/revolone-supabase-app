import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle, CreditCard, Calendar, Package, ArrowLeft,
  History, Settings, Ban, Store
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { UpdateQuantityModal } from "@/components/subscription/UpdateQuantityModal";

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

const SubscriptionDetailPage = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const subscriptionId = window.location.pathname.split("/").pop();
  const [showQuantityModal, setShowQuantityModal] = useState(false);

  const { data: stripeData, isLoading, error } = useQuery<any[]>({
    queryKey: ['/api/stripe/customer'],
    staleTime: 0,
  });

  const subscription = stripeData?.[0]?.subscriptions?.[0];

  const handleUpdateQuantities = async (quantities: Record<string, number>) => {
    try {
      const response = await fetch(`/api/stripe/subscription/${subscriptionId}/update-quantities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: Object.entries(quantities).map(([id, quantity]) => ({
            id,
            quantity
          }))
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await queryClient.invalidateQueries({ queryKey: ['/api/stripe/customer'] });

      toast({
        description: "プランの数量を更新しました",
      });
    } catch (error) {
      console.error('数量更新エラー:', error);
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "予期せぬエラーが発生しました",
      });
    }
  };

  if (isLoading) {
    return <AppLayout>Loading...</AppLayout>;
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

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/subscriptions")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">サブスクリプション詳細</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">契約内容</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* サブスクリプションステータス */}
              <div className="flex items-center gap-2">
                <Badge
                  className={`${getStatusBadgeColor(subscription.status)} border`}
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
              <div className="space-y-4 mt-4">
                {subscription.items.map((item: any) => (
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
              </div>

              {/* アクション */}
              <div className="flex flex-wrap gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQuantityModal(true)}
                >
                  数量を変更
                </Button>

                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setLocation("/payment-history")}
                >
                  <History className="h-4 w-4" />
                  支払い履歴
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <UpdateQuantityModal
          isOpen={showQuantityModal}
          onClose={() => setShowQuantityModal(false)}
          items={subscription?.items || []}
          onConfirm={handleUpdateQuantities}
          subscriptionId={subscriptionId}
        />
      </div>
    </AppLayout>
  );
};

export default SubscriptionDetailPage;