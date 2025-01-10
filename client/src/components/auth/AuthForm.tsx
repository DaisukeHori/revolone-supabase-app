import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@db/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation } from "wouter";
import { LoginForm } from "./LoginForm";

type FormData = {
  email: string;
  username: string;
  password: string;
};

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { register } = useUser();
  const [, setLocation] = useLocation();

  const form = useForm<FormData>({
    resolver: zodResolver(isLogin 
      ? insertUserSchema.omit({ username: true }) 
      : insertUserSchema
    ),
    defaultValues: {
      email: "",
      username: "",
      password: "",
    },
  });

  const onLoginComplete = () => {
    setLocation("/");
  };

  const onSubmit = async (data: FormData) => {
    try {
      setError(null);
      if (!isLogin) {
        const result = await register(data);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        // 登録成功後は自動的にログインページに遷移
        setIsLogin(true);
        form.reset();
        return;
      }
    } catch (error) {
      setError("予期せぬエラーが発生しました");
      console.error(error);
    }
  };

  if (isLogin) {
    return (
      <div className="space-y-4">
        <LoginForm onComplete={onLoginComplete} />
        <Button
          type="button"
          variant="ghost"
          className="w-full text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
          onClick={() => {
            setError(null);
            setIsLogin(false);
            form.reset();
          }}
        >
          アカウントをお持ちでない方はこちら
        </Button>
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
                  placeholder="example@email.com" 
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
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground/90">ユーザー名</FormLabel>
              <FormControl>
                <Input 
                  placeholder="ユーザー名" 
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
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground/90">パスワード</FormLabel>
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

        <Button
          type="submit"
          className="w-full bg-primary/90 hover:bg-primary transition-colors"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "登録"
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
          onClick={() => {
            setError(null);
            setIsLogin(true);
            form.reset();
          }}
        >
          既にアカウントをお持ちの方はこちら
        </Button>
      </form>
    </Form>
  );
}