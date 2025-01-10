import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

interface EditProfileFormProps {
  onComplete: () => void;
}

export function EditProfileForm({ onComplete }: EditProfileFormProps) {
  const { user } = useUser();
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

      // キャッシュを更新
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      // 編集モードを終了
      onComplete();
    } catch (error) {
      setError("予期せぬエラーが発生しました");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

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

        <div className="flex gap-2">
          <Button
            type="submit"
            className="flex-1 bg-primary/90 hover:bg-primary transition-colors"
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
            variant="outline"
            className="flex-1"
            onClick={onComplete}
          >
            キャンセル
          </Button>
        </div>
      </form>
    </Form>
  );
}