# RevolOne 管理システム ロジック要件（現行コード完全版）

## 基本設計思想
- 外部API主導: Stripe / Kintone / Twilio / SendGrid を事実上のデータソースとして都度取得。DBは補助（ユーザー情報・メタ・一時状態）に限定。
- 束ねキー: メールアドレスを唯一のキーとし、同一メールのStripe Customer（=店舗）を同一管理者に束ねる。退会可否・メール変更・顧客操作はすべてメール検索基準。
- Supabase Auth移行後も、メール＝Stripe束ねキーの前提を維持。メール変更は必ずアプリのフロー経由でStripe全顧客を一括更新し、失敗時はロールバック。

## 認証／ユーザー
- 認証: Passport Local + express-session（メモリストア）。マスターパスワード許可。`/api/login`でメール/パスワード、MFA有効時は403で二段階へ。
- MFA: `/api/mfa/*`
  - TOTP: secret生成＋QR発行→検証で有効化。
  - SMS: Twilioで6桁コード送信→検証で有効化。コードは`users.mfaSecret`に一時保持。
  - Backupコード: 10個生成、成功したコードは削除。
  - 無効化: mfaEnabled/type/secret/backupCodesをクリア。
- パスワードリセット: `/api/request-reset`でresetToken発行とメール送信、`/api/reset-password`で検証・ハッシュ更新。
- プロフィール更新: `/api/user/profile` email/username/phone重複チェック後に更新。
- 退会判定: `/api/user/can-delete`でメール検索しStripe顧客が残っていれば不可。`DELETE /api/user`はパスワード照合後、Stripe顧客がない場合のみ削除。
- 初回セットアップフラグ: `/api/mark-setup-complete` が hasCompletedSetup を true に。

## 登録（メール認証式）
- `/api/registration/request`: email/username/passwordを受け、既存ユーザー重複チェック→旧認証レコード削除→パスワードscryptハッシュ→6桁コード発行→registration_verificationsに保存→メール送信。
- `/api/registration/verify`: コード一致・未期限切れを確認しトランザクションで users に確定登録（emailVerified=true）、verificationをverified=trueに。完了後自動ログイン試行。
- `/api/registration/resend`: 未認証レコードに対し新コード発行・更新・再送。

## メールアドレス変更（Stripe一括更新＋ロールバック）
- `/api/email-change/request`:
  - newEmailバリデーション・重複チェック。
  - 現行メールでStripe顧客を全検索しIDリストを保存（email_verificationsにhasStripeCustomers/count/ids）。
  - 6桁コード発行・メール送信。
- `/api/email-change/verify`:
  - コード検証後トランザクションで users.email を newEmail に更新し verification を verified に。
  - 直後に保存した customerIds 全てのメールを newEmail に更新。部分失敗時は成功分をロールバックしDBを元に戻す。
- `/api/email-change/resend`: 再度Stripe顧客を現行メールで取得し最新のIDリストに更新して再送。
- 重要: メール変更は必ず本フロー経由（Supabase Auth移行後もWebhook等でこの処理を呼び、Auth/DB/Stripeのメールを一致させる）。

## Stripe 連携（料金・台数ロジック含む）
- 価格ID（Revonizer台数段階課金）:
  - 1台目: `price_1NwwacAPdno01lSPWH92pzrl`
  - 2〜4台目: `price_1OCCkvAPdno01lSP44FyPiZ3`
  - 5台目以降: `price_1OED1uAPdno01lSP3UESyV7C`
- 顧客取得: `getCustomersByEmail(email)` で email 一致のCustomerをlist→各Customerに対し Subscriptions(list, default_payment_method展開) / Invoices(list, charge展開) を取得し整形。
- サブスク作成: `POST /api/stripe/customer/:id/subscription`
  - emailで権限確認。既存payment methods取得→顧客のdefault_payment_method取得→`payment_behavior=default_incomplete` で作成（expand latest_invoice.payment_intent）。clientSecretと支払い方法を返す。
- サブスク数量更新: `POST /api/stripe/subscription/:id/quantities`
  - items配列を受け、subscription_item_idがあればupdate、price指定で新規create、quantity 0でdelete。更新後にsubscriptionを再取得して返す。
