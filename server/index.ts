import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
    log("アプリケーションを起動中...");
    const server = registerRoutes(app);

    // エラーハンドリングミドルウェアを設定
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('エラー詳細:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
        code: err.code,
        statusCode: err.statusCode,
      });

      const status = err.status || err.statusCode || 500;
      const message = err.message || "予期せぬエラーが発生しました";

      if (!res.headersSent) {
        res.status(status).json({ message });
      }
    });

    if (app.get("env") === "development") {
      log("開発モードでViteを設定中...");
      await setupVite(app, server);
    } else {
      log("本番モードで静的ファイルを設定中...");
      serveStatic(app);
    }

    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`サーバーが起動しました。ポート: ${PORT}`);
    });
  } catch (error) {
    console.error('アプリケーション起動エラー:', error);
    process.exit(1);
  }
})();