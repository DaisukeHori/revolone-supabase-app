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

const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export const updateProfileSchema = z.object({
  email: z.string().email("メールアドレスの形式が正しくありません"),
  username: z.string().min(3, "ユーザー名は3文字以上である必要があります"),
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
    new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password'
    }, async (email, password, done) => {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user) {
          return done(null, false, { message: "メールアドレスまたはパスワードが正しくありません" });
        }
        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "メールアドレスまたはパスワードが正しくありません" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
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

  app.post("/api/register", async (req, res, next) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ message: result.error.issues.map(i => i.message).join("、") });
      }

      const { email, username, password } = result.data;

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({ message: "このメールアドレスは既に登録されています" });
      }

      const hashedPassword = await crypto.hash(password);

      const [newUser] = await db
        .insert(users)
        .values({
          email,
          username,
          password: hashedPassword,
        })
        .returning();

      req.login(newUser, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          message: "登録が完了しました",
          user: { id: newUser.id, username: newUser.username, email: newUser.email },
        });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User, info: IVerifyOptions) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(400).json({ message: info.message ?? "ログインに失敗しました" });
      }

      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }

        return res.json({
          message: "ログインしました",
          user: { id: user.id, username: user.username, email: user.email },
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

    const { email, username } = result.data;

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
          updatedAt: new Date(),
        })
        .where(eq(users.id, req.user.id))
        .returning();

      // セッション内のユーザー情報も更新
      req.user.email = updatedUser.email;
      req.user.username = updatedUser.username;

      res.json({ 
        message: "プロフィールを更新しました",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
        }
      });
    } catch (error) {
      console.error("プロフィール更新エラー:", error);
      res.status(500).json({ 
        message: "プロフィールの更新中にエラーが発生しました" 
      });
    }
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

      // TODO: パスワードリセットトークンの生成とメール送信機能の実装
      const resetToken = randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1時間後

      await db
        .update(users)
        .set({
          resetToken,
          resetTokenExpiry,
        })
        .where(eq(users.id, user.id));

      // ここでメール送信処理を実装予定

      res.json({ message: "パスワードリセットの手順をメールでお送りしました" });
    } catch (error) {
      console.error("パスワードリセットエラー:", error);
      res.status(500).json({ message: "パスワードリセットの処理中にエラーが発生しました" });
    }
  });
}