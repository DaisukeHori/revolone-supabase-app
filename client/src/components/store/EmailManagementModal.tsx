
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail, History, AlertTriangle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const changeEmailSchema = z.object({
  newEmail: z.string().email("有効なメールアドレスを入力してください"),
  reason: z.string().optional(),
});

type ChangeEmailForm = z.infer<typeof changeEmailSchema>;

interface EmailMappingHistory {
  id: number;
  originalEmail: string;
  currentEmail: string;
  changeReason?: string;
  isActive: boolean;
  createdAt: string;
  changedByUser: {
    username: string;
    email: string;
  };
}

interface EmailManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: number;
  storeName: string;
  currentStripeEmail?: string;
}

export function EmailManagementModal({
  isOpen,
  onClose,
  storeId,
  storeName,
  currentStripeEmail,
}: EmailManagementModalProps) {
  const [showHistory, setShowHistory] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<ChangeEmailForm>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: {
      newEmail: "",
      reason: "",
    },
  });

  // メールアドレス変更履歴を取得
  const { data: emailHistory, isLoading: historyLoading } = useQuery<EmailMappingHistory[]>({
    queryKey: ["emailHistory", storeId],
    queryFn: async () => {
      const response = await fetch(`/api/stores/${storeId}/email-history`);
      if (!response.ok) {
        throw new Error("履歴の取得に失敗しました");
      }
      return response.json();
    },
    enabled: isOpen,
  });

  // メールアドレス変更のmutation
  const changeEmailMutation = useMutation({
    mutationFn: async (data: ChangeEmailForm) => {
      const response = await fetch(`/api/stores/${storeId}/change-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "メールアドレスの変更に失敗しました");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailHistory", storeId] });
      queryClient.invalidateQueries({ queryKey: ["stripe-customer"] });
      form.reset();
      onClose();
    },
  });

  // メールアドレス復元のmutation
  const revertEmailMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/stores/${storeId}/revert-email`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "メールアドレスの復元に失敗しました");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailHistory", storeId] });
      queryClient.invalidateQueries({ queryKey: ["stripe-customer"] });
      onClose();
    },
  });

  const onSubmit = (data: ChangeEmailForm) => {
    changeEmailMutation.mutate({
      newEmail: data.newEmail,
      reason: data.reason,
    });
  };

  const handleRevert = () => {
    if (confirm("本当にメールアドレスを元に戻しますか？")) {
      revertEmailMutation.mutate();
    }
  };

  const activeMapping = emailHistory?.find(mapping => mapping.isActive);
  const currentDisplayEmail = activeMapping?.currentEmail || currentStripeEmail;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            メールアドレス管理: {storeName}
          </DialogTitle>
          <DialogDescription>
            この店舗のメールアドレス設定を管理できます
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 現在の状態表示 */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">現在の設定</h3>
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Stripe登録メール:</span>
                <span className="font-mono text-sm">{currentStripeEmail || "不明"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">現在の有効メール:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{currentDisplayEmail || "未設定"}</span>
                  {activeMapping && (
                    <Badge variant="secondary" className="text-xs">カスタム</Badge>
                  )}
                </div>
              </div>
            </div>

            {activeMapping && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  現在カスタムメールアドレスが設定されています。このメールアドレスでStripe顧客情報を検索します。
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Separator />

          {/* メールアドレス変更フォーム */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">メールアドレスを変更</h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="newEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>新しいメールアドレス</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="new-email@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>変更理由（任意）</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="変更理由を入力してください..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={changeEmailMutation.isPending}
                    className="flex-1"
                  >
                    {changeEmailMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "変更を適用"
                    )}
                  </Button>
                  
                  {activeMapping && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRevert}
                      disabled={revertEmailMutation.isPending}
                    >
                      {revertEmailMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "元に戻す"
                      )}
                    </Button>
                  )}
                </div>
              </form>
            </Form>

            {(changeEmailMutation.error || revertEmailMutation.error) && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {changeEmailMutation.error?.message || revertEmailMutation.error?.message}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Separator />

          {/* 変更履歴 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">変更履歴</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1"
              >
                <History className="h-4 w-4" />
                {showHistory ? "非表示" : "表示"}
              </Button>
            </div>

            {showHistory && (
              <div className="space-y-2">
                {historyLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : emailHistory && emailHistory.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {emailHistory.map((mapping) => (
                      <div
                        key={mapping.id}
                        className="p-3 border rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{mapping.currentEmail}</span>
                            {mapping.isActive && (
                              <Badge variant="default" className="text-xs">現在</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(mapping.createdAt).toLocaleDateString("ja-JP")}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>変更者: {mapping.changedByUser.username}</div>
                          {mapping.changeReason && (
                            <div>理由: {mapping.changeReason}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    変更履歴がありません
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
