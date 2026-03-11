export default function SegmentedControl<T extends string>({ options, value, onChange, columns = 2 }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  columns?: number;
}) {
  return (
    <div className={`grid gap-1`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2 py-1.5 text-[10px] rounded-md border transition-all ${
            value === opt.value
              ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-300 font-medium"
              : "border-white/[0.06] text-zinc-500 hover:text-zinc-300 hover:border-white/[0.12]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
