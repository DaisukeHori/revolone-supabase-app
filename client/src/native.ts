export function isNative(): boolean {
  return Boolean((window as any)?.Capacitor?.isNativePlatform);
}

// 共有シートを開く（アプリ）/ クリップボードにコピーして案内（Web）
export async function share(opts: { title?: string; text?: string; url?: string; dialogTitle?: string }) {
  if (isNative()) {
    const { Share } = await import('@capacitor/share');
    return Share.share(opts);
  } else {
    const clip = [opts.text, opts.url].filter(Boolean).join('\n');
    if (clip) {
      await navigator.clipboard.writeText(clip);
      alert('共有はアプリ版で動作します。内容をクリップボードにコピーしました。');
    } else {
      alert('共有はアプリ版でご利用ください。');
    }
  }
}

// QR コード/バーコードを読み取る（アプリ）/ 案内（Web）
export async function scanQr(onResult: (content: string) => void) {
  if (!isNative()) {
    alert('QR読み取りはアプリ版でご利用ください');
    return;
  }
  const { BarcodeScanner } = await import('@capacitor-community/barcode-scanner');

  // カメラ権限の確認と要求
  const perm = await BarcodeScanner.checkPermission({ force: true });
  if (!perm.granted) {
    alert('カメラ権限が必要です');
    return;
  }

  await BarcodeScanner.hideBackground();
  try {
    const result = await BarcodeScanner.startScan();
    if (result?.hasContent) onResult(result.content);
  } finally {
    await BarcodeScanner.showBackground();
  }
}