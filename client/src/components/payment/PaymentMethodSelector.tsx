import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Smartphone, Building, QrCode } from 'lucide-react';

interface PaymentMethodSelectorProps {
  onSubmit: () => void;
  isLoading?: boolean;
  error?: string;
}

export function PaymentMethodSelector({ onSubmit, isLoading, error }: PaymentMethodSelectorProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'alternative'>('card');

  const paymentMethods = [
    {
      id: 'card',
      name: 'クレジットカード',
      description: '即座に設定完了',
      icon: <CreditCard className="h-5 w-5" />,
      available: true,
      badge: '推奨',
      badgeVariant: 'default' as const
    },
    {
      id: 'apple_pay',
      name: 'Apple Pay',
      description: 'Safariブラウザで利用可能',
      icon: <Smartphone className="h-5 w-5" />,
      available: false,
      badge: '準備中',
      badgeVariant: 'secondary' as const
    },
    {
      id: 'google_pay',
      name: 'Google Pay',
      description: 'Chromeブラウザで利用可能',
      icon: <Smartphone className="h-5 w-5" />,
      available: false,
      badge: '準備中',
      badgeVariant: 'secondary' as const
    },
    {
      id: 'bank_transfer',
      name: '銀行振込',
      description: '高額決済に最適',
      icon: <Building className="h-5 w-5" />,
      available: false,
      badge: '企業向け',
      badgeVariant: 'outline' as const
    },
    {
      id: 'paypay',
      name: 'PayPay',
      description: '6800万人が利用',
      icon: <QrCode className="h-5 w-5" />,
      available: false,
      badge: '2025年対応予定',
      badgeVariant: 'secondary' as const
    }
  ];

  return (
    <div className="space-y-6">
      {/* 決済方法選択 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">決済方法を選択</h3>
        <div className="grid gap-3">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                method.available 
                  ? selectedMethod === method.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                  : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
              }`}
              onClick={() => method.available && setSelectedMethod(method.id as 'card' | 'alternative')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {method.icon}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{method.name}</span>
                      <Badge variant={method.badgeVariant}>{method.badge}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{method.description}</p>
                  </div>
                </div>
                {method.available && (
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    selectedMethod === method.id 
                      ? 'border-blue-500 bg-blue-500' 
                      : 'border-gray-300'
                  }`} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 現在の制限事項の説明 */}
      <Alert>
        <AlertDescription>
          <strong>現在の状況:</strong> 継続課金（サブスクリプション）では、クレジットカードが最も安定した決済方法です。
          Apple Pay、Google Pay、PayPay等の対応は段階的に拡大予定です。
        </AlertDescription>
      </Alert>

      {/* PaymentElement */}
      {selectedMethod === 'card' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">クレジットカード情報</CardTitle>
            <CardDescription>
              Visa、Mastercard、JCB、American Expressに対応
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentElement />
          </CardContent>
        </Card>
      )}

      {/* エラー表示 */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 送信ボタン */}
      <Button
        onClick={onSubmit}
        disabled={!stripe || isLoading || selectedMethod !== 'card'}
        className="w-full"
      >
        {isLoading ? '処理中...' : '決済方法を設定'}
      </Button>
    </div>
  );
}