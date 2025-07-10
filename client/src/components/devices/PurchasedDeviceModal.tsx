import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Wrench, 
  FileText, 
  ChevronLeft, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Package,
  Calendar,
  User,
  Phone,
  Mail
} from "lucide-react";

interface PurchasedDevice {
  serialNumber: string;
  status: string;
  statusUpdatedAt: string;
  store: {
    name: string;
    address: string;
  };
  subscriptionRentalAvailability?: string;
}

interface PurchasedDeviceModalProps {
  device: PurchasedDevice;
  isOpen: boolean;
  onClose: () => void;
}

type RepairStep = 'select' | 'issues' | 'confirm' | 'complete';

const REPAIR_ISSUES = [
  'オゾンが出ない',
  'エアーが出ない', 
  '表示がおかしい',
  'ダイヤルが反応しない',
  'ポンプがおかしい',
  '異音がする',
  'コンセントの端子が壊れた',
  '異常発熱する',
  'その他の不具合'
];

const REPAIR_HISTORY = [
  {
    id: 1,
    date: '2024-12-15',
    issue: 'オゾンが出ない',
    status: '完了',
    repairDetails: '内部フィルター交換、オゾン発生器調整',
    cost: 8500,
    warranty: false
  },
  {
    id: 2,
    date: '2024-11-20',
    issue: 'ダイヤルが反応しない',
    status: '完了',
    repairDetails: 'ダイヤル基板交換',
    cost: 12000,
    warranty: true
  },
  {
    id: 3,
    date: '2024-10-05',
    issue: '表示がおかしい',
    status: '完了',
    repairDetails: 'ディスプレイ交換',
    cost: 15000,
    warranty: false
  }
];

