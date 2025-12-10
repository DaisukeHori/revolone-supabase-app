# API コントラクト（現行実装ベース）
- 想定環境: Express + Passport セッション（Supabase Auth移行時はJWT検証で `req.user` を再構成する前提）
- `req.user` フィールド（セッション時）: `{ id, username, email, phoneNumber?, mfaEnabled?, mfaType?, hasCompletedSetup? }`
- 認証必須のエンドポイントは `401` を返す。権限不一致は `403`。
- 環境変数（主要）: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY/VITE_STRIPE_PUBLIC_KEY`, `SENDGRID_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `KINTONE_API_TOKEN`, `DATABASE_URL`
- 外部API: Stripe, Twilio, SendGrid (メール), Kintone, Zapier (交換リクエスト), Supabase移行後はAuth/DB/Functionsを置換予定

## 認証・登録・MFA・プロフィール
- `POST /api/login`  
  - body: `{ email, password }`  
  - success: `{ message, user:{id,username,email,phoneNumber} }`  
  - MFA必要時: `403 { message, mfaType }`（SMSならコード送信＆`users.mfaSecret`に一時保存）
- `POST /api/logout` → `{ message }`
- `GET /api/user` → `req.user` / `401`
- `POST /api/mark-setup-complete` → `{ message }` (sets `users.hasCompletedSetup=true`)
- パスワードリセット  
  - `POST /api/request-reset` body `{ email }` → メール送信（resetTokenをusersに保存）  
  - `POST /api/reset-password` body `{ token, password }` → パス更新/トークン無効化
- プロフィール更新 `PUT /api/user/profile`  
  - body `{ email, username, phoneNumber? }` 重複チェック後 `users` 更新

### 登録（メール認証）
- `POST /api/registration/request` body `{ email, username, password }`  
  - 登録レコード削除→scryptハッシュ→6桁コード生成→`registration_verifications`保存→メール送信  
  - 409/400: 既存ユーザー or バリデーション
- `POST /api/registration/verify` body `{ email, verificationCode }`  
  - 未認証・未期限切れレコード検証→txで `users` 作成(emailVerified=true)＋verificationをverified=true  
  - 自動ログイン試行し `{ message, autoLogin, user? }`
- `POST /api/registration/resend` body `{ email }` → 新コード発行・更新・再送

### MFA
- `GET /api/mfa/status` → `{ enabled, type, phoneNumber }`
- `POST /api/mfa/setup/totp` → 生成: `{ qrCode, secret, backupCodes }` (`users.mfaSecret`保存, enabled=false)
- `POST /api/mfa/verify/totp` body `{ code }` → `mfaEnabled=true`
- `POST /api/mfa/setup/sms` body `{ phoneNumber }` → 6桁送信, `mfaSecret`に一時コード, `backupCodes`生成
- `POST /api/mfa/verify/sms` body `{ code }` → 照合して `mfaEnabled=true, mfaSecret=null`
- `POST /api/mfa/verify/backup` body `{ code }` → 使用済み削除
- `POST /api/mfa/disable` → MFAフィールド全クリア

### メールアドレス変更（Stripe全Customer一括更新＋ロールバック）
- `POST /api/email-change/request` body `{ newEmail }`  
  - 重複チェック→現行メールでStripe顧客検索→customerIds保存→6桁コード発行→`email_verifications`保存→メール送信
- `POST /api/email-change/verify` body `{ verificationCode }`  
  - コード検証→txで `users.email` を newEmail に更新＆verificationをverified=true→Stripe全customerIdsのemailを一括更新→失敗時ロールバック（DBとStripe）
- `POST /api/email-change/resend` body `{ newEmail }`  
  - 再度Stripe顧客を現行メールで取得しIDリスト更新→コード再発行・再送

