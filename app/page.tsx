'use client';

import { useEffect, useMemo, useState } from 'react';
import ConfidenceBar from '@/components/ConfidenceBar';
import EVCards from '@/components/EVCards';
import EVLineChart from '@/components/EVLineChart';
import HandInput from '@/components/HandInput';
import HistoryPanel from '@/components/HistoryPanel';
import LogsViewer from '@/components/LogsViewer';
import RecommendationCard from '@/components/RecommendationCard';
import ShoeEditor from '@/components/ShoeEditor';
import { createDefaultShoe, handTotal } from '@/lib/baccarat';
import { GameMode, Outcome, PredictionResult, Rank, ShoeState, WindsurfResponse } from '@/lib/types';

const STORAGE_KEY = 'baccarat-oracle-state';

interface LocalState {
  history: Outcome[];
  shoe: ShoeState;
  mode: GameMode;
}

const EMPTY_EV = { Banker: 0, Player: 0, Tie: 0 };

export default function Home() {
  const [playerCards, setPlayerCards] = useState<Rank[]>(['4', '6']);
  const [bankerCards, setBankerCards] = useState<Rank[]>(['5', '7']);
  const [history, setHistory] = useState<Outcome[]>(['Banker', 'Player', 'Banker']);
  const [shoe, setShoe] = useState<ShoeState>(createDefaultShoe(8));
  const [mode, setMode] = useState<GameMode>('standard');

  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [windsurfing, setWindsurfing] = useState(false);
  const [windsurf, setWindsurf] = useState<WindsurfResponse | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as LocalState;
        setHistory(parsed.history ?? []);
        setShoe(parsed.shoe ?? createDefaultShoe(8));
        setMode(parsed.mode ?? 'standard');
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    const payload: LocalState = { history, shoe, mode };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [history, shoe, mode]);

  const currentOutcome = useMemo<Outcome>(() => {
    const p = handTotal(playerCards);
    const b = handTotal(bankerCards);
    if (p > b) return 'Player';
    if (b > p) return 'Banker';
    return 'Tie';
  }, [playerCards, bankerCards]);

  async function predictNow() {
    setPredicting(true);
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, shoe, mode, iterations: 7000 }),
      });
      const json = (await res.json()) as PredictionResult;
      setPrediction(json);
    } finally {
      setPredicting(false);
    }
  }

  async function runWindsurf() {
    setWindsurfing(true);
    try {
      const res = await fetch('/api/windsurf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, shoe, mode, repeats: 60, iterationsPerRepeat: 1800 }),
      });
      const json = (await res.json()) as WindsurfResponse;
      setWindsurf(json);
    } finally {
      setWindsurfing(false);
    }
  }

  function adjustShoe(rank: Rank, value: number) {
    setShoe((prev) => ({ ...prev, [rank]: Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0 }));
  }

  function recordHand() {
    setHistory((prev) => [...prev, currentOutcome]);
    setPlayerCards([]);
    setBankerCards([]);
  }

  const chartData = windsurf?.repeats.map((row) => ({
    repeat: row.repeat,
    banker: Number((row.ev.Banker * 100).toFixed(2)),
    player: Number((row.ev.Player * 100).toFixed(2)),
    tie: Number((row.ev.Tie * 100).toFixed(2)),
  })) ?? [{ repeat: 0, banker: 0, player: 0, tie: 0 }];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div>
            <h1 className="text-2xl font-semibold">Baccarat Oracle · Predictor + Windsurf</h1>
            <p className="text-sm text-slate-400">Full-stack Next.js App Router implementation, tuned for Vercel deployment.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('standard')}
              className={`rounded px-3 py-2 text-xs ${mode === 'standard' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800'}`}
            >
              Standard
            </button>
            <button
              type="button"
              onClick={() => setMode('no_commission')}
              className={`rounded px-3 py-2 text-xs ${mode === 'no_commission' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800'}`}
            >
              No Commission
            </button>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="grid gap-4 md:grid-cols-2">
              <HandInput title="Player cards" cards={playerCards} onAdd={(r) => setPlayerCards((p) => [...p, r])} onUndo={() => setPlayerCards((p) => p.slice(0, -1))} />
              <HandInput title="Banker cards" cards={bankerCards} onAdd={(r) => setBankerCards((p) => [...p, r])} onUndo={() => setBankerCards((p) => p.slice(0, -1))} />
            </div>

            <ShoeEditor shoe={shoe} onChange={adjustShoe} onReset={() => setShoe(createDefaultShoe(8))} />
            <EVLineChart data={chartData} />
            <LogsViewer logs={windsurf?.logs ?? []} />
          </div>

          <div className="space-y-4">
            <RecommendationCard recommendation={prediction?.recommendation ?? 'Banker'} />
            <EVCards ev={prediction?.ev ?? EMPTY_EV} />
            <ConfidenceBar confidence={prediction?.confidence ?? 0} />
            <HistoryPanel history={history} onClear={() => setHistory([])} />

            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-sm text-slate-300">Current hand eval: <span className="font-semibold text-cyan-300">{currentOutcome}</span></p>
              <div className="mt-3 grid gap-2">
                <button type="button" onClick={recordHand} className="rounded bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700">
                  Record hand to history
                </button>
                <button type="button" onClick={predictNow} disabled={predicting} className="rounded bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60">
                  {predicting ? 'Predicting...' : 'Run predictor'}
                </button>
                <button type="button" onClick={runWindsurf} disabled={windsurfing} className="rounded bg-violet-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {windsurfing ? 'Windsurf running...' : 'Run windsurf mode'}
                </button>
              </div>
              {windsurf?.progress.at(-1) && (
                <p className="mt-3 text-xs text-slate-400">
                  Progress: {windsurf.progress.at(-1)?.progress}% · Best: {windsurf.bestRecommendation}
                </p>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
