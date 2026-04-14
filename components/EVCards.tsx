import { Outcome } from '@/lib/types';

export default function EVCards({ ev }: { ev: Record<Outcome, number> }) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {(Object.keys(ev) as Outcome[]).map((side) => (
        <div key={side} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
          <p className="text-xs uppercase text-slate-400">{side} EV</p>
          <p className={`text-xl font-semibold ${ev[side] >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            {(ev[side] * 100).toFixed(2)}%
          </p>
        </div>
      ))}
    </section>
  );
}
