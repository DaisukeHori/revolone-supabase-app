import mail from "@sendgrid/mail";

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY環境変数が設定されていません");
}

mail.setApiKey(process.env.SENDGRID_API_KEY);

type SendMailOptions = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export async function sendMail({ to, subject, text, html }: SendMailOptions) {
  const msg = {
    to,
    from: "info@revol-one.com", // SendGridで認証済みのドメイン
    subject,
    text,
    html,
  };

  try {
    await mail.send(msg);
    return { success: true };
  } catch (error) {
    console.error("メール送信エラー:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "不明なエラーが発生しました" 
    };
  }
}

export function generatePasswordResetEmail(email: string, token: string) {
  const resetLink = `${process.env.APP_URL || "http://localhost:5000"}/reset-password?token=${token}`;
  
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
