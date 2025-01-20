import { z } from 'zod';

// 環境変数のスキーマ定義
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  KINTONE_API_TOKEN: z.string(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  KINTONE_API_TOKEN_DEV: z.string().optional(),
  STRIPE_SECRET_KEY_DEV: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY_DEV: z.string().optional(),
  SENDGRID_API_KEY_DEV: z.string().optional(),
  KINTONE_API_TOKEN_PROD: z.string().optional(),
  STRIPE_SECRET_KEY_PROD: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY_PROD: z.string().optional(),
  SENDGRID_API_KEY_PROD: z.string().optional(),
});

// 環境ごとの設定
const config = {
  development: {
    // 開発環境用の設定
    kintone: {
      baseUrl: 'https://dev-revonizer.cybozu.com/k/v1',
      apiToken: process.env.KINTONE_API_TOKEN_DEV || process.env.KINTONE_API_TOKEN,
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY_DEV || process.env.STRIPE_SECRET_KEY,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY_DEV || process.env.STRIPE_PUBLISHABLE_KEY,
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY_DEV || process.env.SENDGRID_API_KEY,
    },
  },
  production: {
    // 本番環境用の設定
    kintone: {
      baseUrl: 'https://revonizer.cybozu.com/k/v1',
      apiToken: process.env.KINTONE_API_TOKEN_PROD || process.env.KINTONE_API_TOKEN,
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY_PROD || process.env.STRIPE_SECRET_KEY,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY_PROD || process.env.STRIPE_PUBLISHABLE_KEY,
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY_PROD || process.env.SENDGRID_API_KEY,
    },
  },
};

// 環境変数の検証と型付け
function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ 環境変数の検証に失敗しました:', parsed.error.format());
    throw new Error('環境変数の設定が不正です');
  }

  return parsed.data;
}

// 型付けされた環境変数
export const env = validateEnv();

// 開発環境と本番環境の判定
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';

// 現在の環境の設定を取得
export const currentConfig = config[env.NODE_ENV];

// APIキーの取得
export function getApiKey(key: keyof typeof env) {
  const value = env[key];
  if (!value) {
    throw new Error(`環境変数 ${key} が設定されていません`);
  }
  return value;
}