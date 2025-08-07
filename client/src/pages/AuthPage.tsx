import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthForm } from "@/components/auth/AuthForm";
import { Background } from "@/components/ui/background";
import { motion } from "framer-motion";
import logoUrl from '@/assets/logo.png';

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
          <div className="bg-modern-gradient p-8 text-center">
            <div className="mx-auto w-20 h-20 bg-white rounded-lg flex items-center justify-center mb-4 shadow-md">
              <img src={logoUrl} alt="Revonizer" className="w-16 h-16 object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Revonizer
            </h1>
            <p className="text-white/90">
              美容サロン機器管理システム
            </p>
          </div>
          <div className="p-8">
            <AuthForm />
          </div>
        </div>
      </motion.div>
    </div>
  );
}