import { useEffect, useMemo, useState } from "react";
import BudgetSummary from "./BudgetSummary";
import type { CategoryKey, Expense } from "../types";
import { CATEGORY_META } from "../types";

type Props = { monthlyIncome: number };
type ExpenseMap = Record<CategoryKey, Expense[]>;
type Percents = Record<CategoryKey, number>;

const keys: CategoryKey[] = ["needs", "wants", "savings"];
const STORAGE_EXPENSES = "budget_expenses_v1";
const STORAGE_PERCENTS = "budget_percents_v1";
const DEFAULT_PERCENTS: Percents = { needs: 0.5, wants: 0.3, savings: 0.2 };

const newId = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

export default function BudgetBreakdown({ monthlyIncome }: Props) {
  // --- State
  const [expenses, setExpenses] = useState<ExpenseMap>({
    needs: [],
    wants: [],
    savings: [],
  });
  const [percents, setPercents] = useState<Percents>(DEFAULT_PERCENTS);
  const [locks, setLocks] = useState<Record<CategoryKey, boolean>>({
    needs: false,
    wants: false,
    savings: false,
  });

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
  const handleSlide = (k: CategoryKey, nextIntRaw: number) => {
    if (locks[k]) return; // cannot edit a locked category

    const clamp = (n: number, lo = 0, hi = 100) =>
      Math.max(lo, Math.min(hi, n));
    const toInt = (f: number) => Math.round((Number.isFinite(f) ? f : 0) * 100);
    const toFrac = (p: number) => (Number.isFinite(p) ? p / 100 : 0);

    // current integer percentages
    const currentInt: Record<CategoryKey, number> = {
      needs: toInt(percents.needs),
      wants: toInt(percents.wants),
      savings: toInt(percents.savings),
    };

    const othersAll = (["needs", "wants", "savings"] as CategoryKey[]).filter(
      (x) => x !== k
    );
    const othersLocked = othersAll.filter((x) => locks[x]);
    const othersUnlocked = othersAll.filter((x) => !locks[x]);

    // If no other categories are available to rebalance, k cannot move.
    if (othersUnlocked.length === 0) {
      // keep total at 100%: k must equal (100 - sum(others))
      const fixedK = clamp(
        100 - othersAll.reduce((s, x) => s + currentInt[x], 0)
      );
      setPercents({ ...percents, [k]: toFrac(fixedK) });
      return;
    }

    // Desired new value for k
    let nextK = clamp(nextIntRaw);
    const delta = nextK - currentInt[k]; // >0 means we need to subtract from others; <0 means add to others

    const sumUnlocked = othersUnlocked.reduce((s, x) => s + currentInt[x], 0);
    const decCapacity = sumUnlocked; // how much we can take away (down to 0)
    const incCapacity = othersUnlocked.reduce(
      (s, x) => s + (100 - currentInt[x]),
      0
    ); // how much we can add (up to 100 each)

    // Cap nextK so we never exceed what unlocked others can compensate
    if (delta > 0 && delta > decCapacity) {
      nextK = currentInt[k] + decCapacity;
    } else if (delta < 0 && -delta > incCapacity) {
      nextK = currentInt[k] - incCapacity;
    }

    // Recompute delta after cap
    const cappedDelta = nextK - currentInt[k];

    // Proportional redistribution across unlocked others
    const provisional: Record<CategoryKey, number> = {
      ...currentInt,
      [k]: nextK,
    };

    if (cappedDelta !== 0) {
      const base = sumUnlocked || 1; // avoid div/0
      othersUnlocked.forEach((x) => {
        const weight = currentInt[x] / base; // proportional by current size
        const adj = Math.round(weight * -cappedDelta); // move opposite of k
        provisional[x] = clamp(currentInt[x] + adj, 0, 100);
      });

      // Fix rounding to make total EXACTLY 100
      const sumAfter =
        provisional[k] +
        othersUnlocked.reduce((s, x) => s + provisional[x], 0) +
        othersLocked.reduce((s, x) => s + currentInt[x], 0);

      const fix = 100 - sumAfter;
      if (fix !== 0) {
        // pick the unlocked other with most room in the direction of fix
        const pick =
          fix > 0
            ? othersUnlocked.reduce((a, b) =>
                (provisional[a] ?? 0) <= (provisional[b] ?? 0) ? b : a
              )
            : othersUnlocked.reduce((a, b) =>
                (provisional[a] ?? 0) >= (provisional[b] ?? 0) ? a : b
              );
        provisional[pick] = clamp((provisional[pick] ?? 0) + fix, 0, 100);
      }
    }

    setPercents({
      needs: toFrac(provisional.needs),
      wants: toFrac(provisional.wants),
      savings: toFrac(provisional.savings),
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
        locks={locks}
        onToggleLock={(k) => setLocks((prev) => ({ ...prev, [k]: !prev[k] }))}
      />
    </div>
  );
}

function clamp01(n: unknown): number {
  const x = typeof n === "number" ? n : NaN;
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}
