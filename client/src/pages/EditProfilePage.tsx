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
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const editProfileSchema = z.object({
  username: z.string().min(3, "ユーザー名は3文字以上である必要があります"),
  email: z.string().email("メールアドレスの形式が正しくありません"),
  phoneNumber: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, "国際電話形式で入力してください（例：+818012345678）")
    .optional()
    .or(z.literal('')),
});

type FormData = z.infer<typeof editProfileSchema>;

export default function EditProfilePage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
      phoneNumber: user?.phoneNumber || "",
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  const onSubmit = async (data: FormData) => {
    try {
      setError(null);
      setIsSubmitting(true);

      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "更新に失敗しました");
        return;
      }

      // キャッシュを更新してからページ遷移
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      // プロフィールページに戻る前に少し待つ
      await new Promise(resolve => setTimeout(resolve, 100));
      setLocation("/");
    } catch (error) {
      setError("予期せぬエラーが発生しました");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Background />
      <Card className="w-full max-w-md bg-background/95 backdrop-blur-sm border-primary/10">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center font-medium">
            プロフィール編集
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/90">ユーザー名</FormLabel>
                    <FormControl>
                      <Input
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/90">メールアドレス</FormLabel>
                    <FormControl>
                      <Input
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
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/90">電話番号</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="+818012345678"
                        className="bg-background/80 border-primary/20 focus:border-primary/40"
                      />
                    </FormControl>
                    <p className="text-sm text-muted-foreground mt-1">
                      国際電話形式で入力してください（例：+818012345678）
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Button
                  type="submit"
                  className="w-full bg-primary/90 hover:bg-primary transition-colors"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "保存"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                  onClick={() => setLocation("/")}
                >
                  キャンセル
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}