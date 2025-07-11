import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { User, Mail, AlertCircle, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const emailChangeSchema = z.object({
  newEmail: z.string().email("有効なメールアドレスを入力してください"),
});

type EmailChangeForm = z.infer<typeof emailChangeSchema>;

const verificationCodeSchema = z.object({
  verificationCode: z.string().length(6, "認証コードは6桁です"),
});

type VerificationCodeForm = z.infer<typeof verificationCodeSchema>;

export default function ProfilePage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [emailChangeStep, setEmailChangeStep] = useState<'form' | 'verification' | 'success'>('form');
  const [pendingEmail, setPendingEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const emailForm = useForm<EmailChangeForm>({
    resolver: zodResolver(emailChangeSchema),
    defaultValues: {
      newEmail: '',
    },
  });

  const verificationForm = useForm<VerificationCodeForm>({
    resolver: zodResolver(verificationCodeSchema),
    defaultValues: {
      verificationCode: '',
    },
  });

  const handleEmailChangeSubmit = async (data: EmailChangeForm) => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/email-change/request', {
        newEmail: data.newEmail,
      });

      if (response.ok) {
        setPendingEmail(data.newEmail);
        setEmailChangeStep('verification');
        toast({
          title: "認証メールを送信しました",
          description: `${data.newEmail} に認証コードを送信しました。`,
        });
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "エラー",
          description: error.message || "メールアドレス変更の申請に失敗しました",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "メールアドレス変更の申請に失敗しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationSubmit = async (data: VerificationCodeForm) => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/email-change/verify', {
        verificationCode: data.verificationCode,
      });

      if (response.ok) {
        setEmailChangeStep('success');
        toast({
          title: "メールアドレスが変更されました",
          description: "Stripeの顧客情報も更新されました。",
        });
        // ユーザー情報を再取得
        window.location.reload();
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "認証エラー",
          description: error.message || "認証コードが正しくありません",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "認証に失敗しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/email-change/resend', {
        newEmail: pendingEmail,
      });

      if (response.ok) {
        toast({
          title: "認証メールを再送信しました",
          description: `${pendingEmail} に認証コードを再送信しました。`,
        });
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "エラー",
          description: error.message || "認証メールの再送信に失敗しました",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "認証メールの再送信に失敗しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetEmailChange = () => {
    setEmailChangeStep('form');
    setPendingEmail('');
    emailForm.reset();
    verificationForm.reset();
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">プロフィール</h1>
        <p className="text-gray-600">アカウント情報を管理します</p>
      </div>

      <div className="space-y-6">
        {/* 基本情報 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              基本情報
            </CardTitle>
            <CardDescription>
              アカウントの基本情報です
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">ユーザー名</Label>
                <Input
                  id="username"
                  value={user.username}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label htmlFor="current-email">現在のメールアドレス</Label>
                <Input
                  id="current-email"
                  value={user.email}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* メールアドレス変更 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              メールアドレス変更
            </CardTitle>
            <CardDescription>
              メールアドレスを変更します。Stripeの顧客情報も自動的に更新されます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {emailChangeStep === 'form' && (
              <form onSubmit={emailForm.handleSubmit(handleEmailChangeSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="newEmail">新しいメールアドレス</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    placeholder="新しいメールアドレスを入力"
                    {...emailForm.register('newEmail')}
                  />
                  {emailForm.formState.errors.newEmail && (
                    <p className="text-sm text-red-600 mt-1">
                      {emailForm.formState.errors.newEmail.message}
                    </p>
                  )}
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    新しいメールアドレスに認証コードが送信されます。
                    認証が完了すると、Stripeの顧客情報も自動的に更新されます。
                  </AlertDescription>
                </Alert>

                <Button type="submit" disabled={isLoading}>
                  {isLoading ? '送信中...' : '認証メールを送信'}
                </Button>
              </form>
            )}

            {emailChangeStep === 'verification' && (
              <div className="space-y-4">
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    {pendingEmail} に認証コードを送信しました。
                    メールを確認して、6桁の認証コードを入力してください。
                  </AlertDescription>
                </Alert>

                <form onSubmit={verificationForm.handleSubmit(handleVerificationSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="verificationCode">認証コード</Label>
                    <Input
                      id="verificationCode"
                      type="text"
                      placeholder="6桁の認証コードを入力"
                      maxLength={6}
                      {...verificationForm.register('verificationCode')}
                    />
                    {verificationForm.formState.errors.verificationCode && (
                      <p className="text-sm text-red-600 mt-1">
                        {verificationForm.formState.errors.verificationCode.message}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? '認証中...' : '認証'}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleResendCode} disabled={isLoading}>
                      再送信
                    </Button>
                    <Button type="button" variant="outline" onClick={resetEmailChange}>
                      キャンセル
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {emailChangeStep === 'success' && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  メールアドレスが正常に変更されました。
                  Stripeの顧客情報も更新されました。
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}