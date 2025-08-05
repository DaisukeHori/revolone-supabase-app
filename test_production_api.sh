#!/bin/bash

# プロダクション環境のKintone API テストスクリプト

# 1. まずセッションクッキーを使って認証状態を確認
echo "=== 認証状態の確認 ==="
curl -X GET "https://app.revol-one.com/api/user" \
  -H "Cookie: connect.sid=s%3AKHnXdS8rY9X6tFY79KREK5XhVctY1M1N.PuKmoVp0pVepPXf7HbEeDwbCCr6sVPsrBqkcdat3sAw" \
  -H "Accept: application/json" \
  -v

echo -e "\n\n=== 修理履歴APIのテスト ==="
# 2. 修理履歴エンドポイントをテスト
curl -X GET "https://app.revol-one.com/api/devices/2311010300/repair-history" \
  -H "Cookie: connect.sid=s%3AKHnXdS8rY9X6tFY79KREK5XhVctY1M1N.PuKmoVp0pVepPXf7HbEeDwbCCr6sVPsrBqkcdat3sAw" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -v 2>&1 | grep -E "(< HTTP|< |{|})|\[Kintone"

echo -e "\n\n=== サーバーログの確認用 ==="
echo "上記のリクエストでサーバー側のログを確認してください。"
echo "特に以下の情報に注目："
echo "- [Kintone] 環境:"
echo "- [Kintone] トークン長:"
echo "- [Kintone Debug] Request URL:"
echo "- エラーレスポンス:"