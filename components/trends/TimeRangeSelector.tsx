"use client";

const OPTIONS = [
  { value: 7, label: "7d" },
  { value: 30, label: "30d" },
  { value: 90, label: "90d" },
  { value: 0, label: "All" },
] as const;

export default function TimeRangeSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (days: number) => void;
}) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${
            value === opt.value
              ? "bg-blue-500 text-white shadow-sm"
              : "text-gray-600"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
