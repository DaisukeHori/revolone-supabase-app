import { type Express, type Request, type Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { users, emailVerifications } from "../db/schema";
import { eq, and, gt } from "drizzle-orm";
import { sendMail } from "./mail";
import Stripe from "stripe";
import { getCustomersByEmail } from "./stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

// リクエストスキーマ
const emailChangeRequestSchema = z.object({
  newEmail: z.string().email(),
});

const emailVerificationSchema = z.object({
  verificationCode: z.string().length(6),
});

const resendCodeSchema = z.object({
  newEmail: z.string().email(),
});

// 認証コード生成
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 認証メール送信
async function sendVerificationEmail(email: string, code: string) {
  const subject = "メールアドレス変更の認証";
  const text = `認証コード: ${code}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">メールアドレス変更の認証</h2>
      <p>お客様のメールアドレス変更を認証するため、以下の認証コードを入力してください。</p>
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

// Stripeの顧客情報チェック
async function checkStripeCustomers(email: string): Promise<{ hasCustomers: boolean; customerCount: number; customerIds: string[] }> {
  try {
    const customers = await getCustomersByEmail(email);
    return {
      hasCustomers: customers.length > 0,
      customerCount: customers.length,
      customerIds: customers.map(c => c.id)
    };
  } catch (error) {
    console.error("[Email Change] Error checking Stripe customers:", error);
    // Stripe接続エラーの場合でもプロセスを続行
    return {
      hasCustomers: false,
      customerCount: 0,
      customerIds: []
    };
  }
}

// Stripeの顧客メールアドレス更新（ロールバック対応）
async function updateStripeCustomerEmails(oldEmail: string, newEmail: string, expectedCustomerIds: string[] = []) {
  // 期待する顧客がいない場合はスキップ
  if (expectedCustomerIds.length === 0) {
    console.log(`[Email Change] No Stripe customers expected for ${oldEmail}, skipping update`);
    return { success: true, updatedCount: 0 };
  }

  const updatedCustomers: string[] = [];
  
  try {
    // 各顧客のメールアドレスを更新
    for (const customerId of expectedCustomerIds) {
      try {
        await stripe.customers.update(customerId, {
          email: newEmail,
        });
        updatedCustomers.push(customerId);
        console.log(`[Email Change] Updated Stripe customer ${customerId} email to ${newEmail}`);
      } catch (error) {
        console.error(`[Email Change] Failed to update Stripe customer ${customerId}:`, error);
        
        // 部分的失敗の場合、成功した更新をロールバック
        if (updatedCustomers.length > 0) {
          console.log(`[Email Change] Rolling back ${updatedCustomers.length} successful updates`);
          await rollbackStripeUpdates(updatedCustomers, oldEmail);
        }
        
        throw new Error(`Stripe customer update failed: ${error}`);
      }
    }

    console.log(`[Email Change] Successfully updated ${updatedCustomers.length} Stripe customers`);
    return { success: true, updatedCount: updatedCustomers.length };
    
  } catch (error) {
    console.error("[Email Change] Error updating Stripe customers:", error);
    throw error;
  }
}

// Stripeの更新をロールバック
async function rollbackStripeUpdates(customerIds: string[], originalEmail: string) {
  console.log(`[Email Change] Rolling back Stripe updates for ${customerIds.length} customers`);
  
  const rollbackPromises = customerIds.map(async (customerId) => {
    try {
      await stripe.customers.update(customerId, {
        email: originalEmail,
      });
      console.log(`[Email Change] Rolled back customer ${customerId} to ${originalEmail}`);
    } catch (error) {
      console.error(`[Email Change] Failed to rollback customer ${customerId}:`, error);
      // ロールバックに失敗してもプロセスを続行（ログのみ）
    }
  });

  await Promise.allSettled(rollbackPromises);
  console.log(`[Email Change] Rollback completed for ${customerIds.length} customers`);
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
  };
  isAuthenticated(): boolean;
}

export function setupEmailChangeRoutes(app: Express) {
  // メールアドレス変更申請
  app.post("/api/email-change/request", async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "ログインが必要です" });
      }

      const { newEmail } = emailChangeRequestSchema.parse(req.body);
      
      // 現在のメールアドレスと同じかチェック
      if (newEmail === req.user.email) {
        return res.status(400).json({ message: "現在のメールアドレスと同じです" });
      }

      // 既に使用されているメールアドレスかチェック
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, newEmail),
      });

      if (existingUser) {
        return res.status(400).json({ message: "このメールアドレスは既に使用されています" });
      }

      // 既存の認証を無効化
      await db.delete(emailVerifications).where(eq(emailVerifications.userId, req.user.id));

      // 新しい認証コードを生成
      const verificationCode = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30分後

      // 現在のメールアドレスでStripe顧客をチェック
      const stripeCustomerInfo = await checkStripeCustomers(req.user.email);
      console.log(`[Email Change] Stripe customer check for ${req.user.email}:`, stripeCustomerInfo);

      // 認証レコードを保存
      await db.insert(emailVerifications).values({
        userId: req.user.id,
        newEmail,
        verificationCode,
        expiresAt,
        hasStripeCustomers: stripeCustomerInfo.hasCustomers,
        stripeCustomerCount: stripeCustomerInfo.customerCount,
        stripeCustomerIds: stripeCustomerInfo.customerIds,
      });

      // 認証メールを送信
      await sendVerificationEmail(newEmail, verificationCode);

      res.json({ message: "認証メールを送信しました" });
    } catch (error) {
      console.error("[Email Change] Request error:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "入力内容を確認してください" });
      }
      
      res.status(500).json({ message: "メールアドレス変更の申請に失敗しました" });
    }
  });

  // 認証コード検証
  app.post("/api/email-change/verify", async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "ログインが必要です" });
      }

      const { verificationCode } = emailVerificationSchema.parse(req.body);

      // 認証レコードを取得
      const verification = await db.query.emailVerifications.findFirst({
        where: and(
          eq(emailVerifications.userId, req.user.id),
          eq(emailVerifications.verificationCode, verificationCode),
          gt(emailVerifications.expiresAt, new Date()),
          eq(emailVerifications.verified, false)
        ),
      });

      if (!verification) {
        return res.status(400).json({ message: "認証コードが正しくないか、期限切れです" });
      }

      // トランザクションで処理
      await db.transaction(async (tx) => {
        // ユーザーのメールアドレスを更新
        await tx.update(users)
          .set({ email: verification.newEmail })
          .where(eq(users.id, req.user!.id));

        // 認証レコードを認証済みにマーク
        await tx.update(emailVerifications)
          .set({ verified: true })
          .where(eq(emailVerifications.id, verification.id));
      });

      // Stripeの顧客メールアドレスを更新
      try {
        const stripeResult = await updateStripeCustomerEmails(
          req.user.email, 
          verification.newEmail,
          verification.stripeCustomerIds || []
        );
        
        console.log(`[Email Change] Stripe update result for user ${req.user.id}:`, stripeResult);
        
        if (!stripeResult.success) {
          throw new Error("Stripe update failed");
        }
      } catch (stripeError) {
        console.error("[Email Change] Stripe update failed, rolling back database changes:", stripeError);
        
        // Stripeの更新が失敗した場合、データベースの変更をロールバック
        await db.transaction(async (tx) => {
          // ユーザーのメールアドレスを元に戻す
          await tx.update(users)
            .set({ email: req.user!.email })
            .where(eq(users.id, req.user!.id));
          
          // 認証レコードを未認証に戻す
          await tx.update(emailVerifications)
            .set({ verified: false })
            .where(eq(emailVerifications.id, verification.id));
        });
        
        return res.status(500).json({ 
          message: "Stripeの顧客情報更新に失敗しました。メールアドレスは変更されていません。" 
        });
      }

      res.json({ message: "メールアドレスが正常に変更されました" });
    } catch (error) {
      console.error("[Email Change] Verify error:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "認証コードの形式が正しくありません" });
      }
      
      res.status(500).json({ message: "認証処理に失敗しました" });
    }
  });

  // 認証コード再送信
  app.post("/api/email-change/resend", async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "ログインが必要です" });
      }

      const { newEmail } = resendCodeSchema.parse(req.body);

      // 既存の認証レコードを取得
      const existingVerification = await db.query.emailVerifications.findFirst({
        where: and(
          eq(emailVerifications.userId, req.user.id),
          eq(emailVerifications.newEmail, newEmail),
          eq(emailVerifications.verified, false)
        ),
      });

      if (!existingVerification) {
        return res.status(400).json({ message: "認証申請が見つかりません" });
      }

      // 新しい認証コードを生成
      const verificationCode = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30分後

      // 現在のメールアドレスでStripe顧客をチェック（再送信時にも最新情報を取得）
      const stripeCustomerInfo = await checkStripeCustomers(req.user.email);
      console.log(`[Email Change] Stripe customer check for resend ${req.user.email}:`, stripeCustomerInfo);

      // 認証レコードを更新
      await db.update(emailVerifications)
        .set({ 
          verificationCode,
          expiresAt,
          hasStripeCustomers: stripeCustomerInfo.hasCustomers,
          stripeCustomerCount: stripeCustomerInfo.customerCount,
          stripeCustomerIds: stripeCustomerInfo.customerIds,
        })
        .where(eq(emailVerifications.id, existingVerification.id));

      // 認証メールを送信
      await sendVerificationEmail(newEmail, verificationCode);

      res.json({ message: "認証メールを再送信しました" });
    } catch (error) {
      console.error("[Email Change] Resend error:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "入力内容を確認してください" });
      }
      
      res.status(500).json({ message: "認証メールの再送信に失敗しました" });
    }
  });
}