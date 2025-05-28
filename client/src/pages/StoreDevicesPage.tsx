import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import { Smartphone, Loader2, Calendar, Package } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface Device {
  serialNumber: string;
  status: "出荷" | "返却";
  statusUpdatedAt: string;
  stripeSubscriptionId: string;
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
  const { data: devices, isLoading, error } = useQuery({
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "出荷":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">出荷済み</Badge>;
      case "返却":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">返却済み</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
        {error ? (
          <motion.div variants={item}>
            <Alert variant="destructive">
              <AlertDescription>
                デバイス情報の取得に失敗しました
              </AlertDescription>
            </Alert>
          </motion.div>
        ) : isLoading ? (
          <motion.div variants={item}>
            <Card className="bg-white shadow-xl border-0 rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Smartphone className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl sm:text-2xl text-gray-800">レボナイザー</CardTitle>
                    <p className="text-gray-600 text-sm sm:text-base">デバイスの配送・返却状況</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
                <p className="text-gray-500 text-sm">デバイス情報を読み込み中...</p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={item}>
            <Card className="bg-white shadow-xl border-0 rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Smartphone className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl sm:text-2xl text-gray-800">レボナイザー</CardTitle>
                    <p className="text-gray-600 text-sm sm:text-base">デバイスの配送・返却状況</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {devices && devices.length > 0 ? (
                  <div className="space-y-4">
                    {devices.map((device, index) => (
                      <motion.div
                        key={device.serialNumber}
                        className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Smartphone className="h-5 w-5 text-purple-600" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-800">
                                  シリアル番号: {device.serialNumber}
                                </h3>
                                <p className="text-sm text-gray-500">
                                  レボナイザーデバイス
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-600">
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
                          </div>
                          
                          <div className="text-right">
                            {getStatusBadge(device.status)}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Smartphone className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      レボナイザーデバイスがありません
                    </h3>
                    <p className="text-gray-500">
                      現在この店舗に配送されているデバイスはございません
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </AppLayout>
  );
}