import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Background } from "@/components/ui/background";
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function ProfilePage() {
  const { user, isLoading, logout } = useUser();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Background />
      <Card className="w-full max-w-md bg-background/95 backdrop-blur-sm border-primary/10">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center font-medium">
            プロフィール
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">ユーザー名</p>
            <p className="text-foreground font-medium">{user.username}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">メールアドレス</p>
            <p className="text-foreground font-medium">{user.email}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">登録日</p>
            <p className="text-foreground font-medium">
              {new Date(user.createdAt).toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric"
              })}
            </p>
          </div>
          <div className="pt-4 space-y-2">
            <Button
              onClick={() => setLocation("/edit-profile")}
              className="w-full bg-primary/90 hover:bg-primary transition-colors"
            >
              プロフィールを編集
            </Button>
            <Button
              onClick={() => logout()}
              variant="outline"
              className="w-full border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
            >
              ログアウト
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
