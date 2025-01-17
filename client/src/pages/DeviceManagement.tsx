import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";

interface Device {
  id: number;
  serialNumber: string;
  status: "出荷" | "返却";
  statusUpdatedAt: string;
  stripeSubscriptionId: string | null;
}

interface Store {
  id: number;
  name: string;
  address: string;
  devices: Device[];
}

export default function DeviceManagement() {
  const { data, isLoading, isError, refetch } = useQuery<Store[]>({
    queryKey: ["/api/devices"],
  });

  const handleSync = async () => {
    try {
      await fetch("/api/devices/sync", { method: "POST" });
      refetch();
    } catch (error) {
      console.error("同期に失敗しました:", error);
    }
  };

  const content = (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">レボナイザー管理</h1>
        <Button onClick={handleSync} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Kintoneと同期
        </Button>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            デバイス情報の取得に失敗しました。
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6">
          {data?.map((store) => (
            <Card key={store.id}>
              <CardHeader>
                <CardTitle>{store.name}</CardTitle>
                <p className="text-sm text-gray-500">{store.address}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {store.devices.map((device) => (
                    <div
                      key={device.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">製造番号: {device.serialNumber}</p>
                        <p className="text-sm text-gray-500">
                          更新日時: {new Date(device.statusUpdatedAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge
                        variant={device.status === "出荷" ? "default" : "secondary"}
                      >
                        {device.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return <AppLayout>{content}</AppLayout>;
}