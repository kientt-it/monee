import { z } from "zod";

export const payableSchema = z.object({
  title: z.string().trim().min(1, "Nhập tên khoản cần trả.").max(100, "Tên tối đa 100 ký tự."),
  amount: z.number().int("Số tiền phải là số nguyên.").positive("Số tiền phải lớn hơn 0.").max(1_000_000_000_000, "Số tiền vượt giới hạn."),
  dueDate: z.iso.date("Chọn ngày cần trả hợp lệ.").refine((date) => date >= "1900-01-01" && date <= "2100-12-31", "Ngày phải nằm trong năm 1900–2100."),
  note: z.string().trim().max(500, "Ghi chú tối đa 500 ký tự."),
});

export type PayableInput = z.infer<typeof payableSchema>;
