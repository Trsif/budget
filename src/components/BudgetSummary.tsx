import type { CategoryKey, Expense } from "../types";
import CurrencyInput from "./CurrencyInput";
import { useState } from "react";

type Props = {
  keys: CategoryKey[];
  labels: Record<CategoryKey, string>;
  allocated: Record<CategoryKey, number>;
  totals: Record<CategoryKey, number>;
  percents: Record<CategoryKey, number>; // 0..1
  onSlide: (k: CategoryKey, nextPercentInt: number) => void;
  fmt: (n: number) => string;

  items: Record<CategoryKey, Expense[]>;
  onAdd: (k: CategoryKey) => void;
  onRemove: (k: CategoryKey, id: string) => void;
  onUpdateName: (k: CategoryKey, id: string, name: string) => void;
  onUpdateAmount: (k: CategoryKey, id: string, amount: number) => void;
  locks: Record<CategoryKey, boolean>;
  onToggleLock: (k: CategoryKey) => void;
};

const toInt = (f: number) => Math.round((Number.isFinite(f) ? f : 0) * 100);

export default function BudgetSummary({
  keys,
  labels,
  allocated,
  totals,
  percents,
  onSlide,
  fmt,
  items,
  onAdd,
  onRemove,
  onUpdateName,
  onUpdateAmount,
  locks,
  onToggleLock,
}: Props) {
  const [editing, setEditing] = useState<CategoryKey | null>(null);
  const [temp, setTemp] = useState<number>(0);
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      {keys.map((k) => {
        const alloc = allocated[k];
        const spent = totals[k];
        const remaining = alloc - spent;
        const overBudget = remaining < 0;
        const pctBar =
          alloc > 0 ? Math.min(100, Math.max(0, (spent / alloc) * 100)) : 0;
        const currentPct = toInt(percents[k]); // 0..100

        return (
          <div
            key={`summary-${k}`}
            className={`stat rounded-lg border-2 p-4 ${overBudget ? "border-red-500" : "border-transparent"}`}
          >
            {/* Compact header with inline slider */}
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium text-gray-700">{labels[k]}</div>
              <div className="flex min-w-[140px] items-center gap-2">
                <button
                  type="button"
                  className={`rounded p-1 ${locks[k] ? "text-green-600" : "text-gray-400"} hover:text-green-700`}
                  onClick={() => onToggleLock(k)}
                  title={locks[k] ? "Unlock" : "Lock"}
                >
                  {locks[k] ? "🔒" : "🔓"}
                </button>
                <input
                  className="accent-brand w-24"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={currentPct}
                  onChange={(e) => onSlide(k, Number(e.target.value))}
                  aria-label={`${labels[k]} percentage`}
                  title="Adjust allocation"
                />
                {editing === k ? (
                  <input
                    className="input w-14 !px-2 !py-1 text-right tabular-nums"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    step={1}
                    autoFocus
                    value={temp}
                    onChange={(e) => {
                      const n = Math.max(
                        0,
                        Math.min(100, Number(e.target.value) || 0)
                      );
                      setTemp(n);
                    }}
                    onBlur={() => {
                      onSlide(k, temp);
                      setEditing(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        onSlide(k, temp);
                        setEditing(null);
                      }
                      if (e.key === "Escape") {
                        setEditing(null);
                      }
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="w-10 text-right text-sm font-semibold tabular-nums hover:underline"
                    title="Click to type a percentage"
                    onClick={() => {
                      setEditing(k);
                      setTemp(currentPct);
                    }}
                  >
                    {currentPct}%
                  </button>
                )}
              </div>
            </div>

            <div className="mt-2 text-sm text-gray-600">
              Allocated: {fmt(alloc)}
            </div>
            <div className="text-sm text-gray-600">Spent: {fmt(spent)}</div>

            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-full ${overBudget ? "bg-red-500" : "bg-brand"}`}
                style={{ width: `${pctBar}%` }}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(pctBar)}
                role="progressbar"
              />
            </div>

            <div
              className={`mt-2 text-xl font-bold ${overBudget ? "text-red-600" : ""}`}
            >
              Remaining: {fmt(remaining)}
            </div>

            {/* Inline expense editor */}
            <div className="mt-4 space-y-3">
              {items[k].length === 0 && (
                <div className="text-sm text-gray-500">
                  No expenses yet — add one to get started.
                </div>
              )}

              {items[k].map((exp) => (
                <div
                  key={exp.id}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_minmax(140px,200px)_auto]"
                >
                  <label className="label block">
                    <span>Item</span>
                    <input
                      className="input"
                      type="text"
                      placeholder="e.g., Rent, Groceries"
                      value={exp.name}
                      onChange={(e) => onUpdateName(k, exp.id, e.target.value)}
                    />
                  </label>

                  <CurrencyInput
                    label="Amount"
                    value={exp.amount}
                    onChange={(n) => onUpdateAmount(k, exp.id, n)}
                    placeholder="$0.00"
                    classNameOverride="input"
                  />

                  <div className="flex items-end">
                    <button className="btn" onClick={() => onRemove(k, exp.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              <div className="pt-1">
                <button className="btn" onClick={() => onAdd(k)}>
                  Add Expense
                </button>
              </div>
            </div>

            {overBudget && (
              <div
                className="mt-2 inline-flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-red-700"
                role="alert"
                aria-live="polite"
              >
                <span className="text-sm font-medium">
                  Over budget by{" "}
                  <span className="font-bold">{fmt(Math.abs(remaining))}</span>
                  {alloc > 0 && (
                    <> ({Math.round((Math.abs(remaining) / alloc) * 100)}%)</>
                  )}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
