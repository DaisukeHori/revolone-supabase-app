import mail from "@sendgrid/mail";
import { currentConfig } from './config';

if (!currentConfig.sendgrid.apiKey) {
  throw new Error("SENDGRID_API_KEY環境変数が設定されていません");
}

mail.setApiKey(currentConfig.sendgrid.apiKey);

type SendMailOptions = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export async function sendMail({ to, subject, text, html }: SendMailOptions) {
  const msg = {
    to,
    from: "info@revol-one.com",
    subject,
    text,
    html,
  };

  console.log(`[SendGrid] 送信準備: ${to} - ${subject}`);
  console.log(`[SendGrid] API Key exists: ${!!currentConfig.sendgrid.apiKey}`);
  console.log(`[SendGrid] API Key prefix: ${currentConfig.sendgrid.apiKey?.substring(0, 10)}...`);

  try {
    await mail.send(msg);
    console.log(`[SendGrid] メール送信成功: ${to}`);
    return { success: true };
  } catch (error: any) {
    console.error("メール送信エラー:", error);
    
    if (error.response?.body?.errors) {
      console.error("SendGrid詳細エラー:", error.response.body.errors);
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "不明なエラーが発生しました" 
    };
  }
}

export function generatePasswordResetEmail(email: string, token: string) {
  // Replitの環境変数からURLを取得、なければホスト名を使用
  const baseUrl = process.env.REPL_ID 
    ? `https://4e56d1d1-d1a9-4066-bb2f-2af5288c23a8-00-24gsjhthsy0o7.sisko.replit.dev`
    : "http://localhost:5000";

  const resetLink = `${baseUrl}/reset-password?token=${token}`;

  return {
    subject: "パスワードリセットのご案内",
    text: `
パスワードリセットのリクエストを受け付けました。

以下のリンクをクリックしてパスワードを再設定してください：
${resetLink}

このリンクは1時間後に無効となります。

※このメールに心当たりがない場合は、このメールを破棄してください。
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<body>
  <p>パスワードリセットのリクエストを受け付けました。</p>
  <p>以下のリンクをクリックしてパスワードを再設定してください：</p>
  <p>
    <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #8b1c1c; color: white; text-decoration: none; border-radius: 4px;">
      パスワードを再設定
    </a>
  </p>
  <p>このリンクは1時間後に無効となります。</p>
  <p style="color: #666; font-size: 0.9em;">
    ※このメールに心当たりがない場合は、このメールを破棄してください。
  </p>
</body>
</html>
    `.trim()
  };
}