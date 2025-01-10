import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Package, History, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useState } from "react";
import { UpdateQuantityModal } from "@/components/subscription/UpdateQuantityModal";

const SubscriptionDetailPage = () => {
  const [, setLocation] = useLocation();
  const subscriptionId = window.location.pathname.split("/").pop();
  const [showQuantityModal, setShowQuantityModal] = useState(false);

  const { data: stripeData, isLoading } = useQuery<any[]>({
    queryKey: ['/api/stripe/customer'],
    staleTime: 0,
  });

  const subscription = stripeData?.[0]?.subscriptions?.[0];

  if (isLoading) {
    return <AppLayout>Loading...</AppLayout>;
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
          onConfirm={() => {}}
          subscriptionId={subscriptionId}
        />
      </div>
    </AppLayout>
  );
};

export default SubscriptionDetailPage;