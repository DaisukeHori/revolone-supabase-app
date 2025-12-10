import { type NextFunction, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "@db";
import { users } from "@db/schema";
import { getSupabaseClient } from "./supabaseClient";

declare module "express-serve-static-core" {
  interface Request {
    isAuthenticated?: () => boolean;
    user?: any;
  }
}

/**
 * SupabaseのJWT（Authorization: Bearer）を検証し、req.user に既存DBユーザーをアタッチするミドルウェア。
 * 既存のPassportセッションがある場合はそちらを優先し、Bearerがあれば上書きする。
 */
export async function attachSupabaseUser(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    // 既にPassportで認証済みならそのまま
    if (req.user && typeof req.isAuthenticated === "function" && req.isAuthenticated()) {
      return next();
    }

    const authz = req.headers.authorization;
    if (!authz || !authz.startsWith("Bearer ")) {
      return next();
    }

    const token = authz.slice("Bearer ".length).trim();
    if (!token) {
      return next();
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return next();
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      if (error) {
        console.warn("[Supabase] auth.getUser error:", error.message);
      }
      return next();
    }

    const email = data.user.email;
    if (!email) return next();

    const [dbUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!dbUser) {
      console.warn("[Supabase] JWT検証は成功したがDBユーザーが存在しません:", email);
      return next();
    }

    // req.user と isAuthenticated をセット（既存ルート互換用）
    req.user = dbUser;
    req.isAuthenticated = () => true;
  } catch (err) {
    console.error("[Supabase] attachSupabaseUser error:", err);
  }

  next();
}

