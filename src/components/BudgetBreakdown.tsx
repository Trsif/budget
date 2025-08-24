import { useEffect, useMemo, useState } from "react";
import BudgetSummary from "./BudgetSummary";
import type { CategoryKey, Expense } from "../types";
import { CATEGORY_META } from "../types";

type Props = { monthlyIncome: number };
type ExpenseMap = Record<CategoryKey, Expense[]>;
type Percents = Record<CategoryKey, number>; // 0..1

const keys: CategoryKey[] = ["needs", "wants", "savings"];
const STORAGE_EXPENSES = "budget_expenses_v1";
const STORAGE_PERCENTS = "budget_percents_v1";
const DEFAULT_PERCENTS: Percents = { needs: 0.5, wants: 0.3, savings: 0.2 };

const newId = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const toInt = (f: number) => Math.round((Number.isFinite(f) ? f : 0) * 100);
const toFrac = (p: number) => (Number.isFinite(p) ? p / 100 : 0);

export default function BudgetBreakdown({ monthlyIncome }: Props) {
  // --- State
  const [expenses, setExpenses] = useState<ExpenseMap>({
    needs: [],
    wants: [],
    savings: [],
  });
  const [percents, setPercents] = useState<Percents>(DEFAULT_PERCENTS);

  // --- Load once
  useEffect(() => {
    try {
      const rawE = localStorage.getItem(STORAGE_EXPENSES);
      if (rawE) {
        const parsed = JSON.parse(rawE) as Partial<ExpenseMap>;
        setExpenses((prev) => ({
          needs: parsed.needs ?? prev.needs,
          wants: parsed.wants ?? prev.wants,
          savings: parsed.savings ?? prev.savings,
        }));
      }
    } catch {
      console.error();
    }
    try {
      const rawP = localStorage.getItem(STORAGE_PERCENTS);
      if (rawP) {
        const p = JSON.parse(rawP) as Partial<Percents>;
        setPercents((prev) => ({
          needs: clamp01(p.needs ?? prev.needs),
          wants: clamp01(p.wants ?? prev.wants),
          savings: clamp01(p.savings ?? prev.savings),
        }));
      }
    } catch {
      console.error();
    }
  }, []);

  // --- Persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_EXPENSES, JSON.stringify(expenses));
    } catch {
      console.error();
    }
  }, [expenses]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PERCENTS, JSON.stringify(percents));
    } catch {
      console.error();
    }
  }, [percents]);

  // --- Derived values
  const allocated = useMemo(
    () =>
      keys.reduce(
        (acc, k) => {
          acc[k] = monthlyIncome * (percents[k] ?? 0);
          return acc;
        },
        {} as Record<CategoryKey, number>
      ),
    [monthlyIncome, percents]
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

  const labels: Record<CategoryKey, string> = {
    needs: `${CATEGORY_META.needs.label}`,
    wants: `${CATEGORY_META.wants.label}`,
    savings: `${CATEGORY_META.savings.label}`,
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Math.max(Number.isFinite(n) ? n : 0, 0));

  // --- Slider handler: lock total to 100%, redistribute delta across other two proportionally
  const handleSlide = (k: CategoryKey, nextInt: number) => {
    nextInt = clamp(nextInt, 0, 100);

    const currentInt: Record<CategoryKey, number> = {
      needs: toInt(percents.needs),
      wants: toInt(percents.wants),
      savings: toInt(percents.savings),
    };

    const others = keys.filter((x) => x !== k) as CategoryKey[];
    const delta = nextInt - currentInt[k]; // if positive, must subtract from others; if negative, add to others
    const oSum = others.reduce((s, x) => s + currentInt[x], 0);

    // Start from current
    let next = { ...currentInt, [k]: nextInt };

    if (oSum <= 0 && delta > 0) {
      // Others are zero; cap k to keep sum 100
      next[k] = clamp(100 - oSum);
    } else {
      // Proportional redistribute across others
      const provisional = { ...next };
      others.forEach((x) => {
        const weight = oSum > 0 ? currentInt[x] / oSum : 1 / others.length;
        const adj = Math.round(weight * -delta); // move opposite of delta
        provisional[x] = clamp(currentInt[x] + adj, 0, 100);
      });
      // Fix rounding drift so exact 100
      const sumAfter =
        provisional[k] + others.reduce((s, x) => s + provisional[x], 0);
      const fix = 100 - sumAfter;
      if (fix !== 0) {
        const pick =
          fix > 0
            ? others.reduce((a, b) =>
                provisional[a] <= provisional[b] ? b : a
              )
            : others.reduce((a, b) =>
                provisional[a] >= provisional[b] ? a : b
              );
        provisional[pick] = clamp(provisional[pick] + fix, 0, 100);
      }
      next = provisional;
    }

    setPercents({
      needs: toFrac(next.needs),
      wants: toFrac(next.wants),
      savings: toFrac(next.savings),
    });
  };
  const resetPercents = () => {
    setPercents({ needs: 0.5, wants: 0.3, savings: 0.2 });
  };
  // --- Mutators for expenses
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
      <h2 className="text-lg font-semibold">Budget Breakdown</h2>
      <div className="mb-4 flex justify-end">
        <button className="btn" onClick={resetPercents}>
          Reset to 50/30/20
        </button>
      </div>
      {/* Compact summary cards with inline sliders (no separate allocation card) */}
      <BudgetSummary
        keys={keys}
        labels={labels}
        allocated={allocated}
        totals={totals}
        percents={percents}
        onSlide={handleSlide}
        fmt={fmt}
        // NEW:
        items={expenses}
        onAdd={onAdd}
        onRemove={onRemove}
        onUpdateName={onUpdateName}
        onUpdateAmount={onUpdateAmount}
      />
    </div>
  );
}

function clamp01(n: unknown): number {
  const x = typeof n === "number" ? n : NaN;
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}
