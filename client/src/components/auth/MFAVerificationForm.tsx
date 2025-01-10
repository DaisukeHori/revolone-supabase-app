import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const verificationSchema = z.object({
  code: z.string().min(6, "認証コードは6文字である必要があります").max(6, "認証コードは6文字である必要があります"),
});

type FormData = z.infer<typeof verificationSchema>;

interface MFAVerificationFormProps {
  onComplete: () => void;
  mfaType: string;
}

export function MFAVerificationForm({ onComplete, mfaType }: MFAVerificationFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      code: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setError(null);
      setIsSubmitting(true);

      const response = await fetch("/api/verify-mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "認証に失敗しました");
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
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground/90">
                {mfaType === 'sms' ? '認証コード（SMS）' : '認証コード（TOTP）'}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="text"
                  placeholder="000000"
                  maxLength={6}
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
            "認証"
          )}
        </Button>
      </form>
    </Form>
  );
}
