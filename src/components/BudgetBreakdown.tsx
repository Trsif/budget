import { useMemo, useState, useEffect } from "react";
import ExpenseList from "./ExpenseList";
import type { CategoryKey, Expense } from "../types";
import { CATEGORY_META } from "../types";

type Props = { monthlyIncome: number };
type ExpenseMap = Record<CategoryKey, Expense[]>;

const keys: CategoryKey[] = ["needs", "wants", "savings"];
const STORAGE_KEY = "budget_expenses_v1";
const newId = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

export default function BudgetBreakdown({ monthlyIncome }: Props) {
  const [expenses, setExpenses] = useState<ExpenseMap>({
    needs: [],
    wants: [],
    savings: [],
  });
  // --- Load from localStorage once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<ExpenseMap>;
      setExpenses((prev) => ({
        needs: parsed.needs ?? prev.needs,
        wants: parsed.wants ?? prev.wants,
        savings: parsed.savings ?? prev.savings,
      }));
    } catch {
      // ignore corrupted storage
    }
  }, []);

  // --- Save to localStorage whenever expenses change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    } catch {
      // ignore quota errors
    }
  }, [expenses]);
  const allocated = useMemo(
    () =>
      keys.reduce(
        (acc, k) => {
          acc[k] = monthlyIncome * CATEGORY_META[k].percent;
          return acc;
        },
        {} as Record<CategoryKey, number>
      ),
    [monthlyIncome]
  );

  const totals = useMemo(
    () =>
      keys.reduce(
        (acc, k) => {
          acc[k] = expenses[k].reduce(
            (sum, e) => sum + (Number.isFinite(e.amount) ? e.amount : 0),
            0
          );
          return acc;
        },
        {} as Record<CategoryKey, number>
      ),
    [expenses]
  );

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Math.max(0, Number.isFinite(n) ? n : 0));

  const onAdd = (k: CategoryKey) =>
    setExpenses((prev) => ({
      ...prev,
      [k]: [...prev[k], { id: newId(), name: "", amount: 0 }],
    }));

  const onRemove = (k: CategoryKey, id: string) =>
    setExpenses((prev) => ({
      ...prev,
      [k]: prev[k].filter((e) => e.id !== id),
    }));

  const onUpdateName = (k: CategoryKey, id: string, name: string) =>
    setExpenses((prev) => ({
      ...prev,
      [k]: prev[k].map((e) => (e.id === id ? { ...e, name } : e)),
    }));

  const onUpdateAmount = (k: CategoryKey, id: string, amount: number) =>
    setExpenses((prev) => ({
      ...prev,
      [k]: prev[k].map((e) => (e.id === id ? { ...e, amount } : e)),
    }));

  return (
    <div className="card section">
      <h2 className="text-lg font-semibold">50/30/20 Breakdown</h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {keys.map((k) => {
          const alloc = allocated[k];
          const spent = totals[k];
          const remaining = alloc - spent;
          const overBudget = remaining < 0;
          const pct =
            alloc > 0 ? Math.min(100, Math.max(0, (spent / alloc) * 100)) : 0;

          return (
            <div
              key={`summary-${k}`}
              className={`stat rounded-lg border-2 p-4 ${
                overBudget ? "border-red-500" : "border-transparent"
              }`}
            >
              <div className="font-medium text-gray-600">
                {CATEGORY_META[k].label} •{" "}
                {Math.round(CATEGORY_META[k].percent * 100)}%
              </div>

              <div className="mt-1 text-sm text-gray-600">
                Allocated: {fmt(alloc)}
              </div>
              <div className="text-sm text-gray-600">Spent: {fmt(spent)}</div>

              {/* Progress bar */}
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full ${overBudget ? "bg-red-500" : "bg-brand"}`}
                  style={{ width: `${pct}%` }}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(pct)}
                  role="progressbar"
                />
              </div>

              <div
                className={`mt-2 text-xl font-bold ${overBudget ? "text-red-600" : ""}`}
              >
                Remaining: {fmt(remaining)}
              </div>

              {/* Over-budget warning */}
              {overBudget && (
                <div
                  className="mt-2 inline-flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-red-700"
                  role="alert"
                  aria-live="polite"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    {/*  SVG path  */}
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.721-1.36 3.486 0l6.518 11.6c.73 1.3-.207 2.9-1.743 2.9H3.482c-1.536 0-2.473-1.6-1.743-2.9l6.518-11.6zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-1-2a1 1 0 01-1-1V8a1 1 0 112 0v3a1 1 0 01-1 1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium">
                    Over budget by{" "}
                    <span className="font-bold">
                      {fmt(Math.abs(remaining))}
                    </span>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {keys.map((k) => (
          <ExpenseList
            key={k}
            category={k}
            items={expenses[k]}
            onAdd={onAdd}
            onRemove={onRemove}
            onUpdateName={onUpdateName}
            onUpdateAmount={onUpdateAmount}
            headerRight={
              <span className="text-sm text-gray-600">
                Spent {fmt(totals[k])} / Alloc {fmt(allocated[k])}
              </span>
            }
          />
        ))}
      </div>
    </div>
  );
}
