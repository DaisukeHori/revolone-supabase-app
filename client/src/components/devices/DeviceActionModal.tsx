import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeftRight, Package, Loader2, ChevronLeft, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { calculateTotalQuantityFromItems } from "@/lib/revonizerCalculation";

interface DeviceActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: {
    serialNumber: string;
    deviceCategory?: string;
    stripeSubscriptionId?: string;
  };
}

type StripeSubscription = {
  id: string;
  status: string;
  items: {
    subscription_item_id: string;
    quantity: number;
    product: {
      name: string;
    };
  }[];
};

const DEVICE_ISSUES = [
  'オゾンが出ない',
  'エアーが出ない',
  '表示がおかしい',
  'ダイヤルが反応しない',
  'ポンプがおかしい',
  '異音がする',
  'コンセントの端子が壊れた',
  '異常発熱する'
];

export function DeviceActionModal({ isOpen, onClose, device }: DeviceActionModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalQuantity, setTotalQuantity] = useState<number>(0);
  const [step, setStep] = useState<'select' | 'issues' | 'confirm' | 'terms'>('select');
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');

  // モーダルがクローズされたときにステートをリセット
  useEffect(() => {
    if (!isOpen) {
      setStep('select');
      setSelectedIssues([]);
      setNotes('');
      setIsProcessing(false);
    }
  }, [isOpen]);

  // Stripe顧客データを取得
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
    },
    enabled: isOpen && device.deviceCategory === 'サブスク'
  });

  // サブスクリプションの総台数を計算（Revonizerの正確な計算ロジックを使用）
  useEffect(() => {
    const calculateCurrentQuantity = async () => {
      if (stripeData && device.stripeSubscriptionId) {
        const customerData = stripeData.find((data: any) => 
          data.subscriptions.some((sub: StripeSubscription) => sub.id === device.stripeSubscriptionId)
        );
        
        if (customerData) {
          const subscription = customerData.subscriptions.find(
            (sub: StripeSubscription) => sub.id === device.stripeSubscriptionId
          );
          
          if (subscription) {
            try {
              // Revonizerの正確な台数計算ロジックを使用
              const total = await calculateTotalQuantityFromItems(subscription.items);
              setTotalQuantity(total);
            } catch (error) {
              console.error('台数計算エラー:', error);
              // フォールバック：通常の合計計算
              const total = subscription.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
              setTotalQuantity(total);
            }
          }
        }
      }
    };

    calculateCurrentQuantity();
  }, [stripeData, device.stripeSubscriptionId]);

  const handleExchangeStart = () => {
    setStep('issues');
  };

  const handleIssueSelection = () => {
    if (selectedIssues.length === 0) {
      toast({
        variant: "destructive",
        description: "不調部分を選択してください",
      });
      return;
    }
    setStep('confirm');
  };

  const handleConfirmExchange = () => {
    setStep('terms');
  };

  const handleFinalExchange = async () => {
    setIsProcessing(true);
    try {
      // 交換リクエストをDBに保存
      const exchangeData = {
        serialNumber: device.serialNumber,
        issues: selectedIssues,
        notes: notes.trim() || undefined
      };

      const response = await fetch('/api/devices/exchange-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(exchangeData)
      });

      if (!response.ok) {
        throw new Error('交換リクエストの送信に失敗しました');
      }

      const result = await response.json();
      console.log('交換リクエスト成功:', result);

      toast({
        description: `デバイス ${device.serialNumber} の交換リクエストを送信しました`,
      });

      onClose();
    } catch (error) {
      console.error('交換手続きエラー:', error);
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "交換リクエストの送信に失敗しました",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleIssueToggle = (issue: string) => {
    setSelectedIssues(prev => 
      prev.includes(issue) 
        ? prev.filter(i => i !== issue)
        : [...prev, issue]
    );
  };

  const handleBack = () => {
    switch (step) {
      case 'issues':
        setStep('select');
        break;
      case 'confirm':
        setStep('issues');
        break;
      case 'terms':
        setStep('confirm');
        break;
    }
  };

  const handleReturn = () => {
    toast({
      description: "返却機能は準備中です",
    });
    onClose();
  };

  if (device.deviceCategory !== 'サブスク') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>デバイス操作</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <p className="text-muted-foreground">
              {device.deviceCategory === '購入機材' 
                ? 'このデバイスは購入機材のため、操作できません。'
                : device.deviceCategory === '代替え機'
                ? 'このデバイスは代替え機のため、操作できません。'
                : 'このデバイスは操作できません。'
              }
            </p>
            <Button 
              onClick={onClose} 
              className="mt-4"
              variant="outline"
            >
              閉じる
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const renderStepContent = () => {
    switch (step) {
      case 'select':
        return (
          <div className="space-y-4 py-4">
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground">
                シリアル番号: {device.serialNumber}
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card 
                className="cursor-pointer hover:shadow-md transition-all duration-200 border-blue-200 hover:border-blue-300"
                onClick={handleReturn}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Package className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-foreground">返却</h3>
                      <p className="text-sm text-muted-foreground">
                        {totalQuantity > 1 
                          ? `サブスクの契約を${totalQuantity}台から${totalQuantity - 1}台に変更`
                          : totalQuantity === 1
                          ? "サブスクの契約を1台から0台に変更（契約終了）"
                          : "サブスクの契約台数を1台減らす"
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card 
                className="cursor-pointer hover:shadow-md transition-all duration-200 border-orange-200 hover:border-orange-300"
                onClick={handleExchangeStart}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <ArrowLeftRight className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-foreground">交換</h3>
                      <p className="text-sm text-muted-foreground">
                        不調があるので別のものと交換する
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <div className="pt-4">
              <Button 
                onClick={onClose} 
                variant="outline" 
                className="w-full"
              >
                キャンセル
              </Button>
            </div>
          </div>
        );

      case 'issues':
        return (
          <div className="space-y-4 py-4">
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">
                シリアル番号: {device.serialNumber}
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-medium">不調部分を選択してください</h3>
              <div className="space-y-2">
                {DEVICE_ISSUES.map((issue) => (
                  <div key={issue} className="flex items-center space-x-2">
                    <Checkbox 
                      id={issue}
                      checked={selectedIssues.includes(issue)}
                      onCheckedChange={() => handleIssueToggle(issue)}
                    />
                    <label 
                      htmlFor={issue}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {issue}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">備考（任意）</label>
              <Textarea
                placeholder="詳細な症状や気づいた点があれば記入してください"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleBack} variant="outline" className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-2" />
                戻る
              </Button>
              <Button onClick={handleIssueSelection} className="flex-1">
                次へ
              </Button>
            </div>
          </div>
        );

      case 'confirm':
        return (
          <div className="space-y-4 py-4">
            <div className="text-center mb-4">
              <h3 className="font-medium">交換内容の確認</h3>
              <p className="text-sm text-muted-foreground mt-1">
                シリアル番号: {device.serialNumber}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <h4 className="font-medium text-sm mb-2">選択された不調部分:</h4>
                <ul className="space-y-1">
                  {selectedIssues.map((issue) => (
                    <li key={issue} className="text-sm flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
              
              {notes && (
                <div>
                  <h4 className="font-medium text-sm mb-2">備考:</h4>
                  <p className="text-sm bg-white p-2 rounded border">{notes}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleBack} variant="outline" className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-2" />
                戻る
              </Button>
              <Button onClick={handleConfirmExchange} className="flex-1">
                交換規約を確認
              </Button>
            </div>
          </div>
        );

      case 'terms':
        return (
          <div className="space-y-4 py-4">
            <div className="text-center mb-4">
              <h3 className="font-medium">デバイス交換規約</h3>
            </div>

            <div className="max-h-64 overflow-y-auto bg-gray-50 rounded-lg p-4 text-sm space-y-3 border">
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  交換対象について
                </h4>
                <ul className="space-y-1 pl-6 list-disc">
                  <li>自然故障による不具合は無償で交換対応いたします</li>
                  <li>製品の機能に支障をきたす不調は交換対象となります</li>
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  有償交換について
                </h4>
                <ul className="space-y-1 pl-6 list-disc">
                  <li>外装の損傷や汚損による交換は実費をご負担いただきます</li>
                  <li>故意による破損、改造痕跡がある場合は有償交換となります</li>
                  <li>水没、落下による物理的損傷は有償交換の対象です</li>
                  <li>コンセント端子の破損は使用状況により有償の場合があります</li>
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">交換プロセス</h4>
                <ul className="space-y-1 pl-6 list-disc">
                  <li>交換リクエスト送信後、3営業日以内に対応方針をご連絡します</li>
                  <li>交換品の配送は1週間程度お時間をいただきます</li>
                  <li>不調デバイスは交換品到着後に回収いたします</li>
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">注意事項</h4>
                <ul className="space-y-1 pl-6 list-disc">
                  <li>交換リクエストは取り消しできません</li>
                  <li>虚偽の申告が判明した場合、交換費用をご請求する場合があります</li>
                </ul>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                上記規約に同意の上、交換リクエストを送信してください。
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleBack} variant="outline" className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-2" />
                戻る
              </Button>
              <Button 
                onClick={handleFinalExchange} 
                className="flex-1"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    送信中...
                  </>
                ) : (
                  '同意して交換リクエストを送信'
                )}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'select' && 'サブスクデバイス操作'}
            {step === 'issues' && 'デバイス不調の詳細'}
            {step === 'confirm' && '交換内容の確認'}
            {step === 'terms' && 'デバイス交換規約'}
          </DialogTitle>
        </DialogHeader>
        
        {renderStepContent()}
      </DialogContent>
    </Dialog>
  );
}