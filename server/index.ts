import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { env, isDevelopment } from "./config";
import { ensureDatabaseReady } from "./database-init";
import { attachSupabaseUser } from "./supabaseMiddleware";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// Supabase Auth のJWTをBearerで受け取り、req.userを付与（Passport未認証時のみ上書き）
app.use(attachSupabaseUser);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // データベース初期化（絶対に安全）
    await ensureDatabaseReady();
    
    const server = registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Error:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "予期せぬエラーが発生しました";

      res.status(status).json({ message });
    });

    if (isDevelopment) {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const PORT = Number(process.env.PORT) || 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`サーバーが起動しました。ポート: ${PORT} (${env.NODE_ENV}環境)`);
      
      // 起動時に包括的な環境チェック
      console.log('========== デプロイメント環境チェック ==========');
      console.log('NODE_ENV:', process.env.NODE_ENV);
      console.log('PORT:', PORT);
      console.log('HOST: 0.0.0.0 (Cloud Run対応)');
      
      // 必須環境変数の確認
      const requiredSecrets = {
        DATABASE_URL: !!process.env.DATABASE_URL,
        STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
        STRIPE_PUBLISHABLE_KEY: !!process.env.STRIPE_PUBLISHABLE_KEY,
        KINTONE_API_TOKEN_ALL: !!process.env.KINTONE_API_TOKEN_ALL,
        SENDGRID_API_KEY: !!process.env.SENDGRID_API_KEY,
        TWILIO_ACCOUNT_SID: !!process.env.TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN: !!process.env.TWILIO_AUTH_TOKEN,
      };
      
      console.log('必須環境変数の状態:');
      Object.entries(requiredSecrets).forEach(([key, exists]) => {
        console.log(`  ${key}: ${exists ? '✓ 設定済み' : '✗ 未設定'}`);
        if (exists && key === 'KINTONE_API_TOKEN_ALL') {
          console.log(`    長さ: ${process.env.KINTONE_API_TOKEN_ALL?.length}文字`);
        }
      });
      
      // 欠けている環境変数の警告
      const missingSecrets = Object.entries(requiredSecrets)
        .filter(([_, exists]) => !exists)
        .map(([key, _]) => key);
      
      if (missingSecrets.length > 0) {
        console.warn('警告: 以下の環境変数が設定されていません:');
        missingSecrets.forEach(secret => console.warn(`  - ${secret}`));
        console.warn('これらの機能が正常に動作しない可能性があります。');
      }
      
      console.log('ヘルスチェックエンドポイント:');
      console.log(`  基本: http://localhost:${PORT}/health`);
      console.log(`  詳細: http://localhost:${PORT}/health/detailed`);
      console.log('===============================================');
    });
  } catch (error) {
    console.error('アプリケーション起動エラー:', error);
    process.exit(1);
  }
})();