import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeftRight, Package, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface DeviceActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: {
    serialNumber: string;
    deviceCategory?: string;
  };
}

export function DeviceActionModal({ isOpen, onClose, device }: DeviceActionModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExchange = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/devices/${device.serialNumber}/exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('交換手続きの送信に失敗しました');
      }

      const result = await response.json();
      console.log('交換リクエスト成功:', result);

      toast({
        description: `デバイス ${device.serialNumber} の交換手続きを開始しました`,
      });

      onClose();
    } catch (error) {
      console.error('交換手続きエラー:', error);
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "交換手続き中にエラーが発生しました",
      });
    } finally {
      setIsProcessing(false);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>サブスクデバイス操作</DialogTitle>
        </DialogHeader>
        
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
            <Card className="cursor-pointer hover:shadow-md transition-all duration-200 border-blue-200 hover:border-blue-300">
              <CardContent className="p-4">
                <Button 
                  onClick={handleReturn}
                  variant="ghost" 
                  className="w-full h-auto p-0 justify-start"
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Package className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-foreground">返却</h3>
                      <p className="text-sm text-muted-foreground">
                        サブスクの契約をxx台からxx台に変更
                      </p>
                    </div>
                  </div>
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="cursor-pointer hover:shadow-md transition-all duration-200 border-orange-200 hover:border-orange-300">
              <CardContent className="p-4">
                <Button 
                  onClick={handleExchange}
                  variant="ghost" 
                  className="w-full h-auto p-0 justify-start"
                  disabled={isProcessing}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      {isProcessing ? (
                        <Loader2 className="h-5 w-5 text-orange-600 animate-spin" />
                      ) : (
                        <ArrowLeftRight className="h-5 w-5 text-orange-600" />
                      )}
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-foreground">交換</h3>
                      <p className="text-sm text-muted-foreground">
                        不調があるので別のものと交換する
                      </p>
                    </div>
                  </div>
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <div className="pt-4">
            <Button 
              onClick={onClose} 
              variant="outline" 
              className="w-full"
              disabled={isProcessing}
            >
              キャンセル
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}