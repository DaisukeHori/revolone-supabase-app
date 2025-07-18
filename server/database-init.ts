import { db } from "@db";
import { users } from "@db/schema";

/**
 * Replitで絶対に安全なデータベース初期化
 * 既存のデータを破壊せず、冪等性を保証
 */
export async function initializeDatabaseSafely(): Promise<void> {
  try {
    console.log("データベース接続を確認中...");
    
    // データベース接続テスト
    await db.select().from(users).limit(1);
    console.log("データベースは既に初期化されています");
    
  } catch (error: any) {
    // テーブルが存在しない場合のみ初期化
    if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
      console.log("データベーススキーマを作成中...");
      
      try {
        // Drizzle Kit を使用してスキーマを安全に作成
        const { execSync } = require('child_process');
        execSync('npx drizzle-kit push --yes', { 
          stdio: 'inherit',
          env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
        });
        
        console.log("データベーススキーマが正常に作成されました");
        
        // 作成後の確認テスト
        await db.select().from(users).limit(1);
        console.log("データベース初期化が完了しました");
        
      } catch (createError: any) {
        console.error("データベーススキーマ作成エラー:", createError);
        throw new Error(`データベース初期化に失敗しました: ${createError.message}`);
      }
    } else {
      // その他のデータベースエラー
      console.error("データベース接続エラー:", error);
      throw new Error(`データベースに接続できません: ${error.message}`);
    }
  }
}

/**
 * 安全なデータベース初期化ラッパー
 * エラーが発生した場合はアプリケーションを停止
 */
export async function ensureDatabaseReady(): Promise<void> {
  try {
    await initializeDatabaseSafely();
  } catch (error: any) {
    console.error("致命的なデータベースエラー:", error.message);
    console.error("アプリケーションを停止します");
    process.exit(1);
  }
}