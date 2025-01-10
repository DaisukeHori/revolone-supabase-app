import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Receipt, ArrowLeft, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

type StripePaymentHistory = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  invoice_pdf: string | null;
};

type StripeCustomerData = {
  customer: {
    id: string;
    name: string | null;
    email: string;
    metadata: Record<string, string>;
  };
  payment_history: StripePaymentHistory[];
}[];

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

export default function PaymentHistoryPage() {
  const [, setLocation] = useLocation();
  const { data: stripeData, isLoading, error } = useQuery<StripeCustomerData>({
    queryKey: ['/api/stripe/customer'],
  });

  if (error) {
    return (
      <AppLayout>
        <Alert variant="destructive">
          <AlertDescription>
            支払い履歴の取得に失敗しました
          </AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  const customerData = stripeData?.[0];

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
            onClick={() => setLocation(-1)}
            className="hover:bg-primary/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold">支払い履歴</h1>
        </div>

        <motion.div variants={item}>
          <Card className="bg-background/95 backdrop-blur-sm border-primary/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Receipt className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">支払い履歴</CardTitle>
                  {customerData?.customer.metadata?.サロン名 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {customerData.customer.metadata.サロン名}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {customerData?.payment_history?.length > 0 ? (
                <div className="space-y-4">
                  {customerData.payment_history.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between py-4 border-b border-primary/10 last:border-0"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">
                          {payment.amount.toLocaleString()} {payment.currency.toUpperCase()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(payment.created * 1000).toLocaleDateString("ja-JP", {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge
                          className={
                            payment.status === 'succeeded'
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                          }
                        >
                          {payment.status === 'succeeded' ? '支払い完了' : '処理中'}
                        </Badge>
                        {payment.invoice_pdf && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-primary/10"
                            asChild
                          >
                            <a
                              href={payment.invoice_pdf}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8">
                  支払い履歴はありません
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}
