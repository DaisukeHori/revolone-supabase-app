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
          x: isSidebarOpen ? 0 : -288,
          width: isSidebarOpen ? 288 : 0
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "fixed top-0 left-0 z-40 h-screen",
          "bg-white border-r border-gray-200 shadow-lg",
          "md:translate-x-0 md:w-72",
          !isMobile && "md:block"
        )}
      >
        <div className="flex h-full flex-col">
          {/* ロゴ/ブランド部分 */}
          <div className="flex h-20 items-center justify-between px-6 border-b border-gray-200 bg-gradient-to-r from-gray-800 to-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
                <div className="w-6 h-6 bg-gradient-to-br from-gray-600 to-gray-800 rounded-md"></div>
              </div>
              <span className="text-xl font-bold text-white">Revonizer管理</span>
            </div>
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(false)}
                className="md:hidden text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* ナビゲーションメニュー */}
          <nav className="flex-1 space-y-2 p-6 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.href}
                  variant="ghost"
                  className="w-full justify-start gap-4 h-12 px-4 rounded-xl text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200 group"
                  onClick={() => {
                    setLocation(item.href);
                    isMobile && setIsSidebarOpen(false);
                  }}
                >
                  <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-gray-200 transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-medium">{item.label}</span>
                </Button>
              );
            })}
          </nav>

          {/* ユーザー情報とログアウト */}
          <div className="border-t border-gray-200 p-6">
            <div className="mb-4 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center text-white font-semibold">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-gray-800">{user?.username}</div>
                  <div className="text-sm text-gray-500">{user?.email}</div>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 px-4 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200"
              onClick={() => logout()}
            >
              <div className="p-2 rounded-lg bg-red-100">
                <LogOut className="h-4 w-4" />
              </div>
              <span className="font-medium">ログアウト</span>
            </Button>
          </div>
        </div>
      </motion.aside>

      {/* メインコンテンツ */}
      <div className={cn(
        "min-h-screen transition-all duration-200 bg-gray-50",
        isSidebarOpen && isMobile ? "overflow-hidden" : "",
        "md:ml-72"
      )}>
        {/* ヘッダー */}
        <header className="sticky top-0 z-30 h-20 border-b border-gray-200 bg-white/95 backdrop-blur-sm shadow-sm">
          <div className="flex h-20 items-center gap-4 px-6">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="rounded-xl"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <div className="flex-1" />
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString('ja-JP', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              })}
            </div>
          </div>
        </header>

        {/* コンテンツエリア */}
        <main className="container mx-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}