# Revol One Management System

## 概要

Revol One Management Systemは、Revol Oneサブスクリプションの包括的な管理を行うフルスタックWebアプリケーションです。デバイスの追跡、サブスクリプション管理、修理履歴の追跡、店舗管理などの機能を提供します。

## 主な機能

### 🔐 認証システム
- **ローカル認証**: ユーザー名・パスワードによる認証
- **多要素認証（MFA）**: SMS認証とTOTP認証の両方をサポート
- **メール認証**: 新規登録とメールアドレス変更時の認証
- **パスワードリセット**: メール経由でのパスワード再設定
- **マスターパスワード**: 管理者による任意のユーザーアカウントへのアクセス

### 📱 デバイス管理
- **Kintone API連携**: 複数のKintoneアプリとの統合
  - App 40: デバイス基本情報
  - App 21: サブスクリプション貸出可否情報
  - App 22: 修理履歴
  - App 23: 作業記録
- **デバイス状態追跡**: 出荷・返却・修理中などの状態管理
- **リアルタイム同期**: Kintone APIとの自動同期

### 💳 サブスクリプション管理
- **Stripe統合**: 包括的な決済処理
- **複数支払い方法**: クレジットカード、Apple Pay、Google Pay、PayPal、銀行振込
- **量に基づく課金**: デバイス台数に応じた自動課金
- **35日間無料トライアル**: 全ての新規サブスクリプションに適用
- **請求履歴**: 詳細な支払い履歴の表示

### 🏪 店舗管理
- **マルチ店舗対応**: 1ユーザーあたり複数店舗の管理
- **店舗別デバイス管理**: 各店舗へのデバイス割り当て
- **法的文書承認**: 利用規約・プライバシーポリシーの確認プロセス

### 🔧 修理管理
- **修理履歴追跡**: 詳細な修理記録の表示
- **修理依頼**: 購入済みデバイスの修理申請
- **重複防止**: 修理中のデバイスに対する新規申請の防止
- **タイムライン表示**: 修理プロセスの時系列表示

## 技術スタック

### フロントエンド
- **React 18**: メインフレームワーク
- **TypeScript**: 型安全性の確保
- **Tailwind CSS**: スタイリング
- **Radix UI**: UIコンポーネント
- **TanStack Query**: サーバー状態管理
- **React Hook Form**: フォーム管理
- **Wouter**: クライアントサイドルーティング
- **Framer Motion**: アニメーション

### バックエンド
- **Node.js**: サーバーランタイム
- **Express.js**: Webフレームワーク
- **TypeScript**: 型安全性
- **Passport.js**: 認証ミドルウェア
- **Drizzle ORM**: データベースORM
- **PostgreSQL**: メインデータベース

### 外部サービス
- **Stripe**: 決済処理
- **SendGrid**: メール配信
- **Twilio**: SMS配信
- **Kintone**: デバイス情報管理API

## インストールと設定

### 必要な環境
- Node.js 18以上
- PostgreSQL 14以上（Replitでは自動提供）
- npm または yarn

### 1. リポジトリのクローン
```bash
git clone <repository-url>
cd revonizer-management-system
```

### 2. 依存関係のインストール
```bash
npm install
```

### 3. 環境変数の設定
`.env`ファイルを作成し、以下の環境変数を設定してください：

```env
# データベース設定（Replitでは自動設定）
DATABASE_URL=postgresql://username:password@localhost:5432/revonizer

# Stripe設定
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLIC_KEY=pk_test_...

# SendGrid設定
SENDGRID_API_KEY=SG.xxx...

# Twilio設定
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890

# Kintone設定
KINTONE_API_TOKEN_ALL=...
KINTONE_SUBDOMAIN=e18p5

# マスターパスワード設定
MASTER_PASSWORD=Rv0171Rv
```

### 4. 開発サーバーの起動
```bash
npm run dev
```

**重要:** 
- データベースのスキーマは起動時に自動的に作成されます
- 手動でのマイグレーションは不要です
- 既存のデータは保護されます（冪等性保証）
- Replitでの再ビルド時も安全に動作します

アプリケーションは `http://localhost:5000` でアクセスできます。

## 使用方法

### 新規ユーザー登録

#### ステップ1: 基本情報の入力
1. ログインページで「アカウントをお持ちでない方はこちら」をクリック
2. 新規登録フォームに以下を入力：
   - メールアドレス
   - ユーザー名（3文字以上）
   - パスワード（8文字以上）
3. 「認証メールを送信」ボタンをクリック

#### ステップ2: メール認証
1. 入力したメールアドレスに認証メールが送信されます
2. メール内の6桁の認証コードを確認
3. 認証コード入力画面で6桁のコードを入力
4. 「認証して登録完了」ボタンをクリック

**認証コードの詳細：**
- 有効期限: 30分
- 再送信: 何度でも可能
- 形式: 数字6桁（例: 123456）

#### ステップ3: 登録完了
1. 認証成功後、登録完了画面が表示されます
2. 「ログインページへ」をクリックしてログイン

### ログイン

#### 通常ログイン
1. メールアドレスとパスワードを入力
2. 「ログイン」ボタンをクリック

