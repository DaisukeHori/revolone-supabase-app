import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeftRight, Package, Loader2, ChevronLeft, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { DeviceReturnModal } from "./DeviceReturnModal";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { calculateTotalQuantityFromItems } from "@/lib/revonizerCalculation";

interface DeviceActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: {
    serialNumber: string;
    stripeSubscriptionId: string;
    deviceCategory?: string;
    isActionLocked?: boolean;
    lockUntil?: Date;
    lastActionType?: string;
  };
  stripeCustomerId: string;
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

export function DeviceActionModal({ isOpen, onClose, device, stripeCustomerId }: DeviceActionModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalQuantity, setTotalQuantity] = useState<number>(0);
  const [step, setStep] = useState<'select' | 'issues' | 'confirm' | 'terms' | 'success'>('select');
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);


  // モーダルがクローズされたときにステートをリセット
  useEffect(() => {
    if (!isOpen) {
      setStep('select');
      setSelectedIssues([]);
      setNotes('');
      setIsProcessing(false);
      setHasReadTerms(false);
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
        notes: notes.trim() || undefined,
        customerId: stripeCustomerId,
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

      setStep('success');
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
    setIsReturnModalOpen(true);
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
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                製造番号: {device.serialNumber}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                実行したい操作を選択してください
              </p>
            </div>

            {device.isActionLocked && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  このデバイスは操作が制限されています。
                  <br />
                  制限解除日: {device.lockUntil ? new Date(device.lockUntil).toLocaleDateString('ja-JP') : '不明'}
                  <br />
                  前回の操作: {device.lastActionType === 'return' ? '返却' : '交換'}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-4">
              {device.deviceCategory === 'サブスク' && (
                <Button 
                  onClick={handleExchangeStart}
                  className="h-16 text-left justify-start p-6"
                  variant="outline"
                  disabled={device.isActionLocked}
                >
                  <div>
                    <div className="font-semibold">交換を申請する</div>
                    <div className="text-sm text-gray-500 mt-1">
                      デバイスに不調がある場合の交換手続き
                    </div>
                  </div>
                </Button>
              )}

              <Button 
                onClick={handleReturn}
                className="h-16 text-left justify-start p-6"
                variant="outline"
                disabled={device.isActionLocked || isProcessing}
              >
                <div>
                  <div className="font-semibold">返却する</div>
                  <div className="text-sm text-gray-500 mt-1">
                    デバイスを返却し、台数を1台減算する
                  </div>
                </div>
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
              <p className="text-xs text-muted-foreground mt-1">
                最後までお読みください
              </p>
            </div>

            <div 
              className="max-h-64 overflow-y-auto bg-gray-50 rounded-lg p-4 text-sm space-y-4 border"
              onScroll={(e) => {
                const element = e.target as HTMLDivElement;
                const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 5;
                setHasReadTerms(isAtBottom);
              }}
            >
              <div className="text-center font-medium text-base mb-4">
                Revol One レボナイザー デバイス交換規約
              </div>

              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  第1条 交換対象について
                </h4>
                <ol className="space-y-2 pl-6 list-decimal">
                  <li>自然故障による機能不具合は無償で交換対応いたします</li>
                  <li>製品の正常な機能に支障をきたす不調は交換対象となります</li>
                  <li>交換の判断は弊社の技術的判断に基づいて決定いたします</li>
                </ol>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  第2条 有償交換について
                </h4>
                <ol className="space-y-2 pl-6 list-decimal">
                  <li>外装の損傷、汚損、変色による交換は実費（10,000円～15,000円）をご負担いただきます</li>
                  <li>故意による破損、改造痕跡がある場合は有償交換（実費全額）となります</li>
                  <li>水没、落下による物理的損傷は有償交換の対象です</li>
                  <li>紛失の場合は代替品費用（198,000円）をご請求いたします</li>
                </ol>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">第3条 交換プロセス</h4>
                <ol className="space-y-2 pl-6 list-decimal">
                  <li>交換リクエスト送信後、3営業日以内にリファービッシュ品を発送いたします</li>
                  <li>到着後は必ず申請時と同じシリアル番号の機材を同梱の着払い送り状で返送してください</li>
                  <li>代替品到着後1週間以内に返送いただけない場合、追加のサブスクリプション費用が発生する場合があります</li>
                  <li>返送品の検証後、最終的な交換判定を行います</li>
                </ol>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">第4条 重要な注意事項</h4>
                <ol className="space-y-2 pl-6 list-decimal">
                  <li>交換リクエストは送信後取り消しできません</li>
                  <li>虚偽の申告が判明した場合、交換費用および手数料をご請求いたします</li>
                  <li>本規約は予告なく変更される場合があります</li>
                  <li>代替品も同様にサブスクリプション契約の対象となります</li>
                </ol>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">第5条 免責事項</h4>
                <ol className="space-y-2 pl-6 list-decimal">
                  <li>交換による業務への影響について弊社は責任を負いません</li>
                  <li>データの消失、設定の初期化について弊社は責任を負いません</li>
                  <li>配送中の事故については配送業者の責任となります</li>
                </ol>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-6">
                <p className="text-sm font-medium text-center">
                  以上の規約に同意いただける場合のみ、交換リクエストを送信してください。
                </p>
              </div>
            </div>

            {!hasReadTerms && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  規約を最後までお読みください
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button onClick={handleBack} variant="outline" className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-2" />
                戻る
              </Button>
              <Button 
                onClick={handleFinalExchange} 
                className="flex-1"
                disabled={isProcessing || !hasReadTerms}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    送信中...
                  </>
                ) : (
                  '規約に同意して交換リクエストを送信'
                )}
              </Button>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="space-y-4 py-4">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-green-800 mb-2">
                交換リクエストを送信しました
              </h3>
              <p className="text-sm text-gray-600">
                デバイス {device.serialNumber} の交換リクエストが正常に処理されました。
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-blue-900">次のステップ</h4>
              <ul className="text-sm text-blue-800 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="font-medium">1.</span>
                  <span>3営業日以内にリファービッシュ品を発送いたします</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium">2.</span>
                  <span>到着後、同じシリアル番号の機材を着払い送り状で返送してください</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium">3.</span>
                  <span>到着後1週間以内に返送いただけない場合、追加費用が発生する場合があります</span>
                </li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                <strong>重要：</strong> 必ず申請時と同じシリアル番号（{device.serialNumber}）の機材を返送してください。
              </p>
            </div>

            <div className="pt-4">
              <Button onClick={onClose} className="w-full">
                完了
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {step === 'select' && 'サブスクデバイス操作'}
              {step === 'issues' && 'デバイス不調の詳細'}
              {step === 'confirm' && '交換内容の確認'}
              {step === 'terms' && 'デバイス交換規約'}
              {step === 'success' && '交換リクエスト完了'}
            </DialogTitle>
          </DialogHeader>

          {renderStepContent()}
        </DialogContent>
      </Dialog>
      
      {/* 返却モーダル */}
      <DeviceReturnModal
        device={{
          serialNumber: device.serialNumber,
          status: "出荷",
          statusUpdatedAt: new Date().toISOString(),
          stripeSubscriptionId: device.stripeSubscriptionId,
          store: {
            name: "店舗名",
            address: "住所"
          },
          deviceCategory: device.deviceCategory,
          isActionLocked: device.isActionLocked,
          lockUntil: device.lockUntil ? new Date(device.lockUntil).toISOString() : undefined,
          lastAction: device.lastActionType
        }}
        isOpen={isReturnModalOpen}
        onClose={() => {
          setIsReturnModalOpen(false);
          onClose(); // 親モーダルも閉じる
        }}
      />
    </>
  );
}