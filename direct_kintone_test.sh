#!/bin/bash

# Kintone APIを直接テストするスクリプト
# 開発環境と同じトークンを使用

echo "=== Kintone API 直接テスト ==="
echo "開発環境で使用しているAPIトークンを使って、Kintone APIに直接アクセスします。"
echo ""

# 環境変数のAPIトークンを使用
API_TOKEN="${KINTONE_API_TOKEN_ALL}"

if [ -z "$API_TOKEN" ]; then
    echo "エラー: KINTONE_API_TOKEN_ALL が設定されていません"
    exit 1
fi

echo "APIトークン長: ${#API_TOKEN}"
echo "APIトークン先頭20文字: ${API_TOKEN:0:20}..."
echo ""

# App 22（修理履歴）への直接アクセステスト
echo "=== App 22 アクセステスト ==="
curl -X GET "https://e18p5.cybozu.com/k/v1/records.json?app=22&query=limit%201" \
  -H "X-Cybozu-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -v 2>&1 | grep -E "(< HTTP|< |{|})"

echo -e "\n\n=== 特定の製造番号で検索 ==="
# URLエンコードされたクエリ
QUERY='ルックアップ = "2311010300"'
ENCODED_QUERY=$(printf '%s' "$QUERY" | jq -sRr @uri)

curl -X GET "https://e18p5.cybozu.com/k/v1/records.json?app=22&query=${ENCODED_QUERY}" \
  -H "X-Cybozu-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -v 2>&1 | grep -E "(< HTTP|< |{|})"