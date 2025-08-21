import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'jp.revol.portal',
  appName: 'Revol Portal',
  webDir: 'dist',
  server: {
    // 本番WebのURL。アプリはこのURLを表示（Web更新＝アプリ即時反映）
    url: 'https://app.revol-one.com',
    androidScheme: 'https',
    cleartext: false
  }
};

export default config;
