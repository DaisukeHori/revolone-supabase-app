import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import { Bell, Moon, Mail, Shield, ArrowLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useTheme } from "@/hooks/use-theme";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const { isDark, toggleTheme } = useTheme();
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [, setLocation] = useLocation();

  return (
    <AppLayout>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            className="hover:bg-primary/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold">設定</h1>
        </div>

        <motion.div variants={item}>
          <Card className="bg-background/95 backdrop-blur-sm border-primary/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Bell className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">通知設定</CardTitle>
                  <CardDescription>
                    通知の受け取り方を管理します
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">メール通知</Label>
                  <p className="text-sm text-muted-foreground">
                    重要なお知らせをメールで受け取ります
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="bg-background/95 backdrop-blur-sm border-primary/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Moon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">表示設定</CardTitle>
                  <CardDescription>
                    アプリケーションの表示方法をカスタマイズします
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">ダークモード</Label>
                  <p className="text-sm text-muted-foreground">
                    暗めの配色に切り替えます
                  </p>
                </div>
                <Switch
                  checked={isDark}
                  onCheckedChange={toggleTheme}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="bg-background/95 backdrop-blur-sm border-primary/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">セキュリティ設定</CardTitle>
                  <CardDescription>
                    アカウントのセキュリティを管理します
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">二段階認証</Label>
                  <p className="text-sm text-muted-foreground">
                    ログイン時に追加の認証を要求します
                  </p>
                </div>
                <Switch
                  checked={twoFactorAuth}
                  onCheckedChange={setTwoFactorAuth}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}