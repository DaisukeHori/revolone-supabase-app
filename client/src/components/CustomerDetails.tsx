import { ShippingDetails } from "./ShippingDetails";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CustomerDetailsProps {
  customer: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

export function CustomerDetails({ customer }: CustomerDetailsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>顧客情報</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">基本情報</h3>
            <div className="mt-2 space-y-2">
              <p><span className="font-medium">ID:</span> {customer.id}</p>
              <p><span className="font-medium">名前:</span> {customer.name || "未設定"}</p>
              <p><span className="font-medium">メール:</span> {customer.email || "未設定"}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium">配送情報</h3>
            <div className="mt-2">
              <ShippingDetails customerId={customer.id} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
