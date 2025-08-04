import { createRoot } from "react-dom/client";
import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import App from './App';
import "./index.css";

// モバイル用の適切な余白を設定（ヘッダー固定対応版）
function setupMobileBarPadding() {
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    console.log('[Mobile] Fixed 80px bottom padding applied (header-aware)');
    
    // メインコンテンツエリアに適切な固定余白を追加
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.style.paddingBottom = 'calc(1rem + 80px)'; // 150px → 80px に調整
    }
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