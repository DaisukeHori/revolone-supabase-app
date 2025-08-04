import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import { Bell, Moon, Shield, ArrowLeft, Loader2, AlertCircle, Key } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useTheme } from "@/hooks/use-theme";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm";

interface MFAStatus {
  enabled: boolean;
  type?: string;
  phoneNumber?: string;
}

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
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [, setLocation] = useLocation();
  const { user } = useUser();

  // MFA設定の取得
  const { data: mfaStatus, isLoading, error, refetch } = useQuery<MFAStatus>({
    queryKey: ['/api/mfa/status'],
  });

  // MFA有効化のミューテーション
  const setupMFAMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/mfa/setup/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: user?.phoneNumber }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
  });

  // SMS認証コードの検証
  const verifySMSMutation = useMutation({
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

      return response.json();
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
        throw new Error(await response.text());
      }

      return response.json();
    },
  });

  const handleMFAToggle = async () => {
    if (!user?.phoneNumber) {
      alert("プロフィールで電話番号を設定してください。");
      return;
    }

    if (mfaStatus?.enabled) {
      // MFAの無効化
      try {
        await disableMFAMutation.mutateAsync();
        refetch();
      } catch (error) {
        console.error('MFA無効化エラー:', error);
      }
    } else {
      // MFAの有効化プロセスを開始
      try {
        await setupMFAMutation.mutateAsync();
        setShowPhoneVerification(true);
      } catch (error) {
        console.error('MFA設定エラー:', error);
      }
    }
  };

  const handleVerifyCode = async () => {
    try {
      await verifySMSMutation.mutateAsync();
      setShowPhoneVerification(false);
      refetch();
    } catch (error) {
      console.error('認証コード検証エラー:', error);
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
                  {!user?.phoneNumber && (
                    <p className="text-sm text-red-500">
                      ※プロフィールで電話番号を設定してください（例：09012345678）
                    </p>
                  )}
                </div>
                <Switch
                  checked={mfaStatus?.enabled || false}
                  onCheckedChange={handleMFAToggle}
                  disabled={!user?.phoneNumber || setupMFAMutation.isPending || disableMFAMutation.isPending}
                />
              </div>

              {/* SMS認証コード入力モーダル */}
              <Dialog open={showPhoneVerification} onOpenChange={setShowPhoneVerification}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>認証コードの確認</DialogTitle>
                    <DialogDescription>
                      登録された電話番号（{user?.phoneNumber}）にSMSで送信された6桁の認証コードを入力してください。
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>認証コード</Label>
                      <Input
                        placeholder="123456"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowPhoneVerification(false)}
                        disabled={verifySMSMutation.isPending}
                      >
                        キャンセル
                      </Button>
                      <Button
                        onClick={handleVerifyCode}
                        disabled={!verificationCode || verifySMSMutation.isPending}
                      >
                        {verifySMSMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        認証する
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="bg-background/95 backdrop-blur-sm border-primary/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Key className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">パスワード変更</CardTitle>
                  <CardDescription>
                    アカウントのパスワードを変更します
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">現在のパスワード</Label>
                  <p className="text-sm text-muted-foreground">
                    セキュリティのため定期的にパスワードを変更することをお勧めします
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowPasswordChange(true)}
                >
                  パスワード変更
                </Button>
              </div>

              {/* パスワード変更モーダル */}
              <Dialog open={showPasswordChange} onOpenChange={setShowPasswordChange}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>パスワードの変更</DialogTitle>
                    <DialogDescription>
                      新しいパスワードを設定してください。パスワードは8文字以上である必要があります。
                    </DialogDescription>
                  </DialogHeader>
                  <ChangePasswordForm onComplete={() => setShowPasswordChange(false)} />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}