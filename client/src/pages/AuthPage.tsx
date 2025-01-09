import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthForm } from "@/components/auth/AuthForm";
import { Background } from "@/components/ui/background";
import { motion } from "framer-motion";

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <Background className="fixed inset-0" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="bg-background/95 backdrop-blur-sm border-primary/10">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center font-medium">
              ようこそ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AuthForm />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}