import { z } from "zod";
import { calculateHuiProfit } from "./calculate-hui";

const money = z.number().int().min(0).max(1_000_000_000_000);
export const huiConfigSchema = z.object({
  version: z.literal(1),
  shares: z.number().int().min(2).max(1000),
  payoutPeriod: z.number().int().min(1).max(1000),
  faceValue: money.min(1), startingContribution: money.min(1), bid: money.min(1), organizerFee: money,
  historyMode: z.enum(["average", "total"]),
  averageContribution: money.nullable(),
  pastTotal: z.number().int().min(0).max(1_000_000_000_000_000).nullable(),
}).superRefine((config, ctx) => {
  const paidOutShares = config.payoutPeriod - 1;
  const pastContributions = paidOutShares === 0 ? 0 : config.historyMode === "average"
    ? (config.averageContribution === null ? NaN : config.averageContribution * paidOutShares) : (config.pastTotal ?? NaN);
  if (!calculateHuiProfit({ ...config, paidOutShares, pastContributions })) {
    ctx.addIssue({ code: "custom", message: "Kiểm tra kỳ hốt, các mức góp và tiền đã góp trước khi lưu." });
  }
});
export type HuiConfig = z.infer<typeof huiConfigSchema>;
export type SavedHuiCalculation = { config: HuiConfig; savedAt: string };
