import { createRoot } from "react-dom/client";
import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import App from './App';
import "./index.css";

// モバイル用の固定余白を設定（シンプル版）
function setupMobileBarPadding() {
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    console.log('[Mobile] Fixed 150px bottom padding applied');
    
    // メインコンテンツエリアに固定余白を追加
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.style.paddingBottom = 'calc(2rem + 150px)';
    }
    
    // ボディにも固定余白
    document.body.style.paddingBottom = '150px';
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