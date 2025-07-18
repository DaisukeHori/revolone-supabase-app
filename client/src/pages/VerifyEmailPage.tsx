import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Mail, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function VerifyEmailPage() {
  const [location, setLocation] = useLocation();
  const [match] = useRoute('/verify-email');
  const { toast } = useToast();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (match) {
      const urlParams = new URLSearchParams(location.split('?')[1]);
      const token = urlParams.get('token');
      
      if (token) {
        verifyEmail(token);
      }
    }
  }, [location, match]);

  const verifyEmail = async (token: string) => {
    setVerificationStatus('loading');
    
    try {
      const response = await apiRequest('GET', `/api/verify-email?token=${token}`);
      const data = await response.json();
      
      if (response.ok) {
        setVerificationStatus('success');
        toast({
          title: "メールアドレス確認完了",
          description: "ログインできます",
        });
        
        // 3秒後にログインページへリダイレクト
        setTimeout(() => {
          setLocation('/login');
        }, 3000);
      } else {
        setVerificationStatus('error');
        setErrorMessage(data.message || 'メールアドレスの確認に失敗しました');
      }
    } catch (error) {
      setVerificationStatus('error');
      setErrorMessage('メールアドレスの確認に失敗しました');
    }
  };

  const handleResendVerification = async () => {
    if (!resendEmail) {
      toast({
        title: "エラー",
        description: "メールアドレスを入力してください",
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);
    
    try {
      const response = await apiRequest('POST', '/api/resend-verification', {
        email: resendEmail,
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "確認メール再送信",
          description: "確認メールを再送信しました",
        });
        setResendEmail('');
      } else {
        toast({
          title: "エラー",
          description: data.message || '確認メールの再送信に失敗しました',
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: '確認メールの再送信に失敗しました',
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  if (verificationStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Mail className="h-6 w-6" />
              メールアドレス確認中
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">メールアドレスを確認しています...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verificationStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              メールアドレス確認完了
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                メールアドレスの確認が完了しました。まもなくログインページへ移動します。
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => setLocation('/login')}
              className="mt-4 w-full"
            >
              ログインページへ
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verificationStatus === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-red-600">
              <XCircle className="h-6 w-6" />
              メールアドレス確認エラー
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {errorMessage}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label htmlFor="resend-email">確認メールの再送信</Label>
              <Input
                id="resend-email"
                type="email"
                placeholder="メールアドレスを入力"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
              />
              <Button
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full"
              >
                {isResending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    送信中...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    確認メールを再送信
                  </>
                )}
              </Button>
            </div>
            
            <Button 
              variant="outline"
              onClick={() => setLocation('/login')}
              className="w-full"
            >
              ログインページへ戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // トークンがない場合の画面
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Mail className="h-6 w-6" />
            メールアドレス確認
          </CardTitle>
          <CardDescription>
            確認メールのリンクからアクセスしてください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              登録時に送信された確認メールのリンクをクリックしてください。
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Label htmlFor="resend-email">確認メールの再送信</Label>
            <Input
              id="resend-email"
              type="email"
              placeholder="メールアドレスを入力"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
            />
            <Button
              onClick={handleResendVerification}
              disabled={isResending}
              className="w-full"
            >
              {isResending ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  送信中...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  確認メールを再送信
                </>
              )}
            </Button>
          </div>
          
          <Button 
            variant="outline"
            onClick={() => setLocation('/login')}
            className="w-full"
          >
            ログインページへ戻る
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}