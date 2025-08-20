export const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-Weekly" },
  { value: "monthly", label: "Monthly" },
] as const;

export type Frequency = (typeof FREQUENCIES)[number]["value"];

export type CategoryKey = "needs" | "wants" | "savings";

export const CATEGORY_META: Record<
  CategoryKey,
  { label: string; percent: number }
> = {
  needs: { label: "Needs", percent: 0.5 },
  wants: { label: "Wants", percent: 0.3 },
  savings: { label: "Savings/Debt", percent: 0.2 },
};
export type Expense = { id: string; name: string; amount: number };
