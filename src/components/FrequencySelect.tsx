import { FREQUENCIES } from "../types";
import type { Frequency } from "../types";

type Props = {
  value: Frequency;
  onChange: (f: Frequency) => void;
};

export default function FrequencySelect({ value, onChange }: Props) {
  return (
    <label className="label block">
      <span>How often are you paid?</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Frequency)}
        className="select"
      >
        {FREQUENCIES.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
    </label>
  );
}
