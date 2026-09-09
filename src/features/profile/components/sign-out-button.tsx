"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function signOut() {
    setIsPending(true);
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return <Button type="button" variant="outline" className="w-full text-[var(--danger)]" onClick={signOut} disabled={isPending}><LogOut size={17} />{isPending ? "Đang đăng xuất…" : "Đăng xuất"}</Button>;
}
