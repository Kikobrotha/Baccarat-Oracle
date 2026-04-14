export default function ConfidenceBar({ confidence }: { confidence: number }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-3">
      <div className="mb-2 flex items-center justify-between text-xs uppercase text-slate-400">
        <span>Confidence</span>
        <span>{confidence}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full bg-gradient-to-r from-cyan-500 to-violet-500" style={{ width: `${confidence}%` }} />
      </div>
    </section>
  );
}