## Stripe
- 価格ID: `price_1NwwacAPdno01lSPWH92pzrl`(1台目), `price_1OCCkvAPdno01lSP44FyPiZ3`(2–4台目), `price_1OED1uAPdno01lSP3UESyV7C`(5台目以降)
- `GET /api/stripe/customer` → email一致のCustomers(list; expand subscriptions)と支払履歴(invoices+charge)を整形して返却
- `POST /api/stripe/customer/:id/subscription`  
  - body `{ items:[{ price, quantity }] }`  
  - email権限チェック→既存payment methods取得→`payment_behavior=default_incomplete`で作成→`{ subscriptionId, clientSecret, paymentMethods, defaultPaymentMethod }`
- `POST /api/stripe/subscription/:id/quantities`  
  - body `{ items:[{ subscription_item_id?, price?, quantity }] }`  
  - item_idあればupdate、priceのみならcreate、quantity=0はdelete→更新後subscription再取得
- `DELETE /api/stripe/subscription-item/:id` → 権限確認後削除
- `POST /api/stripe/subscription/:id/auto-renewal` → cancel_at_period_endをトグル
- `POST /api/stripe/subscription/:id/cancel` → 即時キャンセル
- `POST /api/stripe/customer/:id/metadata`  
  - body `{ metadata?, address?, shipping?, phone? }` JP固定  
  - email権限チェック後 update
- `POST /api/stripe/customer-setup-intent` → 最初の顧客IDで SetupIntent 作成 `{ clientSecret, publishableKey }`
- `POST /api/stripe/set-default-payment-method` body `{ paymentMethodId }` → 顧客+全サブスクの default_payment_method を更新
- `GET /api/stripe/prices` → 上記3価格をまとめて返却
- `GET /api/stripe/subscription-item/:id/price` → priceId逆引き
- 価格計算:  
  - `POST /api/calculate-pricing` body `{ quantity, promoCode? }` → 段階計算＋coupon割引  
  - `POST /api/validate-promo-code` body `{ promoCode }` → 有効性/期限/使用回数チェック

## Stores（補助メタ）
- `GET /api/stores` → userId紐づけでstores一覧
- `POST /api/stores` body `insertStoreSchema` → storesに保存（実体はStripe Customer、DBは補助）
- `GET /api/stores/:id` / `PUT /api/stores/:id` / `DELETE /api/stores/:id` → user権限チェックのうえCRUD

## Devices / Kintone / Zapier
- `GET /api/devices`  
  - App40全件→製造番号ごと最新ステータス→「返却」を除外→店舗ID(Stripe_CustomerID)でグループ化
- `GET /api/stores/:storeId/devices`  
  - App40でstoreIdの出荷中を抽出→製造番号リストをApp21で照会（貸出可否/代替機）→7日ロックチェック→返却済み除外
- `POST /api/devices/exchange-request`  
  - body `{ serialNumber, issues, notes, stripeCustomerId }`  
  - ロックチェック→Zapier webhook送信→成功でdeviceActionHistoryに記録し7日ロック
- `POST /api/devices/return`  
  - body `{ serialNumber, stripeSubscriptionId, reason, additionalInfo? }`  
  - サブスク取得→総台数-1→段階価格IDに再配分→subscription.metadataに返却情報を書き換え→各item数量更新（proration有効）
- 旧交換API: `POST /api/devices/:serialNumber/exchange` → Zapier簡易送信（モック）
- 修理申請: `POST /api/devices/repair-request` body `{ serialNumber, issues[], additionalInfo?, deviceType? }` → recordDeviceActionでログ（DBは現状未保存）  
- 修理履歴: `GET /api/devices/:serialNumber/repair-history` → App22から取得  
- 作業記録: `GET /api/app22/:recordNumber/work-records` / `/api/repair-history/:repairTicketNumber/work-records` → App23から取得  
- テスト用: `GET /api/test/repair-history/:serialNumber` （認証なし）
- 操作ロック: deviceActionHistoryでreturn/exchange後7日間ロック。repair_requestはログのみ。

## ユーザー削除
- `GET /api/user/can-delete` → emailでStripe顧客があれば `{ canDelete:false, reason }`
- `DELETE /api/user` body `{ password }`  
  - パスワード検証→Stripe顧客が残っていないことを確認→users削除→logout

