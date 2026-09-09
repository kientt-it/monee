"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function signOut() {
    setIsPending(true);
    const { error } = await createClient().auth.signOut();
    if (error) {
      setIsPending(false);
      toast.error("Không thể đăng xuất lúc này. Vui lòng thử lại.");
      return;
    }
    toast.success("Đã đăng xuất.");
    router.replace("/login");
  }

  return <Button type="button" variant="outline" className="w-full text-[var(--danger)]" onClick={signOut} disabled={isPending}><LogOut size={17} />{isPending ? "Đang đăng xuất…" : "Đăng xuất"}</Button>;
}
