import { Switch, Route } from "wouter";
import { Loader2 } from "lucide-react";
import AuthPage from "./pages/AuthPage";
import PasswordResetPage from "./pages/PasswordResetPage";
import ProfilePage from "./pages/ProfilePage";
import HomePage from "./pages/HomePage";
import SettingsPage from "./pages/SettingsPage";
import SubscriptionDetailPage from "./pages/SubscriptionDetailPage";
import StoreDetailPage from "./pages/StoreDetailPage";
import BillingSettingsPage from "./pages/BillingSettingsPage";
import PaymentHistoryPage from "./pages/PaymentHistoryPage";
import SecuritySettingsPage from "./pages/SecuritySettingsPage";
import { useUser } from "./hooks/use-user";
import { Background } from "@/components/ui/background";
import { useTheme } from "./hooks/use-theme";
import { useEffect } from "react";

function App() {
  const { user, isLoading } = useUser();
  const { theme } = useTheme();

  // テーマの初期設定
  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
  }, [theme]);

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
      <Route path="/settings" component={SettingsPage} />
      <Route path="/settings/security" component={SecuritySettingsPage} />
      <Route path="/store/:id" component={StoreDetailPage} />
      <Route path="/subscription/:id" component={SubscriptionDetailPage} />
      <Route path="/billing/subscription/:id" component={BillingSettingsPage} />
      <Route path="/billing" component={BillingSettingsPage} />
      <Route path="/payment-history" component={PaymentHistoryPage} />
      <Route path="/" component={HomePage} />
      <Route path="*" component={HomePage} />
    </Switch>
  );
}

export default App;