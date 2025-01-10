import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
}

const calculatePasswordStrength = (password: string): number => {
  let strength = 0;
  const rules = [
    /[a-z]/, // 小文字
    /[A-Z]/, // 大文字
    /[0-9]/, // 数字
    /[^a-zA-Z0-9]/, // 特殊文字
  ];

  // パスワードの長さによるスコア
  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 25;

  // 各ルールを満たすごとにスコアを加算
  rules.forEach(rule => {
    if (rule.test(password)) {
      strength += 12.5;
    }
  });

  return Math.min(100, strength);
};

const getStrengthText = (strength: number): { text: string; color: string } => {
  if (strength === 0) return { text: "パスワードを入力してください", color: "text-muted-foreground" };
  if (strength < 30) return { text: "弱いパスワード", color: "text-red-500" };
  if (strength < 60) return { text: "普通のパスワード", color: "text-yellow-500" };
  if (strength < 80) return { text: "強いパスワード", color: "text-green-500" };
  return { text: "とても強いパスワード", color: "text-green-600" };
};

const getProgressBarClass = (strength: number): string => {
  if (strength < 30) return "bg-red-500";
  if (strength < 60) return "bg-yellow-500";
  if (strength < 80) return "bg-green-500";
  return "bg-green-600";
};

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const strength = calculatePasswordStrength(password);
  const { text, color } = getStrengthText(strength);

  return (
    <div className="space-y-2">
      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all duration-300", getProgressBarClass(strength))}
          style={{ width: `${strength}%` }}
        />
      </div>
      <p className={cn("text-sm", color)}>{text}</p>
      {password.length > 0 && (
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li className={password.length >= 8 ? "text-green-500" : ""}>
            ✓ 8文字以上
          </li>
          <li className={/[a-z]/.test(password) ? "text-green-500" : ""}>
            ✓ 小文字を含む
          </li>
          <li className={/[A-Z]/.test(password) ? "text-green-500" : ""}>
            ✓ 大文字を含む
          </li>
          <li className={/[0-9]/.test(password) ? "text-green-500" : ""}>
            ✓ 数字を含む
          </li>
          <li className={/[^a-zA-Z0-9]/.test(password) ? "text-green-500" : ""}>
            ✓ 特殊文字を含む
          </li>
        </ul>
      )}
    </div>
  );
}