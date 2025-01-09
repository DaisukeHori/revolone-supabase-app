import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Background } from "@/components/ui/background";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation } from "wouter";

// メールアドレス入力用のスキーマ
const requestResetSchema = z.object({
  email: z.string().email("メールアドレスの形式が正しくありません"),
});

// 新しいパスワード入力用のスキーマ
const resetPasswordSchema = z.object({
  password: z.string().min(8, "パスワードは8文字以上である必要があります"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "パスワードが一致しません",
  path: ["confirmPassword"],
});

type RequestResetData = z.infer<typeof requestResetSchema>;
type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

export default function PasswordResetPage() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  // トークンの有無に応じてフォームを切り替え
  const form = useForm<RequestResetData | ResetPasswordData>({
    resolver: zodResolver(token ? resetPasswordSchema : requestResetSchema),
    defaultValues: token
      ? { password: "", confirmPassword: "" }
      : { email: "" },
  });

  const onSubmit = async (data: RequestResetData | ResetPasswordData) => {
    try {
      setError(null);
      const endpoint = token ? "/api/reset-password" : "/api/request-reset";
      const body = token
        ? { token, password: (data as ResetPasswordData).password }
        : { email: (data as RequestResetData).email };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "予期せぬエラーが発生しました");
        return;
      }

      setSuccess(true);
      if (token) {
        // パスワードリセット完了後、3秒後にログインページへリダイレクト
        setTimeout(() => setLocation("/"), 3000);
      }
    } catch (error) {
      setError("予期せぬエラーが発生しました");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Background />
      <Card className="w-full max-w-md bg-background/95 backdrop-blur-sm border-primary/10">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center font-medium">
            {token ? "新しいパスワードの設定" : "パスワードリセット"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">
                  {token
                    ? "パスワードが正常に更新されました。ログインページに移動します。"
                    : "パスワードリセットの手順をメールでお送りしました。"}
                </AlertDescription>
              </Alert>
              {!token && (
                <Button
                  type="button"
                  className="w-full bg-primary/90 hover:bg-primary transition-colors"
                  onClick={() => setLocation("/")}
                >
                  ログインページに戻る
                </Button>
              )}
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="bg-red-50 border-red-200">
                    <AlertDescription className="text-red-800">{error}</AlertDescription>
                  </Alert>
                )}

                {token ? (
                  // 新しいパスワード入力フォーム
                  <>
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/90">新しいパスワード</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="********"
                              {...field}
                              className="bg-background/80 border-primary/20 focus:border-primary/40"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/90">パスワードの確認</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="********"
                              {...field}
                              className="bg-background/80 border-primary/20 focus:border-primary/40"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : (
                  // メールアドレス入力フォーム
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground/90">メールアドレス</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="example@email.com"
                            {...field}
                            className="bg-background/80 border-primary/20 focus:border-primary/40"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <Button
                  type="submit"
                  className="w-full bg-primary/90 hover:bg-primary transition-colors"
                  disabled={form.formState.isSubmitting}
                >
                  {token ? "パスワードを更新" : "パスワードをリセット"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                  onClick={() => setLocation("/")}
                >
                  ログインページに戻る
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}