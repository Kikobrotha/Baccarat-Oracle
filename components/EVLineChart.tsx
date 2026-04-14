interface Point {
  repeat: number;
  banker: number;
  player: number;
  tie: number;
}

function toPolyline(data: Point[], key: 'banker' | 'player' | 'tie'): string {
  if (data.length <= 1) return '0,100 100,100';
  const maxY = Math.max(...data.flatMap((d) => [d.banker, d.player, d.tie]), 1);
  const minY = Math.min(...data.flatMap((d) => [d.banker, d.player, d.tie]), -1);
  const range = maxY - minY || 1;

  return data
    .map((point, i) => {
      const x = (i / (data.length - 1)) * 100;
      const normalized = (point[key] - minY) / range;
      const y = 100 - normalized * 100;
      return `${x},${y}`;
    })
    .join(' ');
}

export default function EVLineChart({ data }: { data: Point[] }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">EV trend</h3>
      <svg viewBox="0 0 100 100" className="h-64 w-full rounded bg-slate-950 p-2">
        <polyline points={toPolyline(data, 'banker')} fill="none" stroke="#22d3ee" strokeWidth="1.2" />
        <polyline points={toPolyline(data, 'player')} fill="none" stroke="#c084fc" strokeWidth="1.2" />
        <polyline points={toPolyline(data, 'tie')} fill="none" stroke="#facc15" strokeWidth="1.2" />
      </svg>
      <div className="mt-2 flex gap-3 text-xs text-slate-400">
        <span>Banker</span>
        <span>Player</span>
        <span>Tie</span>
      </div>
    </section>
  );
}
