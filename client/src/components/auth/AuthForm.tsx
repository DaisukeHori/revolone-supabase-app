import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { LoginForm } from "./LoginForm";

export function AuthForm() {
  const [, setLocation] = useLocation();

  const onLoginComplete = () => {
    setLocation("/");
  };

  return (
    <div className="space-y-4">
      <LoginForm onComplete={onLoginComplete} />
      <Button
        type="button"
        variant="ghost"
        className="w-full text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
        onClick={() => {
          setLocation('/register');
        }}
      >
        アカウントをお持ちでない方はこちら
      </Button>
    </div>
  );
}