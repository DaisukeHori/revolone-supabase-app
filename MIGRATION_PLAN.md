# SendGrid → Amazon SES 移行計画

## 技術的検証結果
✅ **移行可能** - システム破損リスク: 低

## 移行手順

### Phase 1: 準備（破損リスク無し）
1. AWS SES SDKインストール
2. mail.tsを抽象化（既存機能保持）
3. 環境変数での切り替え機能追加

### Phase 2: SES設定
1. AWS認証情報設定
2. 送信者メール認証（info@revol-one.com）
3. サンドボックス解除申請

### Phase 3: 切り替えテスト
1. 開発環境でSES テスト
2. 送信機能確認
3. 段階的本番切り替え

## 必要な環境変数
- AWS_REGION
- AWS_ACCESS_KEY_ID  
- AWS_SECRET_ACCESS_KEY
- EMAIL_PROVIDER (sendgrid/ses)

## ロールバック計画
EMAIL_PROVIDER=sendgrid に変更するだけで即座復旧

## 影響範囲
- メール送信のみ（認証フロー、データベース影響無し）
- 既存API完全互換性維持