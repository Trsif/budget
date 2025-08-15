import { useMemo } from "react";

type Props = {
  monthlyIncome: number;
};

export default function BudgetBreakdown({ monthlyIncome }: Props) {
  const { needs, wants, savings } = useMemo(() => {
    return {
      needs: monthlyIncome * 0.5,
      wants: monthlyIncome * 0.3,
      savings: monthlyIncome * 0.2,
    };
  }, [monthlyIncome]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Math.max(0, Number.isFinite(n) ? n : 0));

  return (
    <div className="card section">
      <h2 className="text-lg font-semibold">50/30/20 Breakdown</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="stat">
          <div className="font-medium text-gray-600">Needs 50%</div>
          <div className="text-xl font-bold">{fmt(needs)}</div>
        </div>

        <div className="stat">
          <div className="font-medium text-gray-600">Wants 30%</div>
          <div className="text-xl font-bold">{fmt(wants)}</div>
        </div>

        <div className="stat">
          <div className="font-medium text-gray-600">Savings/Debt 20%</div>
          <div className="text-xl font-bold">{fmt(savings)}</div>
        </div>
      </div>
    </div>
  );
}
