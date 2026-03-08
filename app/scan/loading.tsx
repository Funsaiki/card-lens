export default function ScanLoading() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-zinc-950 gap-4">
      <span className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-zinc-400 text-sm">Loading scanner...</p>
    </div>
  );
}
