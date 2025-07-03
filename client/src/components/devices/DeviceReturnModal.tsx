import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { X, ArrowLeft, Package, CreditCard, Clock } from "lucide-react";

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

type ReturnStep = 'reason' | 'terms' | 'confirmation' | 'shipping' | 'complete';

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
  const { toast } = useToast();

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
        setCurrentStep('confirmation');
        break;
      case 'confirmation':
        setCurrentStep('shipping');
        break;
      case 'shipping':
        handleReturnSubmit();
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'terms':
        setCurrentStep('reason');
        break;
      case 'confirmation':
        setCurrentStep('terms');
        break;
      case 'shipping':
        setCurrentStep('confirmation');
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
    // 実際の実装では、Stripeサブスクリプションの current_period_end を使用
    const currentDate = new Date();
    const endDate = new Date(currentDate);
    endDate.setMonth(endDate.getMonth() + 1);
    return endDate.toLocaleDateString('ja-JP');
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
              <h3 className="text-lg font-semibold mb-4">返却規約</h3>
              <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-3 max-h-64 overflow-y-auto">
                <div>
                  <h4 className="font-semibold">1. 返却条件</h4>
                  <p className="text-gray-700">デバイスは清掃・動作確認済みの状態で返却してください。</p>
                </div>
                <div>
                  <h4 className="font-semibold">2. 料金について</h4>
                  <p className="text-gray-700">返却により台数が減少しますが、既に支払済みの期間分の返金はございません。</p>
                </div>
                <div>
                  <h4 className="font-semibold">3. 配送について</h4>
                  <p className="text-gray-700">専用の返送箱をお送りします。同梱の着払い伝票をご利用ください。</p>
                </div>
                <div>
                  <h4 className="font-semibold">4. 返却完了</h4>
                  <p className="text-gray-700">デバイス受領後、台数減算とメタデータ更新が完了します。</p>
                </div>
              </div>
            </div>
            
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
                <span className="font-semibold">料金について</span>
              </div>
              <div className="text-sm text-gray-700 space-y-1">
                <p>• 台数が1台減算されます</p>
                <p>• 次回請求分から減額されます</p>
                <p>• 既に支払済みの期間分の返金はございません</p>
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
                  currentStep === 'terms' ? 40 :
                  currentStep === 'confirmation' ? 60 :
                  currentStep === 'shipping' ? 80 : 100
                }%` 
              }}
            />
          </div>
        )}
        
        <div className="space-y-6">
          {renderStepContent()}
          
          {currentStep !== 'complete' && currentStep !== 'shipping' && (
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 'reason'}
                className="flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                戻る
              </Button>
              
              <Button
                onClick={handleNext}
                disabled={isProcessing}
              >
                {currentStep === 'confirmation' ? '配送手続きへ' : '次へ'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}