import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Truck, Package } from "lucide-react";

interface ShippingDetailsProps {
  customerId: string;
}

interface ShippingDetail {
  id: string;
  stripeCustomerId: string;
  trackingNumber: string;
  [key: string]: string;
}

export function ShippingDetails({ customerId }: ShippingDetailsProps) {
  const { data: shippingDetails, isLoading, error } = useQuery<ShippingDetail[]>({
    queryKey: [`/api/shipping-details/${customerId}`],
    enabled: !!customerId,
  });

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">配送情報の取得中にエラーが発生しました</div>;
  }

  if (!shippingDetails || shippingDetails.length === 0) {
    return <div className="p-4">配送情報がありません</div>;
  }

  return (
    <div className="space-y-4">
      {shippingDetails.map((detail) => (
        <div key={detail.id} className="border rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-gray-500" />
              <span className="font-medium">送り状番号: {detail.trackingNumber}</span>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Truck className="h-4 w-4 mr-2" />
                  詳細を表示
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>配送詳細情報</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  {Object.entries(detail).map(([key, value]) => (
                    key !== "id" && key !== "stripeCustomerId" && (
                      <div key={key} className="grid grid-cols-2 gap-4">
                        <div className="text-sm font-medium text-gray-500">{key}</div>
                        <div className="text-sm">{value}</div>
                      </div>
                    )
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      ))}
    </div>
  );
}
