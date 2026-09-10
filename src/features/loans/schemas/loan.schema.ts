import { z } from "zod";

export const loanSchema = z.object({
  name: z.string().trim().min(1, "Nhập tên khoản vay.").max(80, "Tên tối đa 80 ký tự."),
  lender: z.string().trim().max(120, "Bên cho vay tối đa 120 ký tự."),
  monthlyAmount: z.number().int("Số tiền phải là số nguyên.").positive("Số tiền phải lớn hơn 0.").max(1_000_000_000_000, "Số tiền vượt giới hạn."),
  firstDueDate: z.iso.date("Chọn ngày đóng kỳ đầu hợp lệ.").refine((date) => date >= "1900-01-01" && date <= "2100-12-31", "Ngày phải nằm trong năm 1900–2100."),
  installmentCount: z.number().int().min(1, "Cần ít nhất 1 kỳ đóng.").max(600, "Tối đa 600 kỳ đóng."),
  note: z.string().trim().max(500, "Ghi chú tối đa 500 ký tự."),
});

export const loanPaymentSchema = z.object({
  loanId: z.uuid(),
  installmentNumber: z.number().int().min(1).max(600),
  paid: z.boolean(),
});

export type LoanInput = z.infer<typeof loanSchema>;
