"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAuthContext } from "@/lib/supabase/auth-context";
import { localToday } from "@/lib/date";
import { payableSchema } from "../schemas/payable.schema";

const idSchema = z.uuid();
const idsSchema = z.array(idSchema).min(1).max(10_000).refine((ids) => new Set(ids).size === ids.length);

function refreshPayables() {
  revalidatePath("/app/payables");
  revalidatePath("/app");
}

export async function savePayableAction(id: string | null, input: unknown) {
  const parsed = payableSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Khoản cần trả không hợp lệ." };
  if (id && !idSchema.safeParse(id).success) return { ok: false as const, error: "Khoản cần trả không hợp lệ." };
  const { supabase, user } = await getSupabaseAuthContext();
  if (!supabase || !user) return { ok: false as const, error: "Bạn cần đăng nhập để lưu khoản cần trả." };
  const values = parsed.data;
  const fields = { title: values.title, amount: values.amount, due_date: values.dueDate, note: values.note, updated_at: new Date().toISOString() };
  const query = id
    ? supabase.from("payables").update(fields).eq("id", id).eq("user_id", user.id).select("id").maybeSingle()
    : supabase.from("payables").insert({ ...fields, user_id: user.id }).select("id").maybeSingle();
  const { data, error } = await query;
  if (error || !data) return { ok: false as const, error: "Không thể lưu khoản cần trả. Vui lòng thử lại." };
  refreshPayables();
  return { ok: true as const };
}

export async function setPayablePaidAction(id: string, paid: boolean) {
  if (!idSchema.safeParse(id).success || typeof paid !== "boolean") return { ok: false as const, error: "Khoản cần trả không hợp lệ." };
  const { supabase, user } = await getSupabaseAuthContext();
  if (!supabase || !user) return { ok: false as const, error: "Bạn cần đăng nhập để cập nhật khoản cần trả." };
  const { data, error } = await supabase.from("payables")
    .update({ paid_on: paid ? localToday() : null, updated_at: new Date().toISOString() })
    .eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
  if (error || !data) return { ok: false as const, error: "Không thể cập nhật khoản cần trả. Vui lòng thử lại." };
  refreshPayables();
  return { ok: true as const };
}

export async function deletePayablesAction(ids: string[]) {
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return { ok: false as const, error: "Danh sách khoản cần trả không hợp lệ." };
  const { supabase, user } = await getSupabaseAuthContext();
  if (!supabase || !user) return { ok: false as const, error: "Bạn cần đăng nhập để xóa khoản cần trả." };
  const { data, error } = await supabase.rpc("delete_payables", { p_ids: parsed.data });
  if (error) return { ok: false as const, error: "Không thể xóa khoản cần trả. Vui lòng thử lại." };
  refreshPayables();
  return { ok: true as const, count: Number(data) };
}
