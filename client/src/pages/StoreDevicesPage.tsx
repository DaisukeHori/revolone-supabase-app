import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import { Smartphone, Loader2, Calendar, Package, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { CreateSubscriptionModal } from "@/components/subscription/CreateSubscriptionModal";
import { UpdateQuantityModal } from "@/components/subscription/UpdateQuantityModal";
import { ConfirmUpdateDialog } from "@/components/subscription/ConfirmUpdateDialog";
import { toast } from "@/hooks/use-toast";

interface Device {
  serialNumber: string;
  status: "出荷" | "返却";
  statusUpdatedAt: string;
  stripeSubscriptionId: string;
  subscriptionRentalAvailability?: string; // サブスク貸出の可不可
  deviceCategory?: string; // 購入機材, 代替え機, サブスク
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

export default function StoreDevicesPage() {
  const { id: storeId } = useParams();
  const [, setLocation] = useLocation();

  const { data: devices, isLoading, error, refetch } = useQuery({
    queryKey: ['store-devices', storeId],
    queryFn: async () => {
      const response = await fetch(`/api/stores/${storeId}/devices`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch devices');
      }
      return response.json() as Promise<Device[]>;
    },
    enabled: !!storeId
  });

  // Stripe customer data for subscription management
  const { data: stripeData } = useQuery({
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

  const customerId = storeId;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "出荷":
        return <Badge className="bg-green-500 hover:bg-green-500 text-white">出荷済み</Badge>;
      case "返却":
        return <Badge className="bg-gray-500 hover:bg-gray-500 text-white">返却済み</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string>("");
  const [selectedSubscriptionItems, setSelectedSubscriptionItems] = useState<any[]>([]);
  const [updatedQuantities, setUpdatedQuantities] = useState<Record<string, number>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  const handleCreateSubscription = () => {
    setShowCreateModal(true);
  };

  const handleOpenUpdateModal = (subscriptionId: string) => {
    const customerData = stripeData?.find((data: any) => data.customer.id === customerId);
    const subscription = customerData?.subscriptions.find((sub: any) => sub.id === subscriptionId);
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
            デバイス情報の取得に失敗しました
          </AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

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
          <div>
            <h1 className="text-2xl font-bold text-foreground">デバイス管理</h1>
            <p className="text-muted-foreground">レボナイザーデバイスの配送・返却状況</p>
          </div>
        </div>

        <motion.div variants={item}>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card/50 to-card backdrop-blur-sm">
            <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-primary/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl text-foreground flex items-center gap-2">
                    レボナイザーデバイス
                    <Badge variant="outline" className="text-xs">
                      {devices?.length || 0} 台
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">配送・返却状況の管理</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {devices && devices.length > 0 ? (
                <div className="space-y-4">
                  {devices.map((device, index) => (
                    <motion.div
                      key={device.serialNumber}
                      className="p-6 rounded-lg border border-border/50 bg-gradient-to-r from-card/30 to-card/50 backdrop-blur-sm hover:shadow-md transition-all duration-200"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <Smartphone className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">
                                シリアル番号: {device.serialNumber}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                レボナイザーデバイス
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>更新日: {new Date(device.statusUpdatedAt).toLocaleDateString("ja-JP")}</span>
                            </div>
                            {device.stripeSubscriptionId && (
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                <span className="truncate">ID: {device.stripeSubscriptionId}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* デバイス区分情報を表示 */}
                          {device.deviceCategory && (
                            <div className="mt-3 p-3 rounded-lg bg-muted/50">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                <span className="text-sm font-medium">
                                  デバイス区分: 
                                  {device.deviceCategory === '購入機材' ? (
                                    <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-800 border-orange-200">
                                      購入機材
                                    </Badge>
                                  ) : device.deviceCategory === '代替え機' ? (
                                    <Badge variant="secondary" className="ml-2 bg-purple-100 text-purple-800 border-purple-200">
                                      代替え機
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800 border-blue-200">
                                      サブスク
                                    </Badge>
                                  )}
                                </span>
                              </div>
                              {device.deviceCategory === '購入機材' && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  このデバイスは買い切りで販売されたもので、サブスクリプション契約ではありません
                                </p>
                              )}
                              {device.deviceCategory === '代替え機' && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  このデバイスは代替え機として登録されています
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="ml-4">
                          {getStatusBadge(device.status)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    デバイスが見つかりません
                  </h3>
                  <p className="text-muted-foreground">
                    現在この店舗に配送されているデバイスはございません
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
      {showCreateModal && (
          <CreateSubscriptionModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            customerId={storeId!}
            onSuccess={async () => { void refetch(); }}
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
    </AppLayout>
  );
}