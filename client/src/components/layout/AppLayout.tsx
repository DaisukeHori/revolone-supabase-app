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
  Home,
  Building2,
  Smartphone,
  ArrowLeft
} from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { motion, AnimatePresence } from "framer-motion";
import { Background } from "@/components/ui/background";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [location, setLocation] = useLocation();
  const { user, logout } = useUser();

  // 店舗詳細ページかどうかを判定し、店舗IDを取得
  const storeMatch = location.match(/^\/store\/([^\/]+)/) || location.match(/^\/payment-history\/([^\/]+)/);
  const storeId = storeMatch ? storeMatch[1] : null;

  // 店舗情報を取得（店舗詳細ページの場合のみ）
  const { data: storeData } = useQuery({
    queryKey: ['stripe-customer'],
    queryFn: async () => {
      const response = await fetch('/api/stripe/customer', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch customer data');
      }
      return response.json();
    },
    enabled: !!storeId
  });

  // 現在の店舗情報を取得
  const currentStore = storeData?.find((customer: any) => customer.customer.id === storeId);
  const storeName = currentStore?.customer?.metadata?.サロン名 || currentStore?.customer?.name || '店舗名未設定';

  // ウィンドウ幅が変更されたときの処理
  useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  const menuItems = [
    { icon: Home, label: "店舗選択", href: "/" },
    { icon: User, label: "プロフィール", href: "/profile" },
    { icon: Settings, label: "設定", href: "/settings" },
  ];

  // 店舗詳細ページ用のメニュー項目
  const storeMenuItems = [
    { icon: Building2, label: "店舗情報", href: `/store/${storeId}` },
    { icon: CreditCard, label: "契約中のサービス", href: `/store/${storeId}/services` },
    { icon: Smartphone, label: "レボナイザー", href: `/store/${storeId}/devices` },
  ];

  return (
    <div className="mobile-full-height bg-background">
      <Background className="fixed inset-0" />

      {/* オーバーレイは不要（モバイルではサイドバーを使わないため） */}

      {/* サイドバー（デスクトップのみ） */}
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
          "hidden md:block md:translate-x-0 md:w-72" // モバイルでは完全に非表示
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
            {/* モバイルでは閉じるボタンは不要 */}
          </div>

          {/* ナビゲーションメニュー */}
          <nav className="flex-1 space-y-2 p-6 overflow-y-auto">
            {/* 店舗詳細ページの場合は店舗用メニュー、それ以外は通常メニュー */}
            {(storeId ? storeMenuItems : menuItems).map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              
              return (
                <Button
                  key={item.href}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-4 h-12 px-4 rounded-xl transition-all duration-200 group",
                    isActive 
                      ? "bg-gray-100 text-gray-900 shadow-sm" 
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  )}
                  onClick={() => {
                    setLocation(item.href);
                  }}
                >
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    isActive 
                      ? "bg-gray-200 text-gray-900" 
                      : "bg-gray-100 group-hover:bg-gray-200"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-medium">{item.label}</span>
                </Button>
              );
            })}
            
            {/* 店舗詳細ページの場合は戻るボタンを追加 */}
            {storeId && (
              <div className="pt-4 border-t border-gray-200">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-4 h-12 px-4 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all duration-200 group"
                  onClick={() => {
                    setLocation("/");
                  }}
                >
                  <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-gray-200 transition-colors">
                    <Home className="h-5 w-5" />
                  </div>
                  <span className="font-medium">店舗一覧に戻る</span>
                </Button>
              </div>
            )}
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
        "mobile-full-height transition-all duration-200 bg-gray-50",
        "md:ml-72" // モバイルではマージンなし、デスクトップではサイドバー分のマージン
      )}>
        {/* ヘッダー */}
        <header className="fixed top-0 left-0 right-0 z-30 h-20 border-b border-gray-200 bg-white/95 backdrop-blur-sm shadow-sm md:left-72">
          <div className="flex h-20 items-center gap-4 px-6">
            {/* 戻るボタン（店舗詳細ページの場合） */}
            {storeId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4" />
                店舗一覧
              </Button>
            )}
            
            {storeId && (
              <div className="flex-1">
                <h1 className="text-lg font-semibold text-gray-800">
                  {storeName}
                </h1>
              </div>
            )}
            {!storeId && <div className="flex-1" />}
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
        <main className="container mx-auto px-6 pb-6 pt-24 md:px-8 md:pb-8 md:pt-28">
          {children}
        </main>
      </div>

      {/* モバイル用ボトムナビゲーションバー */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
          <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-lg">
            <div className="flex items-center justify-around px-4 py-2">
              {(storeId ? storeMenuItems : menuItems).map((item) => {
                const Icon = item.icon;
                // 店舗詳細ページでのタブ選択状態を正しく判定
                const isActive = location === item.href;
                
                return (
                  <Button
                    key={item.href}
                    variant="ghost"
                    className={cn(
                      "flex flex-col items-center gap-1 h-16 px-3 rounded-lg transition-all duration-200",
                      isActive 
                        ? "text-gray-800 bg-gray-100" 
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    )}
                    onClick={() => setLocation(item.href)}
                  >
                    <div className={cn(
                      "p-1.5 rounded-md transition-colors",
                      isActive 
                        ? "bg-gray-200 text-gray-800" 
                        : "text-gray-500"
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium leading-none">
                      {item.label}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}