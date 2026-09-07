import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "outline"; size?: "default" | "sm" | "icon" };

export function Button({ className, variant = "primary", size = "default", ...props }: ButtonProps) {
  return <button className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] px-4 text-sm font-semibold transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-50", variant === "primary" && "bg-[var(--brand)] text-white shadow-sm hover:bg-[var(--brand-strong)]", variant === "secondary" && "bg-[var(--brand-soft)] text-[var(--brand-strong)] hover:brightness-95", variant === "outline" && "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]", variant === "ghost" && "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]", size === "sm" && "min-h-9 rounded-xl px-3 text-xs", size === "icon" && "h-11 w-11 rounded-full p-0", className)} {...props} />;
}
