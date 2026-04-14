import { Rank, RANKS } from '@/lib/types';

interface HandInputProps {
  title: string;
  cards: Rank[];
  onAdd: (rank: Rank) => void;
  onUndo: () => void;
}

export default function HandInput({ title, cards, onAdd, onUndo }: HandInputProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">{title}</h3>
      <div className="grid grid-cols-7 gap-2 sm:grid-cols-13">
        {RANKS.map((rank) => (
          <button
            key={rank}
            type="button"
            onClick={() => onAdd(rank)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 transition hover:border-cyan-400"
          >
            {rank}
          </button>
        ))}
      </div>
      <div className="mt-3 flex min-h-8 flex-wrap gap-2">
        {cards.map((card, idx) => (
          <span key={`${card}-${idx}`} className="rounded bg-slate-700 px-2 py-1 text-xs text-cyan-200">
            {card}
          </span>
        ))}
      </div>
      <button type="button" onClick={onUndo} className="mt-3 text-xs text-slate-400 underline">
        Undo last
      </button>
    </section>
  );
}
