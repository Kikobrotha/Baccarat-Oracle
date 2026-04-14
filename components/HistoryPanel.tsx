import { Outcome } from '@/lib/types';

export default function HistoryPanel({ history, onClear }: { history: Outcome[]; onClear: () => void }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">History</h3>
        <button type="button" onClick={onClear} className="text-xs text-rose-300 underline">
          Clear
        </button>
      </div>
      <div className="max-h-40 space-y-1 overflow-auto pr-1 text-xs">
        {history.length === 0 && <p className="text-slate-500">No recorded hands yet.</p>}
        {history.map((outcome, i) => (
          <p key={`${outcome}-${i}`} className="text-slate-300">
            #{i + 1} — {outcome}
          </p>
        ))}
      </div>
    </section>
  );
}
