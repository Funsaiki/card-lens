export default function ProgressBar({ percent, size = "sm", gradient = "indigo-violet", animate }: {
  percent: number;
  size?: "sm" | "md";
  gradient?: "indigo-violet" | "indigo-green";
  animate?: boolean;
}) {
  const heights = { sm: "h-1", md: "h-1.5" };
  const gradients = {
    "indigo-violet": "from-indigo-500 to-violet-500",
    "indigo-green": "from-indigo-500 to-green-500",
  };

  return (
    <div className={`w-full bg-white/[0.06] rounded-full ${heights[size]}`}>
      <div
        className={`bg-gradient-to-r ${gradients[gradient]} ${heights[size]} rounded-full transition-all duration-200 ${animate ? "animate-grow-width" : ""}`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}
