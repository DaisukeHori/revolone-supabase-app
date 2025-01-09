import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // ローカルストレージからテーマを取得
    const savedTheme = localStorage.getItem("theme") as Theme;
    return savedTheme || "light";
  });

  useEffect(() => {
    // テーマが変更されたらDOMとローカルストレージを更新
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return {
    theme,
    setTheme,
    isDark: theme === "dark",
    toggleTheme: () => setTheme(prev => prev === "light" ? "dark" : "light")
  };
}
