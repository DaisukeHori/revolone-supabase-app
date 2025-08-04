import { createRoot } from "react-dom/client";
import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import App from './App';
import "./index.css";

// モバイルバーの高さを動的に計算して余白を設定
function setupMobileBarPadding() {
  // ユーザーエージェントでモバイルを判定
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    // 実際のビューポート高さと理論的な高さの差を計算
    const calculateMobileBarHeight = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const theoreticalHeight = window.innerHeight;
      
      // ブラウザバー（下部のナビゲーションバーなど）の高さを推定
      const browserBarHeight = Math.max(0, theoreticalHeight - viewportHeight);
      
      // CSS カスタムプロパティに設定
      document.documentElement.style.setProperty('--mobile-bar-height', `${browserBarHeight}px`);
      
      console.log(`[Mobile Bar] Viewport: ${viewportHeight}, Inner: ${theoreticalHeight}, Bar Height: ${browserBarHeight}px`);
      
      // メインコンテンツエリアに余白を追加
      const mainElement = document.querySelector('main');
      if (mainElement) {
        mainElement.style.paddingBottom = `calc(2rem + ${browserBarHeight}px)`;
      }
    };
    
    // 初回計算（少し遅延）
    setTimeout(calculateMobileBarHeight, 100);
    
    // リサイズやビューポート変更時に再計算
    window.addEventListener('resize', calculateMobileBarHeight);
    window.addEventListener('orientationchange', () => {
      // 向き変更時は少し遅延して計算
      setTimeout(calculateMobileBarHeight, 500);
    });
    
    // Visual Viewport API が利用可能な場合
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', calculateMobileBarHeight);
    }
    
    // スクロール時の再計算も追加
    let scrollTimeout: NodeJS.Timeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(calculateMobileBarHeight, 200);
    });
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find the root element");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster />
    </QueryClientProvider>
  </React.StrictMode>
);

// DOM読み込み後に実行
document.addEventListener('DOMContentLoaded', setupMobileBarPadding);
// 既に読み込まれている場合は即座に実行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupMobileBarPadding);
} else {
  setupMobileBarPadding();
}