- サブスクアイテム削除: `DELETE /api/stripe/subscription-item/:id`（emailで権限確認）。
- 自動更新ON/OFF: `POST /api/stripe/subscription/:id/auto-renewal`（cancel_at_period_endをトグル）。
- 即時キャンセル: `POST /api/stripe/subscription/:id/cancel`。
- 顧客メタ/住所/配送先/電話更新: `POST /api/stripe/customer/:id/metadata`（emailで権限確認、country固定JP）。
- SetupIntent（既存顧客の支払方法追加）: `POST /api/stripe/customer-setup-intent`（最初の顧客IDで作成）。
- デフォルト支払方法変更: `POST /api/stripe/set-default-payment-method` → 顧客と全サブスクのdefault_payment_methodを更新。
- 価格取得: `GET /api/stripe/prices` で上記3価格をまとめて返却。
- 価格ID逆引き: `GET /api/stripe/subscription-item/:id/price`。
- 価格計算API（routes.ts内）:
  - `/api/calculate-pricing`: quantity 1–20 を受け、上記3価格で段階計算。promoCodeがあればStripe couponを検証し割引適用。
  - `/api/validate-promo-code`: couponの有効性・期限・上限をチェック。

## デバイス／Kintone連携
- デバイス一覧 `/api/devices`: Kintone App 40から全レコード取得→製造番号ごとに最新入出荷ステータスを抽出→「返却」は除外→店舗ID(Stripe_CustomerID)でグルーピング。
- 店舗別デバイス `/api/stores/:storeId/devices`:
  - App40でstoreIdのレコード取得→最新ステータス（出荷のみ）→製造番号リストをApp21で照会し「サブスク貸出可否/代替機」を付与→操作ロックチェック（deviceActionHistoryで7日ロック）→返却済みは除外。
- デバイス交換リクエスト `/api/devices/exchange-request`:
  - ロックチェック→Zapier webhook送信（payloadにserial/notes/issues等）→成功ならdeviceActionHistoryに記録し7日ロック。
- デバイス返却 `/api/devices/return`:
  - サブスクを取得し総台数を計算→1台減算後の台数を段階価格IDに再配分（1台目1, 2–4台目3, 5台目以降残り）。
  - subscription.metadataに「返却製造番号」「返却理由」「返却詳細」を再設定。
  - 各subscription itemのquantityを新配分に合わせて更新（proration有効）。
- 旧交換API `/api/devices/:serialNumber/exchange`: Zapierにexchangeリクエストを送る簡易版。
- 修理申請 `/api/devices/repair-request`: recordDeviceActionで修理申請を記録（現状DB保存は無し、ログと簡易レスポンス）。
- 修理履歴/作業記録:
  - `/api/devices/:serialNumber/repair-history` → App22から取得。
  - `/api/app22/:recordNumber/work-records` / `/api/repair-history/:repairTicketNumber/work-records` → App23から作業記録取得。
  - テスト用 `/api/test/repair-history/:serialNumber`（認証不要でデータ確認）。
- 操作ロック: deviceActionHistoryでreturn/exchange後7日ロック。repair_requestは現状ログのみ。

## 店舗（DB側の補助テーブル）
- `/api/stores` CRUD は stores テーブルで userId 紐づけとメタ保持のみ（実体はStripe Customer）。userId権限でアクセス制御。

## Supabase Auth 移行時の保持要件
- ログインはSupabase Authに一本化（JWT）。`req.user`はJWTから再構築し、メールをStripe検索キーとして保持。
- usersテーブルに supabase_uid（等）を追加し、メール整合を維持。メール変更は必ず既存フロー（Stripe一括更新＋ロールバック）経由に統一。
- 既存のビジネスロジック（台数計算・価格配分・メール束ね・Zapier・Kintone取得・Stripe更新）は改変せず移植。

## テーブル／カラム利用一覧（現行コードベース）