#### MFA認証（設定済みの場合）
1. 通常ログイン後、MFA認証画面が表示
2. SMS認証またはTOTP認証を選択
3. 受信したコードまたはアプリのコードを入力
4. 「認証」ボタンをクリック

### 店舗の追加

#### ステップ1: 店舗情報の入力
1. ダッシュボードで「店舗を追加」をクリック
2. 店舗情報を入力：
   - 店舗名
   - 住所
   - 電話番号
   - 担当者名
3. 「次へ」ボタンをクリック

#### ステップ2: 法的文書の確認
1. 利用規約とプライバシーポリシーを確認
2. 各文書を最下部までスクロール
3. 「同意する」チェックボックスをチェック
4. 「次へ」ボタンをクリック

#### ステップ3: 支払い方法の設定
1. 支払い方法を選択：
   - クレジットカード
   - Apple Pay
   - Google Pay
   - PayPal
   - 銀行振込
2. 必要な情報を入力
3. 「サブスクリプション開始」ボタンをクリック

**サブスクリプション詳細：**
- 無料トライアル期間: 35日間
- 基本料金: 月額6,000円（税込み6,600円）
- 追加デバイス: 1台あたり月額1,500円（税込み1,650円）
- 課金タイミング: 月次自動課金

### デバイス管理

#### デバイス一覧の確認
1. ダッシュボードで「デバイス」タブをクリック
2. デバイス一覧が表示されます
3. 各デバイスの状態を確認：
   - 🟢 出荷済み
   - 🔴 返却済み
   - 🟡 修理中
   - ⚪ 販売済み

#### デバイス詳細の確認
1. デバイス一覧で目的のデバイスをクリック
2. デバイス詳細モーダルが表示
3. 以下の情報を確認：
   - 基本情報（製造番号、機種など）
   - サブスクリプション貸出可否
   - 修理履歴（販売済みデバイスのみ）

### 修理管理

#### 修理履歴の確認
1. 販売済みデバイスの詳細を開く
2. 「修理履歴」タブをクリック
3. 修理記録のタイムラインが表示されます

#### 修理依頼の提出
1. 販売済みデバイスの詳細を開く
2. 「修理依頼」タブをクリック
3. 修理依頼フォームに入力：
   - 故障症状
   - 修理希望内容
   - 連絡先情報
4. 「修理依頼を提出」ボタンをクリック

**修理依頼の制限：**
- 修理中のデバイスは新規依頼不可
- 進行中の修理がある場合は「修理進行中」と表示

### アカウント管理

#### メールアドレス変更
1. プロフィールページで「メールアドレスを変更」をクリック
2. 新しいメールアドレスを入力
3. 「認証メールを送信」をクリック
4. 新しいメールアドレスに送信された6桁コードを入力
5. 「メールアドレスを変更」をクリック

**メール変更の詳細：**
- 認証コード有効期限: 30分
- Stripeの顧客情報も自動更新
- 失敗時の自動ロールバック機能

#### パスワード変更
1. プロフィールページで「パスワードを変更」をクリック
2. 現在のパスワードを入力
3. 新しいパスワードを入力（8文字以上）
4. 「パスワードを変更」をクリック

#### MFA設定
1. プロフィールページで「MFA設定」をクリック
2. SMS認証またはTOTP認証を選択
3. 設定手順に従って認証を完了

### 管理者機能

#### マスターパスワードアクセス
1. 管理者アカウントでログイン
2. 「管理者」メニューをクリック
3. 現在のマスターパスワードを確認
4. 必要に応じて新しいマスターパスワードを設定

**マスターパスワードの詳細：**
- 現在のマスターパスワード: `Rv0171Rv`
- 管理者メールアドレス: `hori@revol.co.jp`
- 任意のユーザーアカウントへアクセス可能

## API仕様

### 認証エンドポイント

#### 新規登録
```
POST /api/registration/request
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "password123"
}
```

#### 認証コード確認
```
POST /api/registration/verify
Content-Type: application/json

{
  "email": "user@example.com",
  "verificationCode": "123456"
}
```

