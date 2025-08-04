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
import { User, Mail, Edit2, Check, X, AlertCircle, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { AppLayout } from "@/components/layout/AppLayout";

const profileSchema = z.object({
  username: z.string().min(1, "名前は必須です"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  phoneNumber: z.string().optional().refine(
    (val) => !val || /^0\d{9,10}$/.test(val),
    "日本の電話番号形式で入力してください（例：09012345678）"
  ),
});

type ProfileForm = z.infer<typeof profileSchema>;

const verificationCodeSchema = z.object({
  verificationCode: z.string().length(6, "認証コードは6桁です"),
});

type VerificationCodeForm = z.infer<typeof verificationCodeSchema>;

export default function ProfilePage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [editingField, setEditingField] = useState<'username' | 'email' | 'phoneNumber' | null>(null);
  const [emailChangeStep, setEmailChangeStep] = useState<'form' | 'verification' | 'success'>('form');
  const [pendingEmail, setPendingEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || '',
      email: user?.email || '',
      phoneNumber: user?.phoneNumber || '',
    },
  });

  const verificationForm = useForm<VerificationCodeForm>({
    resolver: zodResolver(verificationCodeSchema),
    defaultValues: {
      verificationCode: '',
    },
  });

  const handleUsernameEdit = () => {
    setEditingField('username');
    profileForm.setValue('username', user?.username || '');
  };

  const handleEmailEdit = () => {
    setEditingField('email');
    setEmailChangeStep('form');
    profileForm.setValue('email', user?.email || '');
  };

  const handlePhoneEdit = () => {
    setEditingField('phoneNumber');
    profileForm.setValue('phoneNumber', user?.phoneNumber || '');
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEmailChangeStep('form');
    setPendingEmail('');
    profileForm.reset({
      username: user?.username || '',
      email: user?.email || '',
      phoneNumber: user?.phoneNumber || '',
    });
    verificationForm.reset();
  };

  const handleUsernameSubmit = async (data: ProfileForm) => {
    setIsLoading(true);
    try {
      const response = await apiRequest('PUT', '/api/profile', {
        username: data.username,
      });

      if (response.ok) {
        toast({
          title: "更新完了",
          description: "名前が更新されました",
        });
        setEditingField(null);
        // ユーザー情報を再取得
        window.location.reload();
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "エラー",
          description: error.message || "名前の更新に失敗しました",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "名前の更新に失敗しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChangeSubmit = async (data: ProfileForm) => {
    if (data.email === user?.email) {
      handleCancelEdit();
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/email-change/request', {
        newEmail: data.email,
      });

      if (response.ok) {
        setPendingEmail(data.email);
        setEmailChangeStep('verification');
        toast({
          title: "認証メールを送信しました",
          description: `${data.email} に認証コードを送信しました`,
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
          description: "アカウント情報が正常に更新されました",
        });
        // ユーザー情報を再取得
        setTimeout(() => {
          window.location.reload();
        }, 2000);
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

  const handlePhoneSubmit = async (data: ProfileForm) => {
    setIsLoading(true);
    try {
      const response = await apiRequest('PUT', '/api/profile', {
        phoneNumber: data.phoneNumber,
      });

      if (response.ok) {
        toast({
          title: "更新完了",
          description: "電話番号が更新されました",
        });
        setEditingField(null);
        // ユーザー情報を再取得
        window.location.reload();
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "エラー",
          description: error.message || "電話番号の更新に失敗しました",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "電話番号の更新に失敗しました",
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
          description: `${pendingEmail} に認証コードを再送信しました`,
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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-4 max-w-2xl">
        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">プロフィール</h1>
          <p className="text-gray-600">アカウント情報を管理できます</p>
        </div>

      {/* プロフィール情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            アカウント情報
          </CardTitle>
          <CardDescription>
            基本的な情報を編集できます
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* 名前の編集 */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <Label className="text-sm font-medium text-gray-700">名前</Label>
              {editingField === 'username' ? (
                <form onSubmit={profileForm.handleSubmit(handleUsernameSubmit)} className="mt-2">
                  <div className="flex gap-2">
                    <Input
                      {...profileForm.register('username')}
                      placeholder="名前を入力"
                      className="flex-1"
                    />
                    <Button type="submit" size="sm" disabled={isLoading}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={handleCancelEdit}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {profileForm.formState.errors.username && (
                    <p className="text-sm text-red-600 mt-1">
                      {profileForm.formState.errors.username.message}
                    </p>
                  )}
                </form>
              ) : (
                <div className="mt-2">
                  <p className="text-lg">{user.username}</p>
                </div>
              )}
            </div>
            {editingField !== 'username' && (
              <Button variant="outline" size="sm" onClick={handleUsernameEdit}>
                <Edit2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* メールアドレスの編集 */}
          <div className="flex items-start justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <Label className="text-sm font-medium text-gray-700">メールアドレス</Label>
              
              {editingField === 'email' ? (
                <div className="mt-2">
                  {emailChangeStep === 'form' && (
                    <form onSubmit={profileForm.handleSubmit(handleEmailChangeSubmit)} className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          {...profileForm.register('email')}
                          type="email"
                          placeholder="新しいメールアドレス"
                          className="flex-1"
                        />
                        <Button type="submit" size="sm" disabled={isLoading}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={handleCancelEdit}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      {profileForm.formState.errors.email && (
                        <p className="text-sm text-red-600">
                          {profileForm.formState.errors.email.message}
                        </p>
                      )}
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          新しいメールアドレスに認証コードが送信されます。認証完了後、アカウント情報が更新されます。
                        </AlertDescription>
                      </Alert>
                    </form>
                  )}

                  {emailChangeStep === 'verification' && (
                    <div className="space-y-3">
                      <Alert>
                        <Mail className="h-4 w-4" />
                        <AlertDescription>
                          {pendingEmail} に認証コードを送信しました。メールを確認して6桁のコードを入力してください。
                        </AlertDescription>
                      </Alert>
                      
                      <form onSubmit={verificationForm.handleSubmit(handleVerificationSubmit)} className="space-y-3">
                        <div>
                          <Input
                            {...verificationForm.register('verificationCode')}
                            type="text"
                            placeholder="認証コード (6桁)"
                            maxLength={6}
                            className="text-center text-lg tracking-wider"
                          />
                          {verificationForm.formState.errors.verificationCode && (
                            <p className="text-sm text-red-600 mt-1">
                              {verificationForm.formState.errors.verificationCode.message}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" disabled={isLoading}>
                            {isLoading ? '認証中...' : '認証'}
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={handleResendCode} disabled={isLoading}>
                            再送信
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={handleCancelEdit}>
                            キャンセル
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}

                  {emailChangeStep === 'success' && (
                    <Alert className="mt-2">
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        メールアドレスが正常に変更されました。ページを更新しています...
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-lg">{user.email}</p>
                </div>
              )}
            </div>
            
            {editingField !== 'email' && (
              <Button variant="outline" size="sm" onClick={handleEmailEdit}>
                <Edit2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* 電話番号の編集 */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <Label className="text-sm font-medium text-gray-700">電話番号</Label>
              {editingField === 'phoneNumber' ? (
                <form onSubmit={profileForm.handleSubmit(handlePhoneSubmit)} className="mt-2">
                  <div className="flex gap-2">
                    <Input
                      {...profileForm.register('phoneNumber')}
                      placeholder="09012345678"
                      className="flex-1"
                    />
                    <Button type="submit" size="sm" disabled={isLoading}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={handleCancelEdit}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {profileForm.formState.errors.phoneNumber && (
                    <p className="text-sm text-red-600 mt-1">
                      {profileForm.formState.errors.phoneNumber.message}
                    </p>
                  )}
                </form>
              ) : (
                <div className="mt-2">
                  <p className="text-lg">{user?.phoneNumber || '未設定'}</p>
                </div>
              )}
            </div>
            {editingField !== 'phoneNumber' && (
              <Button variant="outline" size="sm" onClick={handlePhoneEdit}>
                <Edit2 className="w-4 h-4" />
              </Button>
            )}
          </div>

        </CardContent>
      </Card>
      </div>
    </AppLayout>
  );
}