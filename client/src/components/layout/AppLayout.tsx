import { useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  User,
  LogOut,
  Menu,
  X,
  CreditCard,
  Settings,
  Home
} from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { motion } from "framer-motion";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [, setLocation] = useLocation();
  const { user, logout } = useUser();

  const menuItems = [
    { icon: Home, label: "ホーム", href: "/" },
    { icon: User, label: "プロフィール編集", href: "/edit-profile" },
    { icon: CreditCard, label: "支払い設定", href: "/billing" },
    { icon: Settings, label: "設定", href: "/settings" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* サイドバー */}
      <motion.aside
        initial={{ x: -240 }}
        animate={{ x: isSidebarOpen ? 0 : -240 }}
        transition={{ duration: 0.2 }}
        className="fixed top-0 left-0 z-40 h-screen w-60 bg-sidebar border-r border-primary/10"
      >
        <div className="flex h-full flex-col">
          {/* ロゴ/ブランド部分 */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-primary/10">
            <span className="text-xl font-semibold">管理画面</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* ナビゲーションメニュー */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.href}
                  variant="ghost"
                  className="w-full justify-start gap-3"
                  onClick={() => setLocation(item.href)}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Button>
              );
            })}
          </nav>

          {/* ユーザー情報とログアウト */}
          <div className="border-t border-primary/10 p-4">
            <div className="mb-2 text-sm">
              <div className="font-medium">{user?.username}</div>
              <div className="text-muted-foreground">{user?.email}</div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-red-600 hover:text-red-600 hover:bg-red-50"
              onClick={() => logout()}
            >
              <LogOut className="h-5 w-5" />
              ログアウト
            </Button>
          </div>
        </div>
      </motion.aside>

      {/* メインコンテンツ */}
      <div className={cn(
        "transition-all duration-200",
        isSidebarOpen ? "lg:ml-60" : "ml-0"
      )}>
        {/* ヘッダー */}
        <header className="sticky top-0 z-30 h-16 border-b border-primary/10 bg-background/95 backdrop-blur">
          <div className="flex h-16 items-center gap-4 px-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* コンテンツエリア */}
        <main className="container mx-auto p-4 lg:p-8 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
