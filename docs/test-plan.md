# 移行後テスト計画（Supabase Auth + Functions想定）

## 認証/ユーザー
- サインアップ→メール認証（Supabase側）→`/api/user` が取得できる
- ログイン（アクセストークン付与）→Protected APIが401/200を正しく返す
- MFA: TOTPセットアップ/検証/無効化、SMSセットアップ/検証、バックアップコード使用
- パスワードリセット: リクエスト→メール→リセット成功
- メール変更: `/api/email-change/request/verify/resend` → Stripe顧客全件のメールが更新される、失敗時ロールバック
- 退会: Stripe顧客なしで削除可、顧客ありで不可

## Stripe
- 顧客取得: `/api/stripe/customer` がCustomer/Subscription/Invoicesを返す
- サブスク作成: `/api/stripe/customer/:id/subscription` 正常作成、clientSecret取得
- 数量更新: `/api/stripe/subscription/:id/quantities` 段階価格配分が期待通り
- 価格計算: `/api/calculate-pricing` 数量1〜20、割引コード有効/無効
- デフォルトPM変更: `/api/stripe/set-default-payment-method` → 全サブスクに反映
- 自動更新トグル / 即時キャンセル 正常動作
- 返却処理: `/api/devices/return` で数量再配分とmetadata更新が正しい

## デバイス/Kintone/Zapier
- 店舗別デバイス取得: 出荷中のみ、貸出可否/代替機フラグ付与、ロック状態確認
- 交換リクエスト: Zapier Webhook送信成功、7日ロック登録
- 修理申請: ログ登録成功
- Kintone修理履歴/作業記録取得: App22/App23へのアクセスとデータ整形

## ストア
- `/api/stores` CRUD: user権限チェック、保存・更新・削除

## 環境変数/設定
- ENV未設定時のエラー確認（Stripe/Twilio/Kintone/Supabaseキー）
- CORS/Authorizationヘッダで401/200が適切に分岐

## 回帰・エッジ
- 無効トークン/期限切れトークンで401
- Stripe API失敗時のロールバック（メール変更、数量更新等）で一貫性が保たれる
- 高負荷時（並行リクエスト）でもロック/権限制御が崩れない

