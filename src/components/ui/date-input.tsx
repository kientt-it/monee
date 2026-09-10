import type { ComponentProps } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

export function DateInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  return <div className={cn("flex min-h-11 min-w-0 w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 focus-within:outline-2 focus-within:outline-[var(--brand)]", className)}>
    <CalendarDays size={17} aria-hidden="true" className="shrink-0 text-[var(--muted)]" />
    <input {...props} type="date" className="date-input min-h-11 min-w-0 w-full flex-1 appearance-none border-0 bg-transparent py-2 text-base text-[var(--foreground)] focus-visible:outline-none" />
  </div>;
}
