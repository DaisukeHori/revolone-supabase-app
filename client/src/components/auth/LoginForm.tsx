import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";
import { MFAVerificationForm } from "./MFAVerificationForm";
import { useQueryClient } from "@tanstack/react-query";

const loginSchema = z.object({
  email: z.string().email("メールアドレスの形式が正しくありません"),
  password: z.string().min(1, "パスワードを入力してください"),
});

type FormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onComplete: () => void;
}

export function LoginForm({ onComplete }: LoginFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mfaRequired, setMfaRequired] = useState<{ required: boolean; type?: string }>({
    required: false,
  });
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setError(null);
      setIsSubmitting(true);

      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 403 && result.message === "2段階認証が必要です") {
          setMfaRequired({ required: true, type: result.mfaType });
          return;
        }
        setError(result.message || "ログインに失敗しました");
        return;
      }

      // ユーザー情報のキャッシュを更新
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      onComplete();
    } catch (error) {
      setError("予期せぬエラーが発生しました");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2段階認証が必要な場合、認証コード入力フォームを表示
  if (mfaRequired.required) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-center mb-4">2段階認証</h2>
        <p className="text-sm text-muted-foreground text-center mb-4">
          {mfaRequired.type === 'sms'
            ? '登録された電話番号にSMSで送信された認証コードを入力してください'
            : '認証アプリに表示される認証コードを入力してください'}
        </p>
        <MFAVerificationForm 
          onComplete={onComplete} 
          mfaType={mfaRequired.type || 'sms'} 
        />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <Alert variant="destructive" className="bg-red-50 border-red-200">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground/90">メールアドレス</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  placeholder="example@email.com"
                  className="bg-background/80 border-primary/20 focus:border-primary/40"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground/90">パスワード</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="password"
                  placeholder="********"
                  className="bg-background/80 border-primary/20 focus:border-primary/40"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full bg-primary/90 hover:bg-primary transition-colors"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "ログイン"
          )}
        </Button>

        <div className="text-sm text-center">
          <Link href="/reset-password" className="text-primary hover:underline">
            パスワードをお忘れですか？
          </Link>
        </div>
      </form>
    </Form>
  );
}