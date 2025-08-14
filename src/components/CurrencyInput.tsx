import { useMemo, useState } from "react";

type Props = {
  label?: string;
  value: number;
  onChange: (n: number) => void;
  placeholder?: string;
  classNameOverride?: string;
};

export default function CurrencyInput({
  label = "Amount",
  value,
  onChange,
  placeholder = "$0.00",
  classNameOverride,
}: Props) {
  const [text, setText] = useState(value ? String(value) : "");
  const fmt = useMemo(
    () =>
      new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
    []
  );
  const parseCurrency = (s: string) => {
    const cleaned = s.replace(/[^\d.]/g, "");
    const [int = "", frac = ""] = cleaned.split(".");
    const repaired = frac ? `${int}.${frac.slice(0, 2)}` : int;
    const n = parseFloat(repaired);
    return Number.isFinite(n) ? n : 0;
  };
  const handleChange = (s: string) => {
    setText(s);
    onChange(parseCurrency(s));
  };
  const handleBlur = () =>
    setText(text.trim() ? fmt.format(parseCurrency(text)) : "");
  const handleFocus = () => setText(value ? String(value) : "");
  return (
    <label className="label block">
      <span className="font-medium text-gray-700">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        onFocus={handleFocus}
        className={classNameOverride ?? "input"}
      />
    </label>
  );
}
