import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthForm } from "@/components/auth/AuthForm";
import { Background } from "@/components/ui/background";

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Background />
      <Card className="w-full max-w-md bg-background/95 backdrop-blur-sm border-primary/10">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center font-medium">
            ようこそ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AuthForm />
        </CardContent>
      </Card>
    </div>
  );
}
