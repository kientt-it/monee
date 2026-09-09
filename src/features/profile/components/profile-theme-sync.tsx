"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import type { ProfileRecord } from "@/features/profile/queries/get-current-profile";

export function ProfileThemeSync({ theme, children }: Readonly<{ theme: ProfileRecord["theme"]; children: React.ReactNode }>) {
  const { setTheme } = useTheme();
  useEffect(() => setTheme(theme), [setTheme, theme]);
  return children;
}