### users
- id: PK
- username: ログイン名/表示名。重複不可。プロフィール更新で変更可。
- email: Stripe束ねキー・ログインID。メール変更フローで更新。退会/顧客検索もこの値を使用。
- password: scryptでソルト付きハッシュ。パスワード変更/リセットで更新。
- emailVerified: 登録時のメール認証完了フラグ。未認証はログイン拒否。
- emailVerificationToken / emailVerificationExpiry: 旧式メール確認用（現行フローでは未使用・残置）。
- resetToken / resetTokenExpiry: パスワードリセット用トークンと有効期限。
- mfaEnabled / mfaType / mfaSecret / phoneNumber / backupCodes: MFA状態。TOTPはsecret/backupCodes、SMSはphoneNumber+mfaSecret(一時コード)。無効化でnull化。
- hasCompletedSetup: 初回セットアップ完了フラグ（/api/mark-setup-complete）。
- createdAt / updatedAt: 監査。
- （未追加だが移行で想定）supabase_uid: Supabase AuthのユーザーID突合用。追加予定。

### registration_verifications
- id: PK
- email / username / hashedPassword: 仮登録情報。hashedPasswordは本登録へコピー。
- verificationCode: 6桁コード。
- expiresAt: 30分有効期限。
- verified: 検証済みフラグ（trueになると本登録済み）。
- createdAt: 監査。
利用箇所: /api/registration/request /verify /resend。

### email_verifications
- id: PK
- userId: users.id FK
- newEmail: 変更後メール
- verificationCode: 6桁コード
- expiresAt: 30分有効期限
- verified: 検証済みフラグ
- hasStripeCustomers / stripeCustomerCount / stripeCustomerIds(jsonb): 現行メールに紐づくStripe顧客の存在とIDリスト（メール変更時の一括更新・ロールバックに使用）
- createdAt: 監査
利用箇所: /api/email-change/request /verify /resend。

### stores
- id: PK
- userId: users.id FK（所有者）
- name / address / phoneNumber: 店舗表示用メタ
- stripeCustomerId: 紐づけ用（オプション）。主実体はStripe Customer。
- metadata(jsonb): 補助情報
- createdAt / updatedAt
利用箇所: /api/stores CRUD（権限はuserId）。主データはStripe Customerなので補助テーブル。

### devices
- id: PK
- storeId: stores.id FK
- serialNumber: 製造番号（unique）
- stripeSubscriptionId: 紐づけ用
- status / statusUpdatedAt: 出荷/返却のステータスと時刻
- kintoneRecordId: Kintoneレコードとの対応
- metadata(jsonb)
- createdAt / updatedAt
利用箇所: 現行コードでは主にKintone/Stripeライブデータを使用。DBへの書き込みは少なく、将来的に不要なら棚卸し候補。

### device_exchange_requests
- id: PK
- serialNumber / userId FK(users.id)
- issues(jsonb string[]) / notes: 申請内容
- status: pending/approved/rejected
- zapierRequestId: Zapier連携結果
- requestDate / createdAt / updatedAt
利用箇所: 交換リクエストは現在コメントアウト（モック）。実DB書込は停止中、棚卸し候補。

### device_action_history
- id: PK
- serialNumber
- stripeCustomerId: 顧客番号（メールと独立のStripe Customer ID）
- actionType: return | exchange（repair_requestはログのみ）
- actionDate: デフォルト現在時刻
- lockUntil: 7日後のロック期限
- userId FK(users.id)
- metadata(jsonb)
利用箇所: 操作ロック判定（return/exchange後7日間制限）。repair_requestではDB書込は現状なし。

### registration / email / MFA 付随カラムの利用まとめ
- resetToken/resetTokenExpiry: パスワードリセット
- mfaSecret: TOTP秘密鍵 または SMS一時コード
- backupCodes: バックアップコード配列
- phoneNumber: SMS送信用
- emailVerified: ログイン時のメール認証済みチェック
- hasCompletedSetup: ホーム初回セットアップ完了フラグ

### Supabase移行時に未使用となり得るカラム
- emailVerificationToken / emailVerificationExpiry（旧メール確認用）: 現行フロー未使用。移行時に削除候補。
- registration_verifications / email_verifications はフローをSupabase Auth側に寄せる場合は縮小・置換を検討。ただしStripeメール一括更新のロジックは要維持。

### メタデータ（Stripe側）と突合
- サブスクリプションmetadata: 返却処理で「返却製造番号」「返却理由」「返却詳細」を書き込む。DBには保持せずStripeに保管。
- 顧客metadata/address/shipping/phone: `/api/stripe/customer/:id/metadata`で更新（countryはJP固定）。

