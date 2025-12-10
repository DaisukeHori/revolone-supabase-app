# 環境変数・デプロイ設定（移植用）

## 環境変数一覧
- Auth: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`（Functions側はService Roleを使わない）
- DB: `DATABASE_URL`（Supabase Postgres接続文字列）
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` or `VITE_STRIPE_PUBLIC_KEY`
- Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- SendGrid: `SENDGRID_API_KEY`（または `SENDGRID_REVOLONE_API_KEY`）
- Kintone: `KINTONE_API_TOKEN`（現行はAppまとめたトークン）
- その他: `MASTER_PASSWORD`（移行後は非推奨）、`NODE_ENV`

## デプロイ先別の考慮
- Supabase Functions: AuthorizationヘッダでBearer JWTを受け付ける。CORSはフロントOriginを許可。
- Vercel (フロント): APIはFunctionsエンドポイントURLに向ける。`VITE_*`公開キーはビルド時注入。
- バックエンドをSupabase Functionsのみで動かす場合、環境変数はSupabaseプロジェクトのSecretsに登録。

## CORS/認証ヘッダ方針
- セッションCookieは使わず、Authorization: Bearer <JWT> を全APIで前提。
- Supabase Authのアクセストークンをフロントから常に付与。

## Secrets管理
- Supabase: `supabase secrets set ...`
- Vercel: Project Settings → Environment Variables（Preview/Production分離）


