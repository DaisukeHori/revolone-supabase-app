# DB移行・棚卸し手順（Supabase Postgres）

## 方針
- Drizzleドライバを `postgres-js` または `node-postgres` に変更。`neon-serverless`依存とWSは外す。
- 起動時の `npx drizzle-kit push` を廃止し、CI/CDでマイグレーション実行。
- 使っていないテーブル/カラムは移行前に棚卸しして削除、あるいは移行しない。

## 手順案
1. 接続設定変更  
   - `db/index.ts` をSupabase接続文字列で `postgres-js`/`node-postgres` に差し替え。  
   - `drizzle.config.ts` の `DATABASE_URL` をSupabaseに合わせる。
2. マイグレーション運用  
   - CIで `drizzle-kit push` or `drizzle-kit migrate` を実行（本番前に手動確認）。  
   - Supabase DBはBranchを使う場合は `supabase db push` も選択肢。
3. 棚卸し（削除候補）  
   - `emailVerificationToken/emailVerificationExpiry`（users）: 現行未使用。  
   - `device_exchange_requests` 実DB書込が止まっているなら削除可。  
   - `devices` テーブル: Kintone/Stripe主導であれば最低限のみ残すか削除を検討。  
   - 旧認証系カラム（if any）: Supabase Auth移行後に整理。
4. 追加するカラム  
   - `users.supabase_uid` (text, unique) : Supabase AuthユーザーID突合用。
5. データ移行  
   - 既存 `users.email/username` をそのまま移行。  
   - パスワードはSupabase Authに直接入れない方針なら、移行後に全員リセット運用。  
   - `stores/devices/...` は必要分のみインポート。不要ならスキップ。
6. 確認  
   - `drizzle-kit introspect` でスキーマ差分確認。  
   - 本番前に読み取り/書き込みの簡易テスト（Auth付きで）。


