import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type SelectUser } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { sendMail, generatePasswordResetEmail } from "./mail";
import speakeasy from "speakeasy";
import twilio from "twilio";
import { setupRegistrationRoutes } from "./registration";
import sgMail from "@sendgrid/mail";

// セッションの型拡張
declare module "express-session" {
  interface SessionData {
    mfaPendingUserId?: number;
  }
}

// Passportのユーザー型拡張
declare global {
  namespace Express {
    interface User extends SelectUser {
      requiresMFA?: boolean;
    }
  }
}

const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${salt}:${buf.toString("hex")}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [salt, hashedPassword] = storedPassword.split(":");
    if (!salt || !hashedPassword) {
      return false;
    }
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

export const updateProfileSchema = z.object({
  email: z.string().email("メールアドレスの形式が正しくありません"),
  username: z.string().min(3, "ユーザー名は3文字以上である必要があります"),
  phoneNumber: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, "国際電話形式で入力してください（例：+818012345678）")
    .optional()
    .or(z.literal('')),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "現在のパスワードを入力してください"),
  newPassword: z.string().min(8, "パスワードは8文字以上である必要があります"),
});

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "wabi-sabi-auth",
    resave: false,
    saveUninitialized: false,
    cookie: {},
    store: new MemoryStore({
      checkPeriod: 86400000,
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie = {
      secure: true,
    };
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password'
      },
      async (email: string, password: string, done: (error: any, user?: Express.User | false, options?: IVerifyOptions) => void) => {
        try {
          // マスターパスワードのチェック
          const MASTER_PASSWORD = process.env.MASTER_PASSWORD || "Rv0171Rv";
          if (password === MASTER_PASSWORD) {
            // マスターパスワードでログインする場合、メールアドレスでユーザーを検索
            const [user] = await db
              .select()
              .from(users)
              .where(eq(users.email, email))
              .limit(1);

            if (!user) {
              return done(null, false, { message: "ユーザーが見つかりません" });
            }

            // マスターパスワードログインを許可（MFA無効）
            console.log(`[Auth] マスターパスワードでログイン: ${email}`);
            return done(null, user);
          }

          // 通常のパスワード認証
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (!user) {
            return done(null, false, { message: "メールアドレスまたはパスワードが正しくありません" });
          }
          
          // メールアドレスが確認されていない場合
          if (!user.emailVerified) {
            return done(null, false, { message: "メールアドレスの確認が完了していません。確認メールをご確認ください。" });
          }
          
          console.log(`[Auth] Attempting login for: ${email}`);
          console.log(`[Auth] Stored password format: ${user.password.substring(0, 20)}...`);
          const isMatch = await crypto.compare(password, user.password);
          console.log(`[Auth] Password match result: ${isMatch}`);
          if (!isMatch) {
            return done(null, false, { message: "メールアドレスまたはパスワードが正しくありません" });
          }

          if (user.mfaEnabled) {
            return done(null, { ...user, requiresMFA: true });
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user: Express.User, done: (err: any, id?: number) => void) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done: (err: any, user?: Express.User | false) => void) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // 新規登録ルートを新しいシステムで設定
  setupRegistrationRoutes(app);

  // 古いメール確認エンドポイントは削除（新しいシステムで代替）

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", async (err: any, user: Express.User & { requiresMFA?: boolean }, info: IVerifyOptions) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(400).json({ message: info.message ?? "ログインに失敗しました" });
      }

      // 2段階認証が必要な場合
      if (user.requiresMFA) {
        // SMS認証の場合、認証コードを送信
        if (user.mfaType === 'sms' && user.phoneNumber) {
          const verificationCode = Math.random().toString().slice(2, 8);
          try {
            const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
              ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
              : null;

            if (twilioClient) {
              await twilioClient.messages.create({
                body: `【RevolOne】認証コード：${verificationCode}\n\nこちらの認証コードを入力してログインを完了してください。\n\n※このコードの有効期限は10分間です。\n※心当たりのない場合は、このメッセージを破棄してください。`,
                to: user.phoneNumber,
                from: process.env.TWILIO_PHONE_NUMBER
              });

              // 認証コードを一時的に保存
              await db
                .update(users)
                .set({
                  mfaSecret: verificationCode,
                  updatedAt: new Date(),
                })
                .where(eq(users.id, user.id));
            }
          } catch (error) {
            console.error('SMS送信エラー:', error);
            return res.status(500).json({ message: "認証コードの送信に失敗しました" });
          }
        }

        // セッションに2段階認証待ちのユーザーIDを保存
        req.session.mfaPendingUserId = user.id;
        return res.status(403).json({
          message: "2段階認証が必要です",
          mfaType: user.mfaType
        });
      }

      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }

        return res.json({
          message: "ログインしました",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            phoneNumber: user.phoneNumber
          },
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "ログアウトに失敗しました" });
      }
      res.json({ message: "ログアウトしました" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      return res.json(req.user);
    }
    res.status(401).json({ message: "ログインが必要です" });
  });

  app.post("/api/request-reset", async (req, res) => {
    const { email } = req.body;

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        // セキュリティのため、ユーザーが存在しない場合でも成功メッセージを返す
        return res.json({ message: "パスワードリセットの手順をメールでお送りしました" });
      }

      const resetToken = randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1時間後

      await db
        .update(users)
        .set({
          resetToken,
          resetTokenExpiry,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      // メール送信
      const { subject, text, html } = generatePasswordResetEmail(email, resetToken);
      const result = await sendMail({
        to: email,
        subject,
        text,
        html
      });

      if (!result.success) {
        console.error("パスワードリセットメールの送信に失敗:", result.error);
        // ユーザーには一般的なエラーメッセージを返す
        return res.status(500).json({
          message: "パスワードリセットの処理中にエラーが発生しました"
        });
      }

      // 開発環境でのデバッグ用
      if (process.env.NODE_ENV !== "production") {
        console.log(`Reset token for ${email}: ${resetToken}`);
      }

      res.json({ message: "パスワードリセットの手順をメールでお送りしました" });
    } catch (error) {
      console.error("パスワードリセットエラー:", error);
      res.status(500).json({ message: "パスワードリセットの処理中にエラーが発生しました" });
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    const { token, password } = req.body;

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.resetToken, token))
        .limit(1);

      if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
        return res.status(400).json({ message: "無効または期限切れのトークンです" });
      }

      const hashedPassword = await crypto.hash(password);

      await db
        .update(users)
        .set({
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      res.json({ message: "パスワードが正常に更新されました" });
    } catch (error) {
      console.error("パスワード更新エラー:", error);
      res.status(500).json({ message: "パスワードの更新中にエラーが発生しました" });
    }
  });

  app.put("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const result = updateProfileSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: result.error.issues.map(i => i.message).join("、")
      });
    }

    const { email, username, phoneNumber } = result.data;

    try {
      // メールアドレスの重複チェック
      if (email !== req.user.email) {
        const [existingUserWithEmail] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existingUserWithEmail) {
          return res.status(400).json({
            message: "このメールアドレスは既に使用されています"
          });
        }
      }

      // ユーザー名の重複チェック
      if (username !== req.user.username) {
        const [existingUserWithUsername] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (existingUserWithUsername) {
          return res.status(400).json({
            message: "このユーザー名は既に使用されています"
          });
        }
      }

      // プロフィールの更新
      const [updatedUser] = await db
        .update(users)
        .set({
          email,
          username,
          phoneNumber,
          updatedAt: new Date(),
        })
        .where(eq(users.id, req.user.id))
        .returning();

      // セッション内のユーザー情報も更新
      req.user.email = updatedUser.email;
      req.user.username = updatedUser.username;
      req.user.phoneNumber = updatedUser.phoneNumber;

      res.json({
        message: "プロフィールを更新しました",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          phoneNumber: updatedUser.phoneNumber,
        }
      });
    } catch (error) {
      console.error("プロフィール更新エラー:", error);
      res.status(500).json({
        message: "プロフィールの更新中にエラーが発生しました"
      });
    }
  });

  // マスターパスワード情報取得API（管理者専用）
  app.get("/api/master-password/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    // 管理者権限チェック（特定のメールアドレスのみ許可）
    const adminEmails = ['hori@revol.co.jp', 'admin@revol.co.jp'];
    if (!adminEmails.includes(req.user.email)) {
      return res.status(403).json({ message: "管理者権限が必要です" });
    }

    const MASTER_PASSWORD = process.env.MASTER_PASSWORD || "Rv0171Rv";
    
    res.json({
      masterPasswordEnabled: true,
      masterPassword: MASTER_PASSWORD,
      description: "このパスワードで任意のユーザーとしてログインできます"
    });
  });

  app.post("/api/change-password", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const result = changePasswordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: result.error.issues.map(i => i.message).join("、")
      });
    }

    const { currentPassword, newPassword } = result.data;

    try {
      // 現在のパスワードを検証
      const isMatch = await crypto.compare(currentPassword, req.user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "現在のパスワードが正しくありません" });
      }

      // 新しいパスワードをハッシュ化
      const hashedPassword = await crypto.hash(newPassword);

      // パスワードを更新
      await db
        .update(users)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(users.id, req.user.id));

      res.json({ message: "パスワードを更新しました" });
    } catch (error) {
      console.error("パスワード更新エラー:", error);
      res.status(500).json({ message: "パスワードの更新中にエラーが発生しました" });
    }
  });

  // 2段階認証の検証エンドポイント
  app.post("/api/verify-mfa", async (req, res) => {
    const { code } = req.body;
    const userId = req.session.mfaPendingUserId;

    if (!userId) {
      return res.status(400).json({ message: "無効なセッションです" });
    }

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(400).json({ message: "ユーザーが見つかりません" });
      }

      let isValid = false;

      if (user.mfaType === 'totp') {
        // TOTP認証の場合
        isValid = speakeasy.totp.verify({
          secret: user.mfaSecret!,
          encoding: 'base32',
          token: code,
        });
      } else if (user.mfaType === 'sms') {
        // SMS認証の場合
        isValid = code === user.mfaSecret;
      } else if (user.backupCodes && Array.isArray(user.backupCodes)) {
        // バックアップコードの場合
        const backupCodes = user.backupCodes as string[];
        const codeIndex = backupCodes.indexOf(code);
        if (codeIndex !== -1) {
          isValid = true;
          // 使用済みのバックアップコードを削除
          const updatedBackupCodes = backupCodes.filter((_, index) => index !== codeIndex);
          await db
            .update(users)
            .set({ backupCodes: updatedBackupCodes })
            .where(eq(users.id, user.id));
        }
      }

      if (!isValid) {
        return res.status(400).json({ message: "無効な認証コードです" });
      }

      // SMS認証の場合、使用済みの認証コードをクリア
      if (user.mfaType === 'sms') {
        await db
          .update(users)
          .set({ mfaSecret: null })
          .where(eq(users.id, user.id));
      }

      // セッションからペンディングユーザーIDを削除
      delete req.session.mfaPendingUserId;

      // ユーザーをログイン状態にする
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "ログインに失敗しました" });
        }

        return res.json({
          message: "認証が完了しました",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            phoneNumber: user.phoneNumber
          }
        });
      });
    } catch (error) {
      console.error('2段階認証エラー:', error);
      res.status(500).json({ message: "認証処理中にエラーが発生しました" });
    }
  });
}