import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQueryClient } from "@tanstack/react-query";

interface DeleteStoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  customerData: {
    customer: {
      id: string;
      name: string | null;
      metadata: Record<string, string>;
    };
    subscriptions: any[];
  };
}

export function DeleteStoreModal({ open, onOpenChange, onSuccess, customerData }: DeleteStoreModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // モーダルが開くときの状態初期化とクリーンアップ
  useEffect(() => {
    if (open) {
      setConfirmChecked(false);
      setIsLoading(false);
    }
    
    // モーダルの状態が変わったときにクリーンアップ
    return () => {
      // コンポーネントがアンマウントされるときや、openがfalseになったときに実行
      const cleanup = () => {
        document.body.style.pointerEvents = '';
        document.body.style.removeProperty('pointer-events');
        
        // bodyのstyle属性を完全にチェック
        const bodyStyle = document.body.getAttribute('style');
        if (bodyStyle && bodyStyle.includes('pointer-events')) {
          document.body.setAttribute('style', bodyStyle.replace(/pointer-events:[^;]+;?/g, '').trim());
        }
      };
      
      cleanup();
      // アニメーション完了後にも実行
      setTimeout(cleanup, 500);
    };
  }, [open]);

  const storeName = customerData.customer.metadata?.サロン名 || customerData.customer.name || '店舗名未設定';

  const handleDelete = async () => {
    if (!confirmChecked) {
      toast({
        variant: "destructive",
        title: "確認が必要です",
        description: "削除に関する注意事項に同意してください",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("DELETE", `/api/stores/delete-stripe-customer/${customerData.customer.id}`);

      if (response.ok) {
        toast({
          title: "店舗削除完了",
          description: "店舗が正常に削除されました",
        });
        
        // キャッシュを強制的に無効化
        await queryClient.invalidateQueries({ queryKey: ['stripe-customer'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/stripe/customer'] });
        
        onOpenChange(false);
        onSuccess();
      } else {
        const error = await response.json();
        
        if (error.activeSubscriptions) {
          toast({
            variant: "destructive",
            title: "削除できません",
            description: `${error.activeSubscriptions}件のアクティブなサブスクリプションがあります。先にサブスクリプションをキャンセルしてください。`,
          });
        } else if (error.unpaidInvoices) {
          toast({
            variant: "destructive",
            title: "削除できません",
            description: `${error.unpaidInvoices}件の未払い請求書があります。先に支払いを完了してください。`,
          });
        } else {
          toast({
            variant: "destructive",
            title: "削除エラー",
            description: error.message || "店舗の削除に失敗しました",
          });
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "通信エラー",
        description: "サーバーとの通信に失敗しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            店舗削除の確認
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>「{storeName}」</strong>を削除しようとしています。
            </AlertDescription>
          </Alert>

          <div className="space-y-3 text-sm text-gray-600">
            <p><strong>削除すると以下のデータにアクセスできなくなります：</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>過去のすべての購買履歴</li>
              <li>発行された請求書</li>
              <li>支払い領収書</li>
              <li>取引記録</li>
              <li>顧客情報</li>
            </ul>
            <p className="font-medium text-red-600">
              この操作は元に戻すことができません。
            </p>
          </div>

          <div className="flex items-start space-x-2 p-4 bg-gray-50 rounded-lg">
            <Checkbox
              id="confirmDelete"
              checked={confirmChecked}
              onCheckedChange={(checked) => setConfirmChecked(!!checked)}
            />
            <Label htmlFor="confirmDelete" className="text-sm leading-5">
              上記の内容を理解し、店舗を完全に削除することに同意します
            </Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading || !confirmChecked}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  削除中...
                </>
              ) : (
                "削除する"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}