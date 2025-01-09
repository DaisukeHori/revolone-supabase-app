import { Switch, Route } from "wouter";
import { Loader2 } from "lucide-react";
import AuthPage from "./pages/AuthPage";
import PasswordResetPage from "./pages/PasswordResetPage";
import { useUser } from "./hooks/use-user";

function App() {
  const { user, isLoading } = useUser();

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
        <div className="min-h-screen bg-background p-4">
          <div className="max-w-md mx-auto mt-8">
            <h1 className="text-2xl font-medium text-foreground mb-4">
              ようこそ、{user.username}さん
            </h1>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

export default App;