#### 認証コード再送信
```
POST /api/registration/resend
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### デバイス管理エンドポイント

#### デバイス一覧取得
```
GET /api/devices
Authorization: Required (Session-based)
```

#### デバイス詳細取得
```
GET /api/devices/:serialNumber
Authorization: Required (Session-based)
```

### サブスクリプション管理エンドポイント

#### サブスクリプション作成
```
POST /api/get-or-create-subscription
Authorization: Required (Session-based)
```

#### 支払い方法設定
```
POST /api/create-setup-intent
Authorization: Required (Session-based)
```

## データベーススキーマ

**注意:** すべてのテーブルスキーマは起動時に自動的に作成されます。手動でのSQL実行は不要です。

### users テーブル
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255),
  email_verification_expiry TIMESTAMP,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret VARCHAR(255),
  phone_number VARCHAR(20),
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### stores テーブル
```sql
CREATE TABLE stores (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  manager_name VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### registration_verifications テーブル
```sql
CREATE TABLE registration_verifications (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  verification_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### email_change_verifications テーブル
```sql
CREATE TABLE email_change_verifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  new_email VARCHAR(255) NOT NULL,
  verification_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 設定詳細

### 認証コード設定
- **桁数**: 6桁の数字
- **有効期限**: 30分
- **再送信制限**: なし（スパム防止は将来実装予定）
- **文字セット**: 数字のみ（0-9）

### セッション設定
- **セッション有効期限**: 30日
- **セッションストア**: PostgreSQL（本番環境）/ メモリ（開発環境）
- **セッションシークレット**: 環境変数で設定

### Stripe設定
- **サポート通貨**: 日本円（JPY）
- **支払い方法**: カード、Apple Pay、Google Pay、PayPal、銀行振込
- **Webhook**: 自動サブスクリプション更新
- **プライスID**: 環境変数で設定

### Kintone API設定
- **App 40**: デバイス基本情報
  - 製造番号フィールド: `レボナイザー製造番号`
  - 状態フィールド: `Status`
- **App 21**: サブスクリプション可否
  - 製造番号フィールド: `文字列__1行__1`
  - 可否フィールド: `サブスク貸出の可不可`
- **App 22**: 修理履歴
  - 製造番号フィールド: `製造番号`
  - 修理状態フィールド: `修理ステータス`
- **App 23**: 作業記録
  - 関連フィールド: `ルックアップ`
  - 作業項目フィールド: `ドロップダウン`

### メール設定
- **送信者**: `noreply@revol.co.jp`
- **テンプレート**: HTML形式
- **配信サービス**: SendGrid

### SMS設定
- **送信番号**: 環境変数で設定
- **配信サービス**: Twilio
- **文字数制限**: 160文字

## セキュリティ

### パスワード要件
- 最小長: 8文字
- 推奨: 大文字、小文字、数字、特殊文字の組み合わせ
- ハッシュ化: bcrypt（saltラウンド: 10）

### MFA設定
- **SMS認証**: 6桁の数字コード
- **TOTP認証**: 30秒間隔、6桁コード
- **バックアップコード**: 将来実装予定

### セッションセキュリティ
- **CSRF保護**: 有効
- **セッションハイジャック対策**: セッションローテーション
- **HTTPSリダイレクト**: 本番環境で有効

## トラブルシューティング

### よくある問題

#### 1. メール認証コードが届かない
- **原因**: SendGrid API keyの設定不備
- **解決方法**: 
  1. SendGrid API keyを確認
  2. 送信者メールアドレスの認証状態を確認
  3. スパムフォルダを確認

#### 2. Stripe決済エラー
- **原因**: Stripe API keyの設定不備
- **解決方法**:
  1. Stripe API keyを確認
  2. Stripeダッシュボードでwebhook設定を確認
  3. テストモードと本番モードの切り替えを確認

#### 3. Kintoneデータが取得できない
- **原因**: API tokenの権限不足
- **解決方法**:
  1. Kintone API tokenの権限を確認
  2. 対象アプリへのアクセス権限を確認
  3. API token有効期限を確認

#### 4. データベース接続エラー
- **原因**: DATABASE_URLの設定不備
- **解決方法**:
  1. PostgreSQLサーバーの起動状態を確認
  2. データベース接続文字列を確認
  3. ファイアウォール設定を確認
  
**注意**: データベーススキーマは自動作成されるため、手動でのテーブル作成は不要です。

### ログの確認方法

#### アプリケーションログ
```bash
# 開発環境
npm run dev

# 本番環境
pm2 logs revonizer-app
```

#### データベースログ
```bash
# PostgreSQL ログ
tail -f /var/log/postgresql/postgresql-14-main.log
```

#### Stripe Webhook ログ
1. Stripeダッシュボードにアクセス
2. Developers > Webhooks を選択
3. 対象のWebhookを選択
4. 「Recent deliveries」タブでログを確認

## 開発・デプロイ

### 開発環境の構築
```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動（データベースも自動初期化）
npm run dev

# TypeScript型チェック
npm run type-check
```

### ビルドとデプロイ
```bash
# プロダクションビルド
npm run build

# 本番サーバー起動
npm start
```

### 環境変数の管理
- **開発環境**: `.env.local`
- **本番環境**: 環境変数またはシークレット管理サービス
- **テスト環境**: `.env.test`

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## サポート

技術的な問題やバグ報告は、以下の連絡先までお問い合わせください：

- **メール**: support@revol.co.jp
- **開発者**: hori@revol.co.jp

## 更新履歴

### v1.0.0 (2025-01-18)
- 初回リリース
- 基本的な認証機能
- デバイス管理機能
- サブスクリプション管理機能

### v1.1.0 (2025-01-18)
- 6桁認証コードシステムの統一
- 新規登録フローの改善
- メール認証システムの強化
- 認証コード再送信機能の追加

### v1.2.0 (2025-01-18)
- 自動データベース初期化システムの実装
- Replitでの再ビルド時の安全性保証
- 冪等性のあるスキーマ作成
- エラーハンドリングの強化

詳細な変更履歴については、`replit.md`のChangelogセクションをご確認ください。