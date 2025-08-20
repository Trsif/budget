import { useState, useEffect } from "react";
import FrequencySelect from "./components/FrequencySelect";
import type { Frequency } from "./types";
import CurrencyInput from "./components/CurrencyInput";
import BudgetBreakdown from "./components/BudgetBreakdown";

const frequencyMultipliers: Record<Frequency, number> = {
  weekly: 3.8,
  biweekly: 2,
  monthly: 1,
};

const STORAGE_KEY = "budget_settings_v1";
function App() {
  const [payAmount, setPayAmount] = useState<number>(0);
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<{
        frequency: Frequency;
        payAmount: number;
      }>;
      if (parsed.frequency) setFrequency(parsed.frequency);
      if (Number.isFinite(parsed.payAmount ?? NaN))
        setPayAmount(parsed.payAmount as number);
    } catch {
      // ignore corrupted storage
    }
  }, []);

  // --- Save settings whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ frequency, payAmount })
      );
    } catch {
      // ignore quota errors
    }
  }, [frequency, payAmount]);
  const monthlyIncome = Number(
    (payAmount * frequencyMultipliers[frequency]).toFixed(2)
  );
  return (
    <div className="page">
      <div className="container">
        <div className="card section">
          <h1 className="title">Budget Calculator</h1>

          <div className="row">
            <FrequencySelect value={frequency} onChange={setFrequency} />
            <CurrencyInput
              label="Amount per paycheck"
              value={payAmount}
              onChange={setPayAmount}
              placeholder="$0"
            />
          </div>

          <div className="stat">
            <h2 className="text-lg font-semibold text-green-700">
              Estimated Monthly Income
            </h2>
            <p className="text-2xl font-bold text-green-900">
              ${monthlyIncome.toFixed(2)}
            </p>
          </div>
        </div>
        <BudgetBreakdown monthlyIncome={monthlyIncome} />
      </div>
    </div>
  );
}

export default App;
