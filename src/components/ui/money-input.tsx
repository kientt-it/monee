"use client";

import { forwardRef, useEffect, useState, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type MoneyInputProps = Omit<ComponentPropsWithoutRef<"input">, "type" | "value" | "onChange"> & {
  value?: number | null;
  onValueChange: (value: number | undefined) => void;
};

function formatInputValue(value?: number | null) {
  return value === undefined || value === null || Number.isNaN(value) ? "" : value.toLocaleString("vi-VN");
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput({ className, value, onValueChange, onBlur, ...props }, ref) {
  const [displayValue, setDisplayValue] = useState(() => formatInputValue(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDisplayValue(formatInputValue(value));
  }, [focused, value]);

  return <input
    {...props}
    ref={ref}
    type="text"
    value={displayValue}
    inputMode="numeric"
    autoComplete="off"
    onFocus={() => setFocused(true)}
    onChange={(event) => {
      const digits = event.target.value.replace(/\D/g, "");
      if (!digits) {
        setDisplayValue("");
        onValueChange(undefined);
        return;
      }
      const nextValue = Number(digits);
      setDisplayValue(nextValue.toLocaleString("vi-VN"));
      onValueChange(nextValue);
    }}
    onBlur={(event) => {
      setFocused(false);
      setDisplayValue(formatInputValue(value));
      onBlur?.(event);
    }}
    className={cn("mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base tabular-nums", className)}
  />;
});
