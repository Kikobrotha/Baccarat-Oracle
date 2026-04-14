import Image from 'next/image';
import { Outcome } from '@/lib/types';

const ICONS: Record<Outcome, string> = {
  Banker: '/svg/banker.svg',
  Player: '/svg/player.svg',
  Tie: '/svg/tie.svg',
};

export default function RecommendationCard({ recommendation }: { recommendation: Outcome }) {
  return (
    <section className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 to-slate-950 p-4">
      <h3 className="text-xs uppercase tracking-widest text-slate-400">Recommendation</h3>
      <div className="mt-2 flex items-center gap-3">
        <Image src={ICONS[recommendation]} alt={recommendation} width={42} height={42} />
        <p className="text-2xl font-semibold text-cyan-200">{recommendation}</p>
      </div>
    </section>
  );
}
