import { Switch, Route } from "wouter";
import { Loader2 } from "lucide-react";
import AuthPage from "./pages/AuthPage";
import PasswordResetPage from "./pages/PasswordResetPage";
import ProfilePage from "./pages/ProfilePage";
import { useUser } from "./hooks/use-user";
import { Background } from "@/components/ui/background";

function App() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Background />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/reset-password" component={PasswordResetPage} />
        <Route path="*" component={AuthPage} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/profile" component={ProfilePage} />
      <Route path="/" component={ProfilePage} />
      <Route path="*" component={ProfilePage} />
    </Switch>
  );
}

export default App;