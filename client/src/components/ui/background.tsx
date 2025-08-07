import { cn } from "@/lib/utils";

export function Background({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "fixed inset-0 -z-10",
        "bg-gradient-to-br from-slate-50 via-white to-blue-50",
        className
      )}
    />
  );
}
