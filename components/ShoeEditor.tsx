import { Rank, RANKS, ShoeState } from '@/lib/types';

interface ShoeEditorProps {
  shoe: ShoeState;
  onChange: (rank: Rank, value: number) => void;
  onReset: () => void;
}

export default function ShoeEditor({ shoe, onChange, onReset }: ShoeEditorProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Shoe editor</h3>
        <button type="button" onClick={onReset} className="text-xs text-cyan-300 underline">
          Reset to 8 decks
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {RANKS.map((rank) => (
          <label key={rank} className="rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs">
            <span className="mb-1 block text-slate-400">{rank}</span>
            <input
              type="number"
              min={0}
              value={shoe[rank]}
              onChange={(e) => onChange(rank, Number(e.target.value))}
              className="w-full rounded bg-slate-800 px-2 py-1 text-slate-100 outline-none ring-cyan-400 focus:ring"
            />
          </label>
        ))}
      </div>
    </section>
  );
}
