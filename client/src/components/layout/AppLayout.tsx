import { useState, useEffect } from "react";
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
import { motion, AnimatePresence } from "framer-motion";
import { Background } from "@/components/ui/background";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [, setLocation] = useLocation();
  const { user, logout } = useUser();

  // ウィンドウ幅が変更されたときの処理
  useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  const menuItems = [
    { icon: Home, label: "ホーム", href: "/" },
    { icon: User, label: "プロフィール", href: "/profile" },
    { icon: CreditCard, label: "支払い設定", href: "/billing" },
    { icon: Settings, label: "設定", href: "/settings" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Background className="fixed inset-0" />

      {/* オーバーレイ（モバイル用） */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* サイドバー */}
      <motion.aside
        initial={false}
        animate={{ 
          x: isSidebarOpen ? 0 : -240,
          width: isSidebarOpen ? 240 : 0
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "fixed top-0 left-0 z-40 h-screen",
          "bg-background/95 backdrop-blur-sm border-r border-primary/10",
          "md:translate-x-0 md:w-60",
          !isMobile && "md:block"
        )}
      >
        <div className="flex h-full flex-col">
          {/* ロゴ/ブランド部分 */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-primary/10">
            <span className="text-xl font-semibold">管理画面</span>
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(false)}
                className="md:hidden"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* ナビゲーションメニュー */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.href}
                  variant="ghost"
                  className="w-full justify-start gap-3 mb-1"
                  onClick={() => {
                    setLocation(item.href);
                    isMobile && setIsSidebarOpen(false);
                  }}
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
        "min-h-screen transition-all duration-200",
        "md:ml-60"
      )}>
        {/* ヘッダー */}
        <header className="sticky top-0 z-30 h-16 border-b border-primary/10 bg-background/95 backdrop-blur">
          <div className="flex h-16 items-center gap-4 px-4">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
          </div>
        </header>

        {/* コンテンツエリア */}
        <main className="container mx-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}