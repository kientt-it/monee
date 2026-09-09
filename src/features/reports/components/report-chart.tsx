"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ReportTrend } from "@/features/reports/queries/get-report";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils";

export function ReportChart({ data }: { data: ReportTrend[] }) {
  return <div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={3}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} tickFormatter={formatCompactCurrency} width={44} /><Tooltip formatter={(value, name) => [formatCurrency(Number(value)), name === "income" ? "Thu nhập" : "Chi tiêu"]} contentStyle={{ borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--foreground)" }} /><Legend formatter={(value) => value === "income" ? "Thu nhập" : "Chi tiêu"} wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="income" fill="var(--brand)" radius={[5, 5, 0, 0]} /><Bar dataKey="expense" fill="var(--warning)" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>;
}
