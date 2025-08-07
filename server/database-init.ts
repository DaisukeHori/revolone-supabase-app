import { db } from "@db";
import { users } from "@db/schema";

/**
 * Replitで絶対に安全なデータベース初期化
 * 既存のデータを破壊せず、冪等性を保証
 */
export async function initializeDatabaseSafely(): Promise<void> {
  console.log("========== データベース初期化開始 ==========");
  console.log("データベースURL:", process.env.DATABASE_URL ? '設定済み' : '未設定');
  
  try {
    console.log("データベース接続を確認中...");
    
    // データベース接続テスト
    const startTime = Date.now();
    await db.select().from(users).limit(1);
    const connectionTime = Date.now() - startTime;
    
    console.log(`✓ データベース接続成功 (${connectionTime}ms)`);
    console.log("✓ データベースは既に初期化されています");
    console.log("========================================");
    
  } catch (error: any) {
    console.log(`データベースエラー検出: ${error.code || 'UNKNOWN'} - ${error.message}`);
    
    // テーブルが存在しない場合のみ初期化
    if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
      console.log("新しいデータベースを検出 - スキーマを作成します...");
      
      try {
        // Drizzle Kit を使用してスキーマを安全に作成
        const { execSync } = require('child_process');
        const pushStartTime = Date.now();
        
        console.log("Drizzle Kit実行中...");
        execSync('npx drizzle-kit push --yes', { 
          stdio: 'inherit',
          env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
        });
        
        const pushTime = Date.now() - pushStartTime;
        console.log(`✓ データベーススキーマ作成完了 (${pushTime}ms)`);
        
        // 作成後の確認テスト
        const verifyStartTime = Date.now();
        await db.select().from(users).limit(1);
        const verifyTime = Date.now() - verifyStartTime;
        
        console.log(`✓ データベース検証完了 (${verifyTime}ms)`);
        console.log("✓ データベース初期化が正常に完了しました");
        console.log("========================================");
        
      } catch (createError: any) {
        console.error("✗ データベーススキーマ作成エラー:", createError);
        console.error("========================================");
        throw new Error(`データベース初期化に失敗しました: ${createError.message}`);
      }
    } else {
      // その他のデータベースエラー
      console.error("✗ 深刻なデータベース接続エラー:", error);
      console.error("データベースURL:", process.env.DATABASE_URL ? '設定済みだが接続不可' : '未設定');
      console.error("========================================");
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