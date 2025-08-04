import { type Express, type Request, type Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { users, registrationVerifications } from "../db/schema";
import { eq, and, gt } from "drizzle-orm";
import { sendMail } from "./mail";
import * as crypto from "crypto";
import { promisify } from "util";

// リクエストスキーマ
const registrationRequestSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3, "ユーザー名は3文字以上である必要があります"),
  password: z.string().min(8, "パスワードは8文字以上である必要があります"),
});

const verificationCodeSchema = z.object({
  email: z.string().email(),
  verificationCode: z.string().length(6),
});

const resendCodeSchema = z.object({
  email: z.string().email(),
});

// 暗号化関数（auth.tsと同じ実装を使用）
const scrypt = promisify(crypto.scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${buf.toString("hex")}`;
}

// 認証コード生成
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 認証メール送信
async function sendRegistrationVerificationEmail(email: string, username: string, code: string) {
  const subject = "新規登録の認証コード";
  const text = `認証コード: ${code}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">新規登録の認証</h2>
      <p>こんにちは、${username}さん</p>
      <p>Revonizer Management Systemへのご登録ありがとうございます。</p>
      <p>以下の認証コードを入力して、登録を完了してください。</p>
      <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
        <h3 style="color: #007bff; font-size: 24px; margin: 0;">${code}</h3>
      </div>
      <p>この認証コードは30分間有効です。</p>
      <p style="color: #666; font-size: 12px;">
        もしこのメールに心当たりがない場合は、無視してください。
      </p>
    </div>
  `;

  await sendMail({
    to: email,
    subject,
    text,
    html,
  });
}

export function setupRegistrationRoutes(app: Express) {
  // 新規登録申請
  app.post("/api/registration/request", async (req: Request, res: Response) => {
    try {
      const { email, username, password } = registrationRequestSchema.parse(req.body);
      
      // 既に使用されているメールアドレスかチェック
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingUser) {
        return res.status(400).json({ message: "このメールアドレスは既に登録されています" });
      }

      // 既存の認証を無効化（同じメールアドレスの未認証データを削除）
      await db.delete(registrationVerifications).where(eq(registrationVerifications.email, email));

      // パスワードをハッシュ化
      const hashedPassword = await hashPassword(password);

      // 新しい認証コードを生成
      const verificationCode = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30分後

      // 認証レコードを保存
      await db.insert(registrationVerifications).values({
        email,
        username,
        hashedPassword,
        verificationCode,
        expiresAt,
      });

      // 認証メールを送信
      await sendRegistrationVerificationEmail(email, username, verificationCode);

      res.json({ message: "認証メールを送信しました" });
    } catch (error) {
      console.error("[Registration] Request error:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.issues.map(i => i.message).join("、") });
      }
      
      res.status(500).json({ message: "新規登録の申請に失敗しました" });
    }
  });

  // 認証コード検証
  app.post("/api/registration/verify", async (req: Request, res: Response) => {
    try {
      const { email, verificationCode } = verificationCodeSchema.parse(req.body);

      // 認証レコードを取得
      const verification = await db.query.registrationVerifications.findFirst({
        where: and(
          eq(registrationVerifications.email, email),
          eq(registrationVerifications.verificationCode, verificationCode),
          gt(registrationVerifications.expiresAt, new Date()),
          eq(registrationVerifications.verified, false)
        ),
      });

      if (!verification) {
        return res.status(400).json({ message: "認証コードが正しくないか、期限切れです" });
      }

      // トランザクションで処理
      await db.transaction(async (tx) => {
        // ユーザーを作成
        await tx.insert(users).values({
          email: verification.email,
          username: verification.username,
          password: verification.hashedPassword,
          emailVerified: true,
        });

        // 認証レコードを認証済みにマーク
        await tx.update(registrationVerifications)
          .set({ verified: true })
          .where(eq(registrationVerifications.id, verification.id));
      });

      res.json({ message: "新規登録が完了しました。ログインできます。" });
    } catch (error) {
      console.error("[Registration] Verify error:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "認証コードの形式が正しくありません" });
      }
      
      res.status(500).json({ message: "認証処理に失敗しました" });
    }
  });

  // 認証コード再送信
  app.post("/api/registration/resend", async (req: Request, res: Response) => {
    try {
      const { email } = resendCodeSchema.parse(req.body);

      // 既存の認証レコードを取得
      const existingVerification = await db.query.registrationVerifications.findFirst({
        where: and(
          eq(registrationVerifications.email, email),
          eq(registrationVerifications.verified, false)
        ),
      });

      if (!existingVerification) {
        return res.status(400).json({ message: "認証待ちの登録データが見つかりません" });
      }

      // 新しい認証コードを生成
      const verificationCode = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30分後

      // 認証レコードを更新
      await db.update(registrationVerifications)
        .set({
          verificationCode,
          expiresAt,
        })
        .where(eq(registrationVerifications.id, existingVerification.id));

      // 認証メールを再送信
      await sendRegistrationVerificationEmail(email, existingVerification.username, verificationCode);

      res.json({ message: "認証コードを再送信しました" });
    } catch (error) {
      console.error("[Registration] Resend error:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "入力内容を確認してください" });
      }
      
      res.status(500).json({ message: "認証コードの再送信に失敗しました" });
    }
  });
}