import { Switch, Route } from "wouter";
import { Loader2 } from "lucide-react";
import AuthPage from "./pages/AuthPage";
import PasswordResetPage from "./pages/PasswordResetPage";
import { useUser } from "./hooks/use-user";
import { Button } from "@/components/ui/button";
import { Background } from "@/components/ui/background";

function App() {
  const { user, isLoading, logout } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/reset-password" component={PasswordResetPage} />
        <Route component={AuthPage} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/">
        <div className="min-h-screen bg-background">
          <Background />
          <div className="max-w-md mx-auto pt-8 px-4">
            <div className="bg-background/95 backdrop-blur-sm border border-primary/10 rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-medium text-foreground">
                  ようこそ、{user.username}さん
                </h1>
              </div>
              <Button
                onClick={() => logout()}
                variant="outline"
                className="w-full border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
              >
                ログアウト
              </Button>
            </div>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

export default App;