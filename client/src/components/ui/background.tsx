import { cn } from "@/lib/utils";

export function Background({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "fixed inset-0 -z-10 bg-[#f7f7f7]",
        "before:absolute before:inset-0 before:bg-washi-pattern before:opacity-30",
        "after:absolute after:inset-0 after:bg-ink-pattern after:opacity-5",
        className
      )}
    />
  );
}
