"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Check, Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { saveProfileAction } from "@/features/profile/actions/save-profile";
import type { ProfileRecord } from "@/features/profile/queries/get-current-profile";
import { profileSchema, type ProfileInput } from "@/features/profile/schemas/profile.schema";

const themes = [
  { value: "system" as const, label: "Theo thiết bị", icon: Laptop },
  { value: "light" as const, label: "Sáng", icon: Sun },
  { value: "dark" as const, label: "Tối", icon: Moon },
];

export function ProfileForm({ profile, email, mode = "profile" }: { profile: ProfileRecord; email: string | null; mode?: "onboarding" | "profile" }) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile.fullName,
      currency: profile.currency,
      locale: profile.locale,
      timezone: profile.timezone,
      theme: profile.theme,
      completeOnboarding: mode === "onboarding",
    },
  });
  const selectedTheme = useWatch({ control: form.control, name: "theme" });

  function submit(values: ProfileInput) {
    setFeedback("");
    startTransition(async () => {
      const result = await saveProfileAction({ ...values, completeOnboarding: mode === "onboarding" });
      if (!result.ok) {
        setFeedback(result.error === "SUPABASE_NOT_CONFIGURED" ? "Supabase chưa được cấu hình." : result.error);
        return;
      }
      setTheme(values.theme);
      if (mode === "onboarding") {
        router.replace(result.nextPath);
        router.refresh();
      } else {
        setFeedback("Đã lưu thay đổi.");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
      <label className="block text-sm font-semibold">
        Tên bạn muốn hiển thị
        <input {...form.register("fullName")} autoComplete="name" className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base" placeholder="Ví dụ: Minh Anh" />
        {form.formState.errors.fullName && <span className="mt-1 block text-xs text-[var(--danger)]">{form.formState.errors.fullName.message}</span>}
      </label>

      {email && <div><p className="text-sm font-semibold">Email</p><p className="mt-2 rounded-xl bg-[var(--surface-muted)] px-3 py-3 text-sm text-[var(--muted)]">{email}</p></div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          Đơn vị tiền
          <select {...form.register("currency")} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base">
            <option value="VND">Việt Nam đồng (₫)</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Múi giờ
          <select {...form.register("timezone")} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base">
            <option value="Asia/Ho_Chi_Minh">Việt Nam (GMT+7)</option>
          </select>
        </label>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold">Giao diện</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {themes.map(({ value, label, icon: Icon }) => (
            <label key={value} className={`relative flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border px-2 text-center text-sm font-semibold transition ${selectedTheme === value ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-strong)]" : "border-[var(--border)] hover:bg-[var(--surface-muted)]"}`}>
              <input type="radio" value={value} {...form.register("theme")} className="sr-only" />
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
              {selectedTheme === value && <Check size={14} className="absolute right-2 top-2" aria-hidden="true" />}
            </label>
          ))}
        </div>
      </fieldset>

      {feedback && <p role="status" className={`rounded-xl px-3 py-2 text-sm ${feedback === "Đã lưu thay đổi." ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]" : "bg-[#fff0ed] text-[var(--danger)]"}`}>{feedback}</p>}
      <Button type="submit" className="w-full" disabled={isPending}>{isPending ? "Đang lưu…" : mode === "onboarding" ? "Hoàn tất thiết lập" : "Lưu thay đổi"}</Button>
    </form>
  );
}
