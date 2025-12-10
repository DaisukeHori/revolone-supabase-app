# Webhook / 外部連携メモ

## Zapier（デバイス交換）
- エンドポイント: `https://hooks.zapier.com/hooks/catch/17071556/u3orkoq/`
- 呼び出し: `/api/devices/exchange-request` と 旧 `/api/devices/:serialNumber/exchange`
- ペイロード: `{ serialNumber, action: "exchange", issues?, notes?, requestId?, timestamp, requestedBy }`
- 失敗時: HTTPステータスを確認し500返却。成功後は deviceActionHistory に記録し7日ロック。

## Stripe Webhook（現状未実装）
- 必要に応じてSupabase Functionsで受信を検討（イベント: invoice.payment_succeeded, customer.updated等）。  
- 署名検証: `STRIPE_WEBHOOK_SECRET` を使い`Stripe.Webhook.constructEvent`で検証。  
- 受信時の副作用は要設計（今はプル型で取得）。

## Twilio (SMS)
- 利用箇所: MFA（セットアップ/ログイン時SMSコード送信）。  
- 送信のみ。Webhook受信はなし。

## SendGrid (メール)
- 利用箇所: 登録認証・パスリセット・メール変更認証。  
- 送信のみ。Webhook受信はなし。

## Supabase Auth イベント連携（移行後）
- 方針: メール変更は直接許可せず、アプリAPI経由に限定。  
- もしSupabase側でメール変更が行われる運用にする場合:  
  - Auth hookまたはEdge Functionでメール変更イベントを受け、既存 `/api/email-change/*` 相当の処理（Stripe全顧客メール更新＋ロールバック）を呼ぶ必要がある。


