// JavaScript エラー検出とリロード促進ユーティリティ

let errorCount = 0;
let lastErrorTime = 0;
const ERROR_THRESHOLD = 2; // 2回エラーが発生したらリロードを促す
const ERROR_WINDOW = 10000; // 10秒以内のエラーをカウント

export function handleJavaScriptError(error: ErrorEvent) {
  const now = Date.now();
  
  // エラーウィンドウをリセット
  if (now - lastErrorTime > ERROR_WINDOW) {
    errorCount = 0;
  }
  
  errorCount++;
  lastErrorTime = now;
  
  console.error('JavaScript Error detected:', error.message);
  
  // 特定のエラー（originalPrompt重複宣言）を検出
  if (error.message.includes('originalPrompt') || error.message.includes('already been declared')) {
    showReloadPrompt();
    return;
  }
  
  // エラーが閾値を超えた場合
  if (errorCount >= ERROR_THRESHOLD) {
    showReloadPrompt();
  }
}

function showReloadPrompt() {
  // イミディエイトリロードを実行（キャッシュもクリア）
  console.log('Critical JavaScript error detected - forcing reload');
  
  // 短い遅延の後に強制リロード
  setTimeout(() => {
    window.location.reload();
  }, 1000);
  
  // 即座にユーザーに通知
  const notification = document.createElement('div');
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: #fee2e2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      z-index: 9999;
      max-width: 300px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
    ">
      <div style="font-weight: 600; margin-bottom: 8px;">⚠ エラーが発生しました</div>
      <div>1秒後にページをリロードします...</div>
    </div>
  `;
  document.body.appendChild(notification);
  
  // 通知を3秒後に削除
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

// ページ読み込み時にエラーリスナーを設定
export function initErrorRecovery() {
  window.addEventListener('error', handleJavaScriptError);
  
  // 未処理のPromise拒否もキャッチ
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
    errorCount++;
    
    if (errorCount >= ERROR_THRESHOLD) {
      showReloadPrompt();
    }
  });
  
  console.log('Error recovery system initialized');
}

// クリーンアップ
export function cleanupErrorRecovery() {
  window.removeEventListener('error', handleJavaScriptError);
}