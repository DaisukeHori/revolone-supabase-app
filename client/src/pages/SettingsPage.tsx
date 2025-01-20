import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import { Bell, Moon, Shield, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useTheme } from "@/hooks/use-theme";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";

// ... (アニメーション関連のコードは変更なし)

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const { isDark, toggleTheme } = useTheme();
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // MFA設定の取得
  const { data: mfaStatus, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/mfa/status'],
  });

  // MFA有効化のミューテーション
  const setupMFAMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const response = await fetch('/api/mfa/setup/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "認証コードの送信に失敗しました");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        description: "認証コードを送信しました",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        description: error.message,
      });
      setShowPhoneVerification(false);
    },
  });

  // SMS認証コードの検証
  const verifySMSMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch('/api/mfa/verify/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "認証に失敗しました");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        description: "2段階認証が有効化されました",
      });
      setShowPhoneVerification(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        description: error.message,
      });
    },
  });

  // MFA無効化のミューテーション
  const disableMFAMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/mfa/disable', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "2段階認証の無効化に失敗しました");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        description: "2段階認証を無効化しました",
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['user'] });
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
      await disableMFAMutation.mutateAsync();
    } else {
      setShowPhoneVerification(true);
    }
  };

  const handleSendVerificationCode = async () => {
    if (!phoneNumber) {
      toast({
        variant: "destructive",
        description: "電話番号を入力してください",
      });
      return;
    }

    await setupMFAMutation.mutateAsync(phoneNumber);
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      toast({
        variant: "destructive",
        description: "認証コードを入力してください",
      });
      return;
    }

    await verifySMSMutation.mutateAsync(verificationCode);
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

  if (error) {
    return (
      <AppLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            セキュリティ設定の取得に失敗しました
          </AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            className="hover:bg-primary/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold">設定</h1>
        </div>

        <motion.div variants={item}>
          <Card className="bg-background/95 backdrop-blur-sm border-primary/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Bell className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">通知設定</CardTitle>
                  <CardDescription>
                    通知の受け取り方を管理します
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">メール通知</Label>
                  <p className="text-sm text-muted-foreground">
                    重要なお知らせをメールで受け取ります
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="bg-background/95 backdrop-blur-sm border-primary/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Moon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">表示設定</CardTitle>
                  <CardDescription>
                    アプリケーションの表示方法をカスタマイズします
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">ダークモード</Label>
                  <p className="text-sm text-muted-foreground">
                    暗めの配色に切り替えます
                  </p>
                </div>
                <Switch
                  checked={isDark}
                  onCheckedChange={toggleTheme}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="bg-background/95 backdrop-blur-sm border-primary/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">セキュリティ設定</CardTitle>
                  <CardDescription>
                    アカウントのセキュリティを管理します
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">二段階認証</Label>
                  <p className="text-sm text-muted-foreground">
                    ログイン時に追加の認証を要求します
                  </p>
                </div>
                <Switch
                  checked={mfaStatus?.enabled || false}
                  onCheckedChange={handleMFAToggle}
                  disabled={
                    setupMFAMutation.isPending ||
                    disableMFAMutation.isPending ||
                    verifySMSMutation.isPending
                  }
                />
              </div>

              {/* 電話番号検証のモーダル */}
              <Dialog open={showPhoneVerification} onOpenChange={setShowPhoneVerification}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>2段階認証の設定</DialogTitle>
                    <DialogDescription>
                      2段階認証を有効化するには、電話番号の検証が必要です
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {!setupMFAMutation.isSuccess && (
                      <div className="space-y-2">
                        <Label htmlFor="phone">電話番号</Label>
                        <Input
                          id="phone"
                          placeholder="+818012345678"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          disabled={setupMFAMutation.isPending}
                        />
                        <p className="text-sm text-muted-foreground">
                          国際電話形式で入力してください（例：+818012345678）
                        </p>
                      </div>
                    )}

                    {setupMFAMutation.isSuccess && (
                      <div className="space-y-2">
                        <Label htmlFor="code">認証コード</Label>
                        <Input
                          id="code"
                          placeholder="123456"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          disabled={verifySMSMutation.isPending}
                        />
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowPhoneVerification(false);
                          setPhoneNumber("");
                          setVerificationCode("");
                        }}
                        disabled={setupMFAMutation.isPending || verifySMSMutation.isPending}
                      >
                        キャンセル
                      </Button>
                      {!setupMFAMutation.isSuccess ? (
                        <Button
                          onClick={handleSendVerificationCode}
                          disabled={!phoneNumber || setupMFAMutation.isPending}
                        >
                          {setupMFAMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          認証コードを送信
                        </Button>
                      ) : (
                        <Button
                          onClick={handleVerifyCode}
                          disabled={!verificationCode || verifySMSMutation.isPending}
                        >
                          {verifySMSMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          認証する
                        </Button>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}