export function PurchasedDeviceModal({ device, isOpen, onClose }: PurchasedDeviceModalProps) {
  const [activeTab, setActiveTab] = useState<'repair' | 'history'>('repair');
  const [repairStep, setRepairStep] = useState<RepairStep>('select');
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // 修理履歴を取得するクエリ
  const { data: repairHistory, isLoading: isLoadingHistory, error: historyError } = useQuery({
    queryKey: ['repair-history', device.serialNumber],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/devices/${device.serialNumber}/repair-history`);
      return response.json();
    },
    enabled: isOpen && activeTab === 'history',
  });

  const handleClose = () => {
    setActiveTab('repair');
    setRepairStep('select');
    setSelectedIssues([]);
    setAdditionalInfo('');
    setIsProcessing(false);
    onClose();
  };

  const handleIssueToggle = (issue: string) => {
    setSelectedIssues(prev => 
      prev.includes(issue) 
        ? prev.filter(i => i !== issue)
        : [...prev, issue]
    );
  };

  const handleNext = () => {
    switch (repairStep) {
      case 'select':
        setRepairStep('issues');
        break;
      case 'issues':
        if (selectedIssues.length === 0) {
          toast({
            variant: "destructive",
            title: "修理内容を選択してください",
            description: "少なくとも1つの不具合を選択してください。",
          });
          return;
        }
        setRepairStep('confirm');
        break;
      case 'confirm':
        handleSubmitRepair();
        break;
    }
  };

  const handleBack = () => {
    switch (repairStep) {
      case 'issues':
        setRepairStep('select');
        break;
      case 'confirm':
        setRepairStep('issues');
        break;
    }
  };

  const handleSubmitRepair = async () => {
    setIsProcessing(true);
    try {
      // 修理申請のAPI呼び出し
      const response = await fetch('/api/devices/repair-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          serialNumber: device.serialNumber,
          issues: selectedIssues,
          additionalInfo: additionalInfo,
          deviceType: 'purchased'
        }),
      });

      if (!response.ok) {
        throw new Error('修理申請に失敗しました');
      }

      setRepairStep('complete');
      toast({
        title: "修理申請を受け付けました",
        description: "担当者から連絡いたします。",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "修理申請エラー",
        description: "申請の送信に失敗しました。再度お試しください。",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderRepairContent = () => {
    switch (repairStep) {
      case 'select':
        return (
          <div className="space-y-4">
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wrench className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">修理申請</h3>
              <p className="text-sm text-gray-600">
                デバイス {device.serialNumber} の修理を申請します
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-900">修理について</h4>
                  <ul className="text-sm text-amber-800 mt-2 space-y-1">
                    <li>• 保証期間内の自然故障は無償修理</li>
                    <li>• 保証期間外、または人為的な破損は有償修理</li>
                    <li>• 修理費用は事前にお見積もりします</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleNext} className="flex-1">
                修理申請を開始
              </Button>
            </div>
          </div>
        );

      case 'issues':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-4">不具合の詳細</h3>
              <p className="text-sm text-gray-600 mb-4">
                該当する不具合をすべて選択してください
              </p>
              <div className="space-y-2">
                {REPAIR_ISSUES.map((issue) => (
                  <div key={issue} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={issue}
                      checked={selectedIssues.includes(issue)}
                      onChange={() => handleIssueToggle(issue)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor={issue} className="text-sm">
                      {issue}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="additional-info" className="text-sm font-medium">
                追加情報（任意）
              </Label>
              <Textarea
                id="additional-info"
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder="詳細な症状や使用状況をご記入ください"
                className="mt-2"
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-2" />
                戻る
              </Button>
              <Button onClick={handleNext} className="flex-1">
                確認画面へ
              </Button>
            </div>
          </div>
        );

      case 'confirm':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-4">修理申請内容の確認</h3>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">デバイス情報</span>
              </div>
              <div className="pl-6 space-y-1">
                <p className="text-sm">シリアル番号: {device.serialNumber}</p>
                <p className="text-sm">店舗: {device.store.name}</p>
                <p className="text-sm">住所: {device.store.address}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">選択した不具合</span>
              </div>
              <div className="pl-6">
                <ul className="space-y-1">
                  {selectedIssues.map((issue) => (
                    <li key={issue} className="text-sm flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {additionalInfo && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium">追加情報</span>
                </div>
                <div className="pl-6">
                  <p className="text-sm">{additionalInfo}</p>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">次のステップ</h4>
                  <ul className="text-sm text-blue-800 mt-2 space-y-1">
                    <li>• 修理申請を受け付け後、担当者から連絡いたします</li>
                    <li>• 修理費用のお見積もりをお送りします</li>
                    <li>• 承認後、修理スケジュールを調整します</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-2" />
                戻る
              </Button>
              <Button onClick={handleNext} disabled={isProcessing} className="flex-1">
                {isProcessing ? '送信中...' : '修理申請を送信'}
              </Button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-4 py-4">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-green-800 mb-2">
                修理申請を受け付けました
              </h3>
              <p className="text-sm text-gray-600">
                デバイス {device.serialNumber} の修理申請が正常に処理されました。
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-blue-900">次のステップ</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 2営業日以内に担当者から連絡いたします</li>
                <li>• 修理費用のお見積もりをお送りします</li>
                <li>• 承認後、修理スケジュールを調整します</li>
              </ul>
            </div>

            <div className="pt-4">
              <Button onClick={handleClose} className="w-full">
                完了
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderHistoryContent = () => {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-4">修理履歴</h3>
          <p className="text-sm text-gray-600 mb-4">
            デバイス {device.serialNumber} の過去の修理記録
          </p>
        </div>

        {isLoadingHistory ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : historyError ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600 text-sm">修理履歴の取得に失敗しました</p>
            <p className="text-gray-500 text-xs mt-1">{historyError.message}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {repairHistory && repairHistory.length > 0 ? (
              repairHistory.map((record: any) => (
                <div key={record.$id.value} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium">
                        {record.日時?.value ? new Date(record.日時.value).toLocaleDateString('ja-JP') : '日付不明'}
                      </span>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      record.修理完了フラグ?.value === '完了' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {record.修理完了フラグ?.value === '完了' ? '完了' : '処理中'}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-gray-600" />
                      <span className="text-sm">修理項目: {record.修理項目?.value || '不明'}</span>
                    </div>
                    
                    {record.メインユニット交換故障項目?.value && record.メインユニット交換故障項目.value.length > 0 && (
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-gray-600 mt-0.5" />
                        <div className="text-sm">
                          <div className="font-medium">故障項目:</div>
                          <ul className="text-xs text-gray-600 mt-1 space-y-1">
                            {record.メインユニット交換故障項目.value.map((item: string, index: number) => (
                              <li key={index}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        修理費用: {record.確定修理金額?.value ? 
                          `¥${parseInt(record.確定修理金額.value).toLocaleString()}` : 
                          '未確定'
                        }
                      </span>
                      {record.保証対象?.value === 'はい' && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          保証適用
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">修理履歴がありません</p>
                <p className="text-sm text-gray-400 mt-1">
                  このデバイスの修理記録は見つかりませんでした
                </p>
              </div>
            )}
          </div>
        )}

        <div className="pt-4">
          <Button onClick={handleClose} className="w-full">
            閉じる
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            購入機材管理 - {device.serialNumber}
          </DialogTitle>
        </DialogHeader>

        {/* タブ切り替え */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === 'repair' ? 'default' : 'outline'}
            onClick={() => setActiveTab('repair')}
            className="flex-1"
          >
            <Wrench className="w-4 h-4 mr-2" />
            修理申請
          </Button>
          <Button
            variant={activeTab === 'history' ? 'default' : 'outline'}
            onClick={() => setActiveTab('history')}
            className="flex-1"
          >
            <FileText className="w-4 h-4 mr-2" />
            修理履歴
          </Button>
        </div>

        {/* プログレスバー（修理申請時のみ） */}
        {activeTab === 'repair' && repairStep !== 'complete' && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${
                  repairStep === 'select' ? 25 :
                  repairStep === 'issues' ? 50 :
                  repairStep === 'confirm' ? 75 : 100
                }%` 
              }}
            />
          </div>
        )}

        <div className="space-y-6">
          {activeTab === 'repair' ? renderRepairContent() : renderHistoryContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}