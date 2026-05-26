"use client";

export default function HalfToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      aria-pressed={value}
      aria-label={value ? "Half-step on" : "Half-step off"}
      className={`shrink-0 h-9 w-9 rounded-lg text-sm font-bold transition-colors flex items-center justify-center ${
        value
          ? "bg-blue-500 text-white"
          : "bg-gray-100 text-gray-500 active:bg-gray-200"
      }`}
    >
      ½
    </button>
  );
}
