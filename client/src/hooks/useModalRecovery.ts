import { useEffect, useRef } from 'react';

// モーダル操作後のボタン無効化問題を回復するフック
export function useModalRecovery() {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const enableAllButtons = () => {
    // 全てのボタンを強制的に有効化
    const buttons = document.querySelectorAll('button[disabled]');
    buttons.forEach((button) => {
      const btnElement = button as HTMLButtonElement;
      // data-loading や data-processing がない場合のみ有効化
      if (!btnElement.dataset.loading && !btnElement.dataset.processing) {
        btnElement.disabled = false;
        btnElement.style.pointerEvents = 'auto';
      }
    });

    // イベントリスナーがブロックされている可能性があるため、強制的に再登録
    const clickableElements = document.querySelectorAll('[onclick], button, a, [role="button"]');
    clickableElements.forEach((element) => {
      const el = element as HTMLElement;
      if (el.style.pointerEvents === 'none') {
        el.style.pointerEvents = 'auto';
      }
    });
  };

  const scheduleRecovery = () => {
    // 既存のタイマーをクリア
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 500ms後に回復処理を実行
    timeoutRef.current = setTimeout(() => {
      enableAllButtons();
      console.log('Modal recovery: Buttons re-enabled');
    }, 500);
  };

  useEffect(() => {
    // モーダルの閉じる操作を監視
    const handleModalClose = () => {
      scheduleRecovery();
    };

    // エスケープキーを監視
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        scheduleRecovery();
      }
    };

    // クリックイベントを監視（モーダルオーバーレイクリック）
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.dataset.radixDismissable || target.classList.contains('fixed')) {
        scheduleRecovery();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleDocumentClick);

    // Radix UIのダイアログイベントを監視
    const handleDialogClose = () => {
      scheduleRecovery();
    };

    // MutationObserverでモーダルの削除を監視
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node instanceof HTMLElement && 
              (node.querySelector('[role="dialog"]') || node.hasAttribute('role') && node.getAttribute('role') === 'dialog')) {
            scheduleRecovery();
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleDocumentClick);
      observer.disconnect();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    recoverButtons: enableAllButtons,
    scheduleRecovery
  };
}