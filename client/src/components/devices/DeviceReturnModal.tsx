import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { X, ArrowLeft, Package, CreditCard, Clock, AlertTriangle, ChevronLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Device {
  serialNumber: string;
  status: string;
  statusUpdatedAt: string;
  stripeSubscriptionId: string;
  store: {
    name: string;
    address: string;
  };
  deviceCategory?: string;
  isActionLocked?: boolean;
  lockUntil?: string;
  lastAction?: string;
}

interface DeviceReturnModalProps {
  device: Device;
  isOpen: boolean;
  onClose: () => void;
}

type ReturnStep = 'reason' | 'confirmation' | 'terms' | 'shipping' | 'complete';

const RETURN_REASONS = [
  "故障・不具合",
  "台数削減",
  "店舗閉店",
  "契約終了",
  "その他"
];

export function DeviceReturnModal({ device, isOpen, onClose }: DeviceReturnModalProps) {
  const [currentStep, setCurrentStep] = useState<ReturnStep>('reason');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [additionalInfo, setAdditionalInfo] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const { toast } = useToast();

  // Stripeデータを取得
  const { data: stripeData } = useQuery({
    queryKey: ['stripe-customer'],
    queryFn: async () => {
      const response = await fetch('/api/stripe/customer', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch stripe data');
      }
      return response.json();
    }
  });

  const subscription = stripeData?.find((customer: any) => 
    customer.subscriptions?.some((sub: any) => sub.id === device.stripeSubscriptionId)
  )?.subscriptions?.find((sub: any) => sub.id === device.stripeSubscriptionId);

  const handleClose = () => {
    setCurrentStep('reason');
    setSelectedReason('');
    setAdditionalInfo('');
    setTermsAccepted(false);
    setIsProcessing(false);
    onClose();
  };

  const handleNext = () => {
    switch (currentStep) {
      case 'reason':
        if (!selectedReason) {
          toast({
            variant: "destructive",
            title: "返却理由を選択してください",
            description: "返却理由の選択は必須です。",
          });
          return;
        }
        setCurrentStep('confirmation');
        break;
      case 'confirmation':
        setCurrentStep('terms');
        break;
      case 'terms':
        if (!termsAccepted) {
          toast({
            variant: "destructive",
            title: "規約に同意してください",
            description: "返却規約への同意は必須です。",
          });
          return;
        }
        setCurrentStep('shipping');
        break;
      case 'shipping':
        handleReturnSubmit();
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'confirmation':
        setCurrentStep('reason');
        break;
      case 'terms':
        setCurrentStep('confirmation');
        break;
      case 'shipping':
        setCurrentStep('terms');
        break;
    }
  };

  const handleReturnSubmit = async () => {
    setIsProcessing(true);
    try {
      const returnData = {
        serialNumber: device.serialNumber,
        stripeSubscriptionId: device.stripeSubscriptionId,
        reason: selectedReason,
        additionalInfo: additionalInfo || undefined,
      };

      const response = await fetch('/api/devices/return', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(returnData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '返却処理に失敗しました');
      }

      const result = await response.json();
      console.log('返却処理成功:', result);
      
      setCurrentStep('complete');
    } catch (error) {
      console.error('返却処理エラー:', error);
      toast({
        variant: "destructive",
        title: "返却処理エラー",
        description: error instanceof Error ? error.message : "返却処理中にエラーが発生しました",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getCurrentPeriodEnd = () => {
    if (subscription?.current_period_end) {
      return new Date(subscription.current_period_end * 1000).toLocaleDateString('ja-JP');
    }
    const currentDate = new Date();
    const endDate = new Date(currentDate);
    endDate.setMonth(endDate.getMonth() + 1);
    return endDate.toLocaleDateString('ja-JP');
  };

  const getCurrentTotal = () => {
    if (!subscription?.items) return 0;
    return subscription.items.reduce((total: number, item: any) => {
      const amount = item.amount || 0;
      return total + (amount * item.quantity);
    }, 0);
  };

  const getNewTotal = () => {
    if (!subscription?.items) return 0;
    return subscription.items.reduce((total: number, item: any) => {
      const amount = item.amount || 0;
      // 1台減算後の数量で計算
      const currentQuantity = item.quantity;
      const newQuantity = currentQuantity > 0 ? currentQuantity - 1 : 0;
      return total + (amount * newQuantity);
    }, 0);
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount);
  };

  const handleTermsScroll = (e: React.UIEvent) => {
    const element = e.target as HTMLElement;
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 5;
    if (isAtBottom) {
      setHasReadTerms(true);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'reason':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">返却理由をお選びください</h3>
              <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
                {RETURN_REASONS.map((reason) => (
                  <div key={reason} className="flex items-center space-x-2">
                    <RadioGroupItem value={reason} id={reason} />
                    <Label htmlFor={reason} className="text-sm">{reason}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            
            <div>
              <Label htmlFor="additional-info" className="text-sm font-medium">
                追加情報（任意）
              </Label>
              <Textarea
                id="additional-info"
                placeholder="詳細な理由や状況があれば入力してください"
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>
          </div>
        );

      case 'terms':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">デバイス返却規約</h3>
              <div 
                className="bg-gray-50 p-4 rounded-lg text-sm space-y-4 max-h-64 overflow-y-auto"
                onScroll={handleTermsScroll}
              >
                <div>
                  <h4 className="font-medium mb-3">第1条 返却条件</h4>
                  <ol className="space-y-2 pl-6 list-decimal">
                    <li>デバイスは清掃・動作確認済みの状態で返却してください</li>
                    <li>付属品（電源ケーブル等）も同時に返却してください</li>
                    <li>破損や故障がある場合は事前にご連絡ください</li>
                  </ol>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-3">第2条 料金・返金について</h4>
                  <ol className="space-y-2 pl-6 list-decimal">
                    <li>返却により台数が減少し、次回請求分から減額されます</li>
                    <li>既に支払済みの期間分の返金はございません</li>
                    <li>日割り計算による返金は行いません</li>
                    <li>支払済み期間中はサービスをご利用いただけます</li>
                  </ol>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-3">第3条 配送・返送について</h4>
                  <ol className="space-y-2 pl-6 list-decimal">
                    <li>専用の返送箱を無料でお送りします</li>
                    <li>同梱の着払い伝票をご利用ください（送料無料）</li>
                    <li>破損を防ぐため、しっかりと梱包してください</li>
                    <li>配送中の事故については配送業者の責任となります</li>
                  </ol>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-3">第4条 返却完了</h4>
                  <ol className="space-y-2 pl-6 list-decimal">
                    <li>デバイス受領後、台数減算処理を実行します</li>
                    <li>次回請求分から新しい料金が適用されます</li>
                    <li>返却完了通知をメールでお送りします</li>
                  </ol>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-3">第5条 免責事項</h4>
                  <ol className="space-y-2 pl-6 list-decimal">
                    <li>返却による業務への影響について弊社は責任を負いません</li>
                    <li>データの消失、設定の初期化について弊社は責任を負いません</li>
                    <li>配送中の事故については配送業者の責任となります</li>
                  </ol>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-6">
                  <p className="text-sm font-medium text-center">
                    以上の規約に同意いただける場合のみ、返却リクエストを送信してください。
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

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms-accepted"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                />
                <Label htmlFor="terms-accepted" className="text-sm">
                  上記の返却規約に同意します
                </Label>
              </div>
            </div>
          </div>
        );

      case 'confirmation':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">返却内容の確認</h3>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center mb-3">
                <Package className="w-5 h-5 text-blue-600 mr-2" />
                <span className="font-semibold">返却対象デバイス</span>
              </div>
              <div className="text-sm text-gray-700 space-y-1">
                <p><strong>製造番号:</strong> {device.serialNumber}</p>
                <p><strong>店舗:</strong> {device.store.name}</p>
                <p><strong>返却理由:</strong> {selectedReason}</p>
                {additionalInfo && (
                  <p><strong>追加情報:</strong> {additionalInfo}</p>
                )}
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center mb-3">
                <CreditCard className="w-5 h-5 text-orange-600 mr-2" />
                <span className="font-semibold">料金詳細</span>
              </div>
              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-2">現在の契約</h5>
                  <div className="bg-white rounded p-3 text-xs space-y-1">
                    {subscription?.items?.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between">
                        <span>{item.product?.name || 'Revonizer'} × {item.quantity}台</span>
                        <span>{formatPrice(item.amount * item.quantity)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-1 flex justify-between font-medium">
                      <span>合計</span>
                      <span>{formatPrice(getCurrentTotal())}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-2">返却後の契約</h5>
                  <div className="bg-white rounded p-3 text-xs space-y-1">
                    {subscription?.items?.map((item: any, index: number) => {
                      const newQuantity = item.quantity > 0 ? item.quantity - 1 : 0;
                      return (
                        <div key={index} className="flex justify-between">
                          <span>{item.product?.name || 'Revonizer'} × {newQuantity}台</span>
                          <span>{formatPrice(item.amount * newQuantity)}</span>
                        </div>
                      );
                    })}
                    <div className="border-t pt-1 flex justify-between font-medium">
                      <span>合計</span>
                      <span>{formatPrice(getNewTotal())}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 rounded p-2 text-xs text-red-800">
                  <p><strong>差額:</strong> {formatPrice(getCurrentTotal() - getNewTotal())}/月の減額</p>
                  <p><strong>注意:</strong> 既に支払済みの期間分の返金はございません</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center mb-3">
                <Clock className="w-5 h-5 text-green-600 mr-2" />
                <span className="font-semibold">サービス利用期間</span>
              </div>
              <div className="text-sm text-gray-700">
                <p>現在の支払済み期間: {getCurrentPeriodEnd()}まで</p>
                <p>返却後も上記期間まではサービスをご利用いただけます。</p>
              </div>
            </div>
          </div>
        );

      case 'shipping':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">配送手続き</h3>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center mb-3">
                <Package className="w-5 h-5 text-blue-600 mr-2" />
                <span className="font-semibold">返送用の箱をお送りします</span>
              </div>
              <div className="text-sm text-gray-700 space-y-2">
                <p>• 専用の返送箱が{device.store.address}宛に発送されます</p>
                <p>• 箱の中に着払い伝票が同梱されています</p>
                <p>• デバイスを梱包後、着払い伝票でご返送ください</p>
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg">
              <div className="text-sm text-gray-700 space-y-2">
                <p><strong>返送時の注意事項:</strong></p>
                <p>• デバイスは清掃してから梱包してください</p>
                <p>• 付属品（電源ケーブル等）も一緒に返送してください</p>
                <p>• 破損を防ぐため、しっかりと梱包してください</p>
              </div>
            </div>

            <div className="text-center">
              <Button
                onClick={handleNext}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? "処理中..." : "返却手続きを完了する"}
              </Button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Package className="w-8 h-8 text-green-600" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">返却手続きが完了しました</h3>
              <p className="text-gray-600">
                デバイス {device.serialNumber} の返却処理が完了しました。
              </p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg text-left">
              <div className="text-sm text-gray-700 space-y-2">
                <p><strong>今後の流れ:</strong></p>
                <p>1. 返送用の箱が発送されます（2-3営業日）</p>
                <p>2. 箱到着後、デバイスを梱包して返送</p>
                <p>3. 返送完了後、台数減算が反映されます</p>
                <p>4. 次回請求分から減額されます</p>
              </div>
            </div>
            
            <Button onClick={handleClose} className="w-full">
              閉じる
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'reason': return '返却理由';
      case 'terms': return '返却規約';
      case 'confirmation': return '内容確認';
      case 'shipping': return '配送手続き';
      case 'complete': return '手続き完了';
      default: return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              デバイス返却 - {getStepTitle()}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        {/* プログレスバー */}
        {currentStep !== 'complete' && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${
                  currentStep === 'reason' ? 20 :
                  currentStep === 'confirmation' ? 40 :
                  currentStep === 'terms' ? 60 :
                  currentStep === 'shipping' ? 80 : 100
                }%` 
              }}
            />
          </div>
        )}
        
        <div className="space-y-6">
          {renderStepContent()}
          
          {currentStep !== 'complete' && currentStep !== 'shipping' && (
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 'reason'}
                className="flex items-center flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                戻る
              </Button>
              
              <Button
                onClick={handleNext}
                disabled={isProcessing || (currentStep === 'terms' && (!termsAccepted || !hasReadTerms))}
                className="flex-1"
              >
                {currentStep === 'terms' ? '規約に同意して配送手続きへ' : '次へ'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}