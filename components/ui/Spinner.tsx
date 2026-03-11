export default function Spinner({ size = "sm", color = "white" }: {
  size?: "sm" | "md" | "lg";
  color?: "white" | "indigo" | "red" | "yellow";
}) {
  const sizes = { sm: "w-3 h-3", md: "w-4 h-4", lg: "w-5 h-5" };
  const colors = {
    white: "border-white/30 border-t-white",
    indigo: "border-indigo-500 border-t-transparent",
    red: "border-red-400/30 border-t-red-400",
    yellow: "border-yellow-500 border-t-transparent",
  };

  return (
    <span className={`block ${sizes[size]} border-2 ${colors[color]} rounded-full animate-spin`} />
  );
}
