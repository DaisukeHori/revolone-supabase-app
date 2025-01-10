import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// リクエストロギングミドルウェア
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
    log('アプリケーションの起動を開始します...');
    const server = registerRoutes(app);

    // エラーハンドリングミドルウェア
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('エラーが発生しました:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "予期せぬエラーが発生しました";

      res.status(status).json({ message });
    });

    if (app.get("env") === "development") {
      log('開発モードでViteを設定中...');
      await setupVite(app, server);
      log('Viteの設定が完了しました');
    } else {
      log('本番モードで静的ファイルを設定中...');
      serveStatic(app);
      log('静的ファイルの設定が完了しました');
    }

    const PORT = process.env.PORT || 5000;
    log(`利用可能なポートを探索中... 開始ポート: ${PORT}`);

    const startServer = (port: number) => {
      server.listen(port, "0.0.0.0", () => {
        log(`サーバーが起動しました。ポート: ${port}`);
      }).on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          log(`ポート ${port} は使用中です。次のポートを試行します...`);
          startServer(port + 1);
        } else {
          console.error('サーバー起動エラー:', err);
          process.exit(1);
        }
      });

      // Graceful shutdown
      process.on('SIGTERM', () => {
        log('SIGTERM received. サーバーをシャットダウンします...');
        server.close(() => {
          log('サーバーを正常に終了しました。');
          process.exit(0);
        });
      });

      // 追加のシグナルハンドリング
      process.on('SIGINT', () => {
        log('SIGINT received. サーバーをシャットダウンします...');
        server.close(() => {
          log('サーバーを正常に終了しました。');
          process.exit(0);
        });
      });
    };

    startServer(Number(PORT));
  } catch (error) {
    console.error('アプリケーション起動エラー:', error);
    process.exit(1);
  }
})();