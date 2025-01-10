import { type Express } from "express";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import twilio from "twilio";

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// TOTPシークレットの生成
function generateTOTPSecret(username: string) {
  return speakeasy.generateSecret({
    name: `RevolOne (${username})`,
    issuer: 'RevolOne'
  });
}

// バックアップコードの生成
function generateBackupCodes(): string[] {
  return Array.from({ length: 10 }, () => 
    Math.random().toString(36).substring(2, 8).toUpperCase()
  );
}

// メール認証コードの送信
async function sendEmailCode(email: string, code: string) {
  // TODO: SendGrid統合を実装
  console.log(`Send email code ${code} to ${email}`);
}

// SMS認証コードの送信
async function sendSMSCode(phoneNumber: string, code: string) {
  if (!twilioClient) {
    throw new Error("Twilio credentials not configured");
  }

  await twilioClient.messages.create({
    body: `【RevolOne】認証コード：${code}\n\nこのコードを使用して2段階認証の設定を完了してください。有効期限は10分です。\n\nこのコードに関するご不明な点がございましたら、カスタマーサポートまでお問い合わせください。\n\nセキュリティを確保するため、このコードを他者と共有しないでください。`,
    to: phoneNumber,
    from: process.env.TWILIO_PHONE_NUMBER
  });
}

export function setupMFARoutes(app: Express) {
  // MFA設定の取得
  app.get("/api/mfa/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    try {
      const [user] = await db
        .select({
          mfaEnabled: users.mfaEnabled,
          mfaType: users.mfaType,
          phoneNumber: users.phoneNumber
        })
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);

      res.json({
        enabled: user.mfaEnabled || false,
        type: user.mfaType,
        phoneNumber: user.phoneNumber
      });
    } catch (error) {
      console.error('MFAステータス取得エラー:', error);
      res.status(500).json({ message: "MFA設定の取得に失敗しました" });
    }
  });

  // TOTP設定の開始
  app.post("/api/mfa/setup/totp", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    try {
      const secret = generateTOTPSecret(req.user.username || '');
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');
      const backupCodes = generateBackupCodes();

      await db
        .update(users)
        .set({
          mfaSecret: secret.base32,
          backupCodes: backupCodes,
          mfaType: 'totp',
          mfaEnabled: false
        })
        .where(eq(users.id, req.user.id));

      res.json({
        qrCode: qrCodeUrl,
        secret: secret.base32,
        backupCodes
      });
    } catch (error) {
      console.error('TOTP設定エラー:', error);
      res.status(500).json({ message: "TOTP設定の開始に失敗しました" });
    }
  });

  // TOTP検証と有効化
  app.post("/api/mfa/verify/totp", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: "認証コードが必要です" });
    }

    try {
      const [user] = await db
        .select({
          mfaSecret: users.mfaSecret
        })
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);

      if (!user.mfaSecret) {
        return res.status(400).json({ message: "TOTP設定が見つかりません" });
      }

      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: code
      });

      if (!verified) {
        return res.status(400).json({ message: "認証コードが正しくありません" });
      }

      await db
        .update(users)
        .set({ mfaEnabled: true })
        .where(eq(users.id, req.user.id));

      res.json({ message: "2段階認証が有効化されました" });
    } catch (error) {
      console.error('TOTP検証エラー:', error);
      res.status(500).json({ message: "TOTP検証に失敗しました" });
    }
  });

  // SMS設定の開始
  app.post("/api/mfa/setup/sms", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ message: "電話番号が必要です" });
    }

    try {
      const verificationCode = Math.random().toString().slice(2, 8);
      await sendSMSCode(phoneNumber, verificationCode);

      const backupCodes = generateBackupCodes();

      await db
        .update(users)
        .set({
          phoneNumber,
          mfaSecret: verificationCode,
          backupCodes,
          mfaType: 'sms',
          mfaEnabled: false
        })
        .where(eq(users.id, req.user.id));

      res.json({
        message: "認証コードを送信しました",
        backupCodes
      });
    } catch (error) {
      console.error('SMS設定エラー:', error);
      res.status(500).json({ message: "SMS設定の開始に失敗しました" });
    }
  });

  // SMS検証と有効化
  app.post("/api/mfa/verify/sms", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: "認証コードが必要です" });
    }

    try {
      const [user] = await db
        .select({
          mfaSecret: users.mfaSecret
        })
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);

      if (code !== user.mfaSecret) {
        return res.status(400).json({ message: "認証コードが正しくありません" });
      }

      await db
        .update(users)
        .set({ mfaEnabled: true, mfaSecret: null })
        .where(eq(users.id, req.user.id));

      res.json({ message: "2段階認証が有効化されました" });
    } catch (error) {
      console.error('SMS検証エラー:', error);
      res.status(500).json({ message: "SMS検証に失敗しました" });
    }
  });

  // バックアップコードによる認証
  app.post("/api/mfa/verify/backup", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: "バックアップコードが必要です" });
    }

    try {
      const [user] = await db
        .select({
          backupCodes: users.backupCodes
        })
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);

      if (!user.backupCodes || !Array.isArray(user.backupCodes)) {
        return res.status(400).json({ message: "バックアップコードが設定されていません" });
      }

      const backupCodes = user.backupCodes as string[];
      const codeIndex = backupCodes.indexOf(code);

      if (codeIndex === -1) {
        return res.status(400).json({ message: "バックアップコードが正しくありません" });
      }

      // 使用済みのバックアップコードを削除
      const updatedBackupCodes = backupCodes.filter((_, index) => index !== codeIndex);

      await db
        .update(users)
        .set({ backupCodes: updatedBackupCodes })
        .where(eq(users.id, req.user.id));

      res.json({ message: "認証に成功しました" });
    } catch (error) {
      console.error('バックアップコード検証エラー:', error);
      res.status(500).json({ message: "バックアップコード検証に失敗しました" });
    }
  });

  // MFAの無効化
  app.post("/api/mfa/disable", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "ログインが必要です" });
    }

    try {
      await db
        .update(users)
        .set({
          mfaEnabled: false,
          mfaType: null,
          mfaSecret: null,
          backupCodes: null
        })
        .where(eq(users.id, req.user.id));

      res.json({ message: "2段階認証が無効化されました" });
    } catch (error) {
      console.error('MFA無効化エラー:', error);
      res.status(500).json({ message: "MFAの無効化に失敗しました" });
    }
  });
}