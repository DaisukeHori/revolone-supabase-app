# Supabase Auth 移行メモ（現行コード差分ベース）

## 目的
- Passport + セッションを廃止し、Supabase Auth (JWT) を唯一のログイン手段にする。
- メール＝Stripe束ねキーの運用を維持し、メール変更フロー（Stripe全Customer一括更新＋ロールバック）を崩さない。
- ロジック（価格/台数計算、外部API連携）は極力変更しない。

## 必要な実装タスク
1. ユーザーIDマッピング
   - `users` テーブルに `supabase_uid` (text) 追加。PKは現行idのまま。
   - Supabase AuthのJWTに含まれる `sub`（ユーザーID）とメールを突合して `supabase_uid` を保存。
2. JWT検証ミドルウェア
   - SupabaseのJWKSまたは`supabase-js`サーバ側検証でJWTを検証。
   - 検証後の `req.user` を `{ id, username, email, ... }` に再構成（idはusers.id、username/emailはDBから取得）。認可はメール/ユーザーIDで行う。
3. ルートの認証差し替え
   - `req.isAuthenticated()` 依存を全て JWT検証結果に置換。
   - `/api/login/logout/user` 等、PassportルートはSupabase Auth前提に作り直すかクライアント直呼びに変更。`/api/user` はJWT検証後のDB lookupで返す。
4. フロントエンド
   - `@supabase/supabase-js` を導入。`use-user`フックをsupabaseのセッション取得に差し替え。
   - API呼び出しはBearerトークン付与（`credentials: include`撤廃）。
5. メール変更フローの統一
   - Supabase側のメール更新を直接させず、必ずアプリの `/api/email-change/*` フローを通過させる（Stripe全顧客更新＋ロールバック）。  
     もしくは Supabase のメール更新イベント（Webhook/Edge Function）からこのフローを呼び、DB/Stripeと整合させる。
6. パスワード・リセット
   - Supabase Authに寄せる場合、現行の resetToken/メール送信は停止し、Supabaseのパスワードリセットメールを使う。  
     現行DBの `password` はログインに使わなくなるが、移行期間は読み取り専用か廃止検討。
7. セッション／クッキー除去
   - express-session と MemoryStore を撤去。CORSはAuthorizationヘッダ前提に設定。
8. DB接続とマイグレーション運用
   - Drizzleドライバを `postgres-js` または `node-postgres` に変更し、`DATABASE_URL` をSupabase接続文字列に。  
   - 起動時 `drizzle-kit push` を廃止し、CIでマイグレーション実行。

## 影響を受けるエンドポイント（要修正）
- 認証前提: `/api/login`, `/api/logout`, `/api/user`, `/api/mark-setup-complete`, `/api/request-reset`, `/api/reset-password`, `/api/user/profile`, `/api/user/can-delete`, `/api/user` DELETE
- Stripe系: 全 `/api/stripe/*` ルート（`req.user` のメールをJWTから再構成する）
- Store/Device/Kintone系: 全 `/api/stores*`, `/api/devices*`, `/api/app22*`, `/api/app23*` で `req.user` 参照をJWTに置換
- MFA系: `/api/mfa/*`（DBのMFAカラムは継続利用）
- 登録/メール変更: `/api/registration/*`, `/api/email-change/*` （メール＝Stripe束ねキー維持）

## データ移行ポリシー（ユーザー）
- 既存ユーザーのパスワードはSupabase Authに直接移せないため、以下いずれかを選択:
  - 全ユーザーにパスワードリセット（Supabaseのリセットメールを送る）
  - 管理者がメール＋パスワードを再発行し通知（少人数向け）
- 既存メールは信頼ソースとし、Supabase Authユーザー作成時は同一メールで登録する。  
  その後メール変更は必ず `/api/email-change/*` を通す。

## メール整合性（最重要）
- メールは「Stripe束ねキー」なので、Auth/DB/Stripeのメールがずれると破綻。  
- 運用ルール: メール変更は `/api/email-change/*` のみ許可し、Supabase Authのメール変更を直接許可しない（またはWebhookで同期）。

## 残しておくべきロジック
- 価格・台数配分（3 price ID）、サブスク数量更新、返却時の再配分、Zapier交換、Kintone取得、Stripeメタデータ更新、メール一括更新ロールバックなど、ビジネスロジックは改変せず移植。

