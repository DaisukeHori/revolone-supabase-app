import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Copy, CheckCircle2, Settings, Lock, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/layout/AppLayout';
import { apiRequest } from '@/lib/queryClient';

interface MasterPasswordStatus {
  masterPasswordEnabled: boolean;
  masterPassword: string;
  description: string;
}

export default function AdminPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const { toast } = useToast();

  const { data: masterPasswordData, isLoading, error } = useQuery<MasterPasswordStatus>({
    queryKey: ['master-password-status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/master-password/status');
      if (!response.ok) {
        throw new Error('管理者権限が必要です');
      }
      return response.json();
    },
    retry: false,
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        description: "パスワードをクリップボードにコピーしました",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "クリップボードへのコピーに失敗しました",
      });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">管理者権限を確認中...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto p-6">
          <Alert variant="destructive">
            <AlertDescription>
              管理者権限が必要です。管理者アカウントでログインしてください。
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">管理者設定</h1>
            <p className="text-gray-600">システム管理とマスターパスワード機能</p>
          </div>
        </div>

        {/* マスターパスワード情報 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle>マスターパスワード</CardTitle>
              </div>
              <Badge variant="default">有効</Badge>
            </div>
            <CardDescription>
              任意のユーザーアカウントにログインできる管理者用パスワード
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">使用方法</h4>
              <p className="text-sm text-blue-700">
                {masterPasswordData?.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="master-password">マスターパスワード</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="master-password"
                    type={showPassword ? "text" : "password"}
                    value={masterPasswordData?.masterPassword || ''}
                    readOnly
                    className="pr-10 font-mono"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => copyToClipboard(masterPasswordData?.masterPassword || '')}
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? 'コピー済み' : 'コピー'}
                </Button>
              </div>
            </div>

            <Alert>
              <AlertDescription>
                <strong>重要:</strong> このパスワードは他人に知られないよう厳重に管理してください。
                すべてのユーザーアカウントにアクセス可能になります。
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* ログインテスト */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>ログインテスト</CardTitle>
            </div>
            <CardDescription>
              マスターパスワードでのログインをテストします
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">テスト用メールアドレス</Label>
              <Input
                id="test-email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">テスト手順</h4>
              <ol className="text-sm text-yellow-700 space-y-1">
                <li>1. 上記のメールアドレスを入力</li>
                <li>2. 別のブラウザまたはシークレットモードでログインページを開く</li>
                <li>3. メールアドレス: {testEmail || '[入力してください]'}</li>
                <li>4. パスワード: {showPassword ? masterPasswordData?.masterPassword : '[表示して確認]'}</li>
                <li>5. ログインボタンをクリックしてテスト</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* システム情報 */}
        <Card>
          <CardHeader>
            <CardTitle>システム情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">環境:</span>
                <span className="ml-2">{import.meta.env.MODE}</span>
              </div>
              <div>
                <span className="font-medium">マスターパスワード状態:</span>
                <Badge variant="default" className="ml-2">有効</Badge>
              </div>
              <div>
                <span className="font-medium">管理者権限:</span>
                <Badge variant="default" className="ml-2">有効</Badge>
              </div>
              <div>
                <span className="font-medium">環境変数:</span>
                <span className="ml-2">MASTER_PASSWORD</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}