import type { CategoryKey, Expense } from "../types";
import CurrencyInput from "./CurrencyInput";
import type { ChangeEvent } from "react";
type Props = {
  category: CategoryKey;
  items: Expense[];
  onAdd: (category: CategoryKey) => void;
  onRemove: (category: CategoryKey, id: string) => void;
  onUpdateName: (category: CategoryKey, id: string, name: string) => void;
  onUpdateAmount: (category: CategoryKey, id: string, amount: number) => void;
  headerRight?: React.ReactNode;
};

export default function ExpenseList({
  category,
  items,
  onAdd,
  onRemove,
  onUpdateName,
  onUpdateAmount,
  headerRight,
}: Props) {
  return (
    <div className="card section">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold capitalize">{category}</h3>
        <div className="flex items-center gap-3">
          {headerRight}
          <button className="btn" onClick={() => onAdd(category)}>
            Add Expense
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {items.length === 0 && (
          <div className="text-sm text-gray-500">
            No expenses yet — add one to get started.
          </div>
        )}

        {items.map((exp) => (
          <div
            key={exp.id}
            className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_minmax(160px,220px)_auto]"
          >
            <label className="label block">
              <span>Item</span>
              <input
                className="input"
                type="text"
                placeholder="e.g., Rent, Groceries"
                value={exp.name}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onUpdateName(category, exp.id, e.target.value)
                }
              />
            </label>

            <CurrencyInput
              label="Amount"
              value={exp.amount}
              onChange={(n) => onUpdateAmount(category, exp.id, n)}
              placeholder="$0.00"
              classNameOverride="input"
            />

            <div className="flex items-end">
              <button
                className="btn"
                onClick={() => onRemove(category, exp.id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
