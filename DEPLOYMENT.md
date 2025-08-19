# デプロイメント手順とデータベース互換性

## GitHubからのデプロイメント互換性

このプロジェクトは、GitHubからプルして他の環境でデプロイしても完全に互換性が保たれるように設計されています。

### ✅ 互換性が保証されている理由

#### 1. 自動データベース初期化システム
- `server/database-init.ts`により、データベースが自動的に正しい状態に初期化されます
- 既存のデータを破壊せず、冪等性を保証します
- 新しい環境では自動的にスキーマが作成されます

#### 2. Drizzle ORMの利用
- `drizzle.config.ts`によりスキーマが定義されています
- `npm run db:push`により、現在のスキーマに自動同期されます
- マイグレーションファイル（`migrations/`）により、段階的なスキーマ変更が記録されています

#### 3. 環境変数による設定
- 必須の環境変数がすべて検証されます（起動時チェック）
- Cloud Run対応のポート設定（0.0.0.0:PORT）
- 開発/本番環境の自動切り替え

#### 4. 包括的な依存関係管理
- `package.json`により、すべての依存関係が固定されています
- TypeScript型定義がすべて含まれています

### 🚀 デプロイメント手順

#### ローカル開発環境
```bash
git clone [your-repo-url]
cd [project-directory]
npm install
# 環境変数を設定（.env ファイル）
npm run dev
```

#### 本番環境（Cloud Run等）
```bash
npm run build
npm start
```

### 📋 必須環境変数

デプロイ時に以下の環境変数を設定してください：

```env
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
KINTONE_API_TOKEN_ALL=...
SENDGRID_REVOLONE_API_KEY=SG...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
```

### 🔍 データベーススキーマ

現在のデータベースには以下のテーブルが含まれています：

1. **users** - ユーザー情報（MFA設定含む）
2. **registration_verifications** - 新規登録認証
3. **stores** - 店舗情報
4. **devices** - デバイス管理
5. **device_exchange_requests** - デバイス交換リクエスト
6. **device_action_history** - デバイス操作履歴

### ✅ 起動時チェック

アプリケーション起動時に以下が自動実行されます：

1. **データベース接続確認**
2. **スキーマ自動作成/更新**
3. **環境変数検証**
4. **デプロイメント環境チェック**

### ⚠️ 注意事項

- 本番環境では`NODE_ENV=production`を設定してください
- Stripe webhook設定は環境ごとに調整が必要です
- SendGridの送信ドメイン設定を確認してください

### 🔧 トラブルシューティング

データベース接続エラーが発生した場合：
1. `DATABASE_URL`が正しく設定されているか確認
2. PostgreSQL サーバーがアクセス可能か確認
3. ログで詳細なエラー情報を確認

環境変数エラーの場合：
1. 起動ログの「デプロイメント環境チェック」セクションを確認
2. 不足している環境変数を追加設定