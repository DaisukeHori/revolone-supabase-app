import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MFAStatus {
  enabled: boolean;
  type?: string;
  phoneNumber?: string;
}

interface MFASetupResponse {
  success: boolean;
  message?: string;
}

interface MFAVerifyResponse {
  success: boolean;
  message?: string;
}

export default function SecuritySettingsPage() {
  const { toast } = useToast();
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // MFA設定の取得
  const { data: mfaStatus, isLoading, error, refetch } = useQuery<MFAStatus>({
    queryKey: ['/api/mfa/status'],
  });

  // MFA有効化のミューテーション
  const setupMFAMutation = useMutation<MFASetupResponse, Error, void>({
    mutationFn: async () => {
      const response = await fetch('/api/mfa/setup/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      toast({
        description: "認証コードを送信しました",
      });
      setShowPhoneVerification(true);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        description: error.message,
      });
    },
  });

  // SMS認証コードの検証
  const verifySMSMutation = useMutation<MFAVerifyResponse, Error, void>({
    mutationFn: async () => {
      const response = await fetch('/api/mfa/verify/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      toast({
        description: "電話番号の検証が完了しました",
      });
      setShowPhoneVerification(false);
      refetch();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        description: error.message,
      });
    },
  });

  // MFA無効化のミューテーション
  const disableMFAMutation = useMutation<{ success: boolean }, Error, void>({
    mutationFn: async () => {
      const response = await fetch('/api/mfa/disable', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      toast({
        description: "2段階認証を無効化しました",
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        description: error.message,
      });
    },
  });

  const handleMFAToggle = async () => {
    if (mfaStatus?.enabled) {
      // MFAの無効化
      await disableMFAMutation.mutateAsync();
    } else {
      // MFAの有効化プロセスを開始
      setShowPhoneVerification(true);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (error instanceof Error) {
    return (
      <AppLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            セキュリティ設定の取得に失敗しました: {error.message}
          </AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>セキュリティ設定</CardTitle>
            <CardDescription>
              アカウントのセキュリティ設定を管理します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 2段階認証の設定 */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-sm font-medium">2段階認証</h4>
                <p className="text-sm text-muted-foreground">
                  アカウントの安全性を高めるため、ログイン時に追加の認証を要求します
                </p>
              </div>
              <Switch
                checked={mfaStatus?.enabled || false}
                onCheckedChange={handleMFAToggle}
                disabled={setupMFAMutation.isPending || disableMFAMutation.isPending}
              />
            </div>

            {/* 電話番号検証のモーダル */}
            <Dialog open={showPhoneVerification} onOpenChange={setShowPhoneVerification}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>電話番号の検証</DialogTitle>
                  <DialogDescription>
                    2段階認証を有効化するには、電話番号の検証が必要です
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">電話番号</Label>
                    <Input
                      id="phone"
                      placeholder="+818012345678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      国際電話形式で入力してください（例：+818012345678）
                    </p>
                  </div>
                  {setupMFAMutation.isSuccess && (
                    <div className="space-y-2">
                      <Label htmlFor="code">認証コード</Label>
                      <Input
                        id="code"
                        placeholder="123456"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowPhoneVerification(false)}
                      disabled={setupMFAMutation.isPending || verifySMSMutation.isPending}
                    >
                      キャンセル
                    </Button>
                    {!setupMFAMutation.isSuccess ? (
                      <Button
                        onClick={() => setupMFAMutation.mutate()}
                        disabled={!phoneNumber || setupMFAMutation.isPending}
                      >
                        {setupMFAMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        認証コードを送信
                      </Button>
                    ) : (
                      <Button
                        onClick={() => verifySMSMutation.mutate()}
                        disabled={!verificationCode || verifySMSMutation.isPending}
                      >
                        {verifySMSMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        検証する
                      </Button>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}