import { useState } from "react";
import type { CategoryKey } from "../types";

type Percents = Record<CategoryKey, number>; // values stored as 0..1
type Props = {
  percents: Percents;
  onChange: (next: Percents) => void;
  onReset?: () => void;
};

const keys: CategoryKey[] = ["needs", "wants", "savings"];
const LABELS: Record<CategoryKey, string> = {
  needs: "Needs",
  wants: "Wants",
  savings: "Savings / Debt",
};

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const toInt = (f: number) => Math.round((Number.isFinite(f) ? f : 0) * 100);
const toFrac = (p: number) => (Number.isFinite(p) ? p / 100 : 0);

export default function PercentageControls({
  percents,
  onChange,
  onReset,
}: Props) {
  const [lockTo100, setLockTo100] = useState(true);

  const total = keys.reduce((sum, k) => sum + toInt(percents[k]), 0);
  const invalid = !lockTo100 && total !== 100;

  const handleInput = (k: CategoryKey, raw: string) => {
    // current integer percentages
    const current: Record<CategoryKey, number> = {
      needs: toInt(percents.needs),
      wants: toInt(percents.wants),
      savings: toInt(percents.savings),
    };

    // new value for the edited key
    const nextK = clamp(Number(raw.replace(/[^\d-]/g, "")) || 0);

    if (!lockTo100) {
      // Just set and let total be whatever
      onChange({ ...percents, [k]: toFrac(nextK) });
      return;
    }

    // Lock to 100%: redistribute delta across the other two proportionally.
    const others = keys.filter((x) => x !== k) as CategoryKey[];
    const delta = nextK - current[k]; // what we need to add/remove from others
    const oSum = others.reduce((s, x) => s + current[x], 0);

    let next: Record<CategoryKey, number> = { ...current, [k]: nextK };

    if (oSum === 0) {
      // Edge: others are 0. Split the opposite of delta evenly.
      const share = Math.floor(Math.abs(delta) / others.length);
      if (delta > 0) {
        // need to remove from others, but they are 0 -> clamp k back to keep total 100
        next[k] = clamp(100 - oSum);
      } else if (delta < 0) {
        // we can grow others evenly
        others.forEach(
          (x, i) => (next[x] = i === 0 ? share : Math.abs(delta) - share)
        );
      }
    } else {
      // Proportional redistribute to keep sum 100
      // We subtract (if delta > 0) or add (if delta < 0) across others weighted by their current size.
      // const remainingDelta = delta;
      // Do two passes: proportional, then clamp-correct any negatives/overflows
      const provisional = { ...next };
      others.forEach((x) => {
        const weight = oSum > 0 ? current[x] / oSum : 1 / others.length;
        const adj = Math.round(weight * -delta); // move opposite of delta
        provisional[x] = clamp(current[x] + adj);
      });
      // After rounding & clamping, recompute to ensure exact 100%
      const sumAfter =
        provisional[k] + others.reduce((s, x) => s + provisional[x], 0);
      const fix = 100 - sumAfter; // distribute leftover 1–2% due to rounding

      // Nudge the largest (or smallest) other to absorb rounding error
      if (fix !== 0) {
        const pick =
          fix > 0
            ? // need to add: pick the other with the largest room (<=100)
              others.reduce((a, b) =>
                provisional[a] <= provisional[b] ? b : a
              )
            : // need to subtract: pick the other with the largest value
              others.reduce((a, b) =>
                provisional[a] >= provisional[b] ? a : b
              );
        provisional[pick] = clamp(provisional[pick] + fix);
      }

      next = provisional;
    }

    // Convert back to fractions
    onChange({
      needs: toFrac(next.needs),
      wants: toFrac(next.wants),
      savings: toFrac(next.savings),
    });
  };

  return (
    <div className="card section">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Allocation (%)</h3>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 select-none">
            <input
              type="checkbox"
              checked={lockTo100}
              onChange={(e) => setLockTo100(e.target.checked)}
            />
            Lock to 100%
          </label>
          <span
            className={`text-sm ${invalid ? "text-red-600" : "text-gray-600"}`}
          >
            Total: <strong>{total}%</strong>
            {!lockTo100 && invalid && " (should be 100%)"}
          </span>
          {onReset && (
            <button className="btn" onClick={onReset}>
              Reset 50/30/20
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {keys.map((k) => (
          <label key={k} className="label">
            <span>{LABELS[k]}</span>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              step={1}
              value={toInt(percents[k])}
              onChange={(e) => handleInput(k, e.target.value)}
            />
          </label>
        ))}
      </div>

      {!lockTo100 && invalid && (
        <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-yellow-800">
          <span className="text-sm">
            Your allocations add up to <strong>{total}%</strong>. For balance,
            they should total 100%.
          </span>
        </div>
      )}
    </div>
  );
}
