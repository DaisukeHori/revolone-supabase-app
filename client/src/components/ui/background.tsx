import { cn } from "@/lib/utils";

export function Background({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "fixed inset-0 -z-10",
        "bg-gradient-to-br from-orange-50/30 via-white to-amber-50/20",
        className
      )}
    />
  );
}
