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
import { Mail, ArrowRight, CheckCircle, RotateCcw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";

const registrationSchema = z.object({
  email: z.string().email("メールアドレスの形式が正しくありません"),
  username: z.string().min(3, "ユーザー名は3文字以上である必要があります"),
  password: z.string().min(8, "パスワードは8文字以上である必要があります"),
});

const verificationSchema = z.object({
  verificationCode: z.string().length(6, "認証コードは6桁です"),
});

type RegistrationForm = z.infer<typeof registrationSchema>;
type VerificationForm = z.infer<typeof verificationSchema>;

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<'register' | 'verify' | 'success'>('register');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const registerForm = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      email: '',
      username: '',
      password: '',
    },
  });

  const verificationForm = useForm<VerificationForm>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      verificationCode: '',
    },
  });

  const password = registerForm.watch("password");

  const handleRegistration = async (data: RegistrationForm) => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/registration/request', data);
      const result = await response.json();
      
      if (response.ok) {
        setEmail(data.email);
        setUsername(data.username);
        setStep('verify');
        toast({
          title: "認証メールを送信しました",
          description: "メールを確認して認証コードを入力してください",
        });
      } else {
        toast({
          title: "エラー",
          description: result.message || "新規登録に失敗しました",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "新規登録に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async (data: VerificationForm) => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/registration/verify', {
        email,
        verificationCode: data.verificationCode,
      });
      const result = await response.json();
      
      if (response.ok) {
        setStep('success');
        toast({
          title: "登録完了",
          description: "新規登録が完了しました",
        });
      } else {
        toast({
          title: "エラー",
          description: result.message || "認証に失敗しました",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "認証に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/registration/resend', {
        email,
      });
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "認証コードを再送信しました",
          description: "新しい認証コードをメールで送信しました",
        });
        verificationForm.reset();
      } else {
        toast({
          title: "エラー",
          description: result.message || "認証コードの再送信に失敗しました",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "認証コードの再送信に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 新規登録フォーム
  if (step === 'register') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Mail className="h-6 w-6" />
              新規登録
            </CardTitle>
            <CardDescription>
              アカウントを作成してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={registerForm.handleSubmit(handleRegistration)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  {...registerForm.register('email')}
                />
                {registerForm.formState.errors.email && (
                  <p className="text-sm text-red-600">{registerForm.formState.errors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username">ユーザー名</Label>
                <Input
                  id="username"
                  placeholder="ユーザー名"
                  {...registerForm.register('username')}
                />
                {registerForm.formState.errors.username && (
                  <p className="text-sm text-red-600">{registerForm.formState.errors.username.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="パスワード"
                  {...registerForm.register('password')}
                />
                {registerForm.formState.errors.password && (
                  <p className="text-sm text-red-600">{registerForm.formState.errors.password.message}</p>
                )}
                {password && <PasswordStrengthIndicator password={password} />}
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    送信中...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    認証メールを送信
                  </>
                )}
              </Button>
              
              <Button 
                type="button"
                variant="outline"
                onClick={() => setLocation('/login')}
                className="w-full"
              >
                ログインページへ戻る
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 認証コード入力フォーム
  if (step === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Mail className="h-6 w-6" />
              認証コード入力
            </CardTitle>
            <CardDescription>
              {email} に送信された認証コードを入力してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={verificationForm.handleSubmit(handleVerification)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verificationCode">認証コード（6桁）</Label>
                <Input
                  id="verificationCode"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  className="text-center text-2xl font-mono"
                  {...verificationForm.register('verificationCode')}
                />
                {verificationForm.formState.errors.verificationCode && (
                  <p className="text-sm text-red-600">{verificationForm.formState.errors.verificationCode.message}</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    確認中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    認証して登録完了
                  </>
                )}
              </Button>
              
              <Button 
                type="button"
                variant="outline"
                onClick={handleResendCode}
                disabled={isLoading}
                className="w-full"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                認証コードを再送信
              </Button>
              
              <Button 
                type="button"
                variant="ghost"
                onClick={() => setStep('register')}
                className="w-full"
              >
                戻る
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 登録完了画面
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-green-600">
            <CheckCircle className="h-6 w-6" />
            登録完了
          </CardTitle>
          <CardDescription>
            新規登録が完了しました
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Alert className="mb-4">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              {username}さん、ようこそ！ログインしてシステムをご利用ください。
            </AlertDescription>
          </Alert>
          
          <Button 
            onClick={() => setLocation('/login')}
            className="w-full"
          >
            ログインページへ
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}