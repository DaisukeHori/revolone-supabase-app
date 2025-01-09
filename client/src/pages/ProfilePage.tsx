import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { Loader2, User as UserIcon, Pencil, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import { useState } from "react";
import { EditProfileForm } from "@/components/profile/EditProfileForm";
import { useLocation } from "wouter";

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

export default function ProfilePage() {
  const { user, isLoading } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

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
          <h1 className="text-2xl font-semibold">プロフィール</h1>
        </div>

        <motion.div variants={item}>
          <Card className="bg-background/95 backdrop-blur-sm border-primary/10">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <UserIcon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">プロフィール</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(!isEditing)}
                  className="hover:bg-primary/10"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <EditProfileForm onComplete={() => setIsEditing(false)} />
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">ユーザー名</div>
                    <div className="text-lg">{user?.username}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">メールアドレス</div>
                    <div className="text-lg">{user?.email}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">登録日</div>
                    <div className="text-lg">
                      {new Date(user!.createdAt).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                      })}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}