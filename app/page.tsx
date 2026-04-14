'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import CardGrid from '../components/CardGrid';
import ConfidenceMeter from '../components/ConfidenceMeter';
import { Card } from '../lib/shoe';
import { estimateNextHand, BettingMode } from '../lib/baccaratPrediction';

type Result = 'Player' | 'Banker' | 'Tie';
type LayoutPreset = 'classic' | 'focus-center' | 'wide-table' | 'compact' | 'mobile-stacked' | 'auto';

const layoutOptions: { value: LayoutPreset; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'classic', label: 'Classic' },
  { value: 'focus-center', label: 'Focus Center' },
  { value: 'wide-table', label: 'Wide Table' },
  { value: 'compact', label: 'Compact' },
  { value: 'mobile-stacked', label: 'Mobile Stacked' },
];

function useIsSmallScreen() {
  return useSyncExternalStore(
    callback => {
      if (typeof window === 'undefined') return () => {};
      const media = window.matchMedia('(max-width: 767px)');
      media.addEventListener('change', callback);
      return () => media.removeEventListener('change', callback);
    },
    () => (typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false),
    () => false,
  );
}

function cardTokenClass(compact: boolean) {
  return compact
    ? 'mr-1 mb-1 inline-flex px-2 py-0.5 text-xs bg-white/95 text-black rounded-md'
    : 'mr-1.5 mb-1.5 inline-flex px-2.5 py-1 text-sm bg-white/95 text-black rounded-md';
}

function formatPct(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatEv(value: number) {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
}

export default function Home() {
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [bankerCards, setBankerCards] = useState<Card[]>([]);
  const [seenCards, setSeenCards] = useState<Card[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [sessionHands, setSessionHands] = useState(0);
  const [skipCount, setSkipCount] = useState(0);
  const [mode, setMode] = useState<BettingMode>('standard');
  const [selectedLayout, setSelectedLayout] = useState<LayoutPreset>(() => {
    if (typeof window === 'undefined') return 'classic';
    const saved = localStorage.getItem('baccarat-ui-layout') as LayoutPreset | null;
    if (saved && layoutOptions.some(option => option.value === saved)) return saved;
    return 'classic';
  });

  const isSmallScreen = useIsSmallScreen();

  useEffect(() => {
    localStorage.setItem('baccarat-ui-layout', selectedLayout);
  }, [selectedLayout]);

  const activeLayout: Exclude<LayoutPreset, 'auto'> = selectedLayout === 'auto'
    ? (isSmallScreen ? 'mobile-stacked' : 'classic')
    : selectedLayout;
  const isCompact = activeLayout === 'compact';

  const layoutClasses = useMemo(() => {
    if (activeLayout === 'focus-center') {
      return {
        grid: 'grid grid-cols-1 xl:grid-cols-[minmax(220px,0.7fr)_minmax(540px,1.7fr)_minmax(220px,0.7fr)] gap-5 items-stretch',
        player: '',
        center: '',
        banker: '',
      };
    }

    if (activeLayout === 'wide-table') {
      return {
        grid: 'grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch',
        player: '',
        center: '',
        banker: '',
      };
    }

    if (activeLayout === 'mobile-stacked') {
      return {
        grid: 'grid grid-cols-1 gap-4 max-w-xl mx-auto',
        player: 'order-2',
        center: 'order-1',
        banker: 'order-3',
      };
    }

    return {
      grid: 'grid grid-cols-1 xl:grid-cols-3 gap-6 items-start',
      player: '',
      center: '',
      banker: '',
    };
  }, [activeLayout]);

  const prediction = useMemo(
    () => estimateNextHand(seenCards, {
      mode,
      iterations: 12000,
      tiePayout: 8,
      bankerPayout: 0.95,
      minPlayableEv: 0.005,
    }),
    [seenCards, mode],
  );

  const recommendation = prediction.recommendation;
  const advisorReason = prediction.reason;
  const confidence = Math.min(100, Math.round(Math.max(prediction.ev.Player, prediction.ev.Banker, prediction.ev.Tie, 0) * 1000));

  function baccaratValue(card: Card) {
    if (card === 'A') return 1;
    if (['10', 'J', 'Q', 'K'].includes(card)) return 0;
    return parseInt(card, 10);
  }

  function handTotal(cards: Card[]) {
    return cards.reduce((sum, c) => sum + baccaratValue(c), 0) % 10;
  }

  function evaluateHand(): Result {
    const p = handTotal(playerCards);
    const b = handTotal(bankerCards);
    if (p > b) return 'Player';
    if (b > p) return 'Banker';
    return 'Tie';
  }

  function handleDone() {
    if (playerCards.length === 0 || bankerCards.length === 0) return;

    const outcome = evaluateHand();
    setResults(prev => [...prev, outcome]);
    setSessionHands(prev => prev + 1);
    setSeenCards(prev => [...prev, ...playerCards, ...bankerCards]);

    if (recommendation === 'DO NOT PLAY') {
      setSkipCount(prev => prev + 1);
    }

    setPlayerCards([]);
    setBankerCards([]);
  }

  function resetShoe() {
    setResults([]);
    setSeenCards([]);
    setSessionHands(0);
    setSkipCount(0);
    setPlayerCards([]);
    setBankerCards([]);
  }

  const panelBase = isCompact
    ? 'rounded-xl bg-green-800/75 p-3 shadow-lg shadow-black/20 backdrop-blur-sm'
    : 'rounded-2xl bg-green-800/75 p-4 md:p-5 shadow-xl shadow-black/25 backdrop-blur-sm';

  const playerWins = results.filter(r => r === 'Player').length;
  const bankerWins = results.filter(r => r === 'Banker').length;
  const ties = results.filter(r => r === 'Tie').length;

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-950 via-green-900 to-green-950 text-white p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 md:mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Baccarat Decision Assistant</h1>
            <p className="text-green-100/75 text-sm mt-1">Composition-based next-hand estimator with Tie support</p>
          </div>

          <div className="w-full md:w-auto grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="layoutPreset" className="mb-1.5 block text-xs uppercase tracking-wide text-green-100/70">Layout Preset</label>
              <select
                id="layoutPreset"
                value={selectedLayout}
                onChange={e => setSelectedLayout(e.target.value as LayoutPreset)}
                className="w-full md:min-w-56 rounded-lg border border-white/20 bg-green-900/80 px-3 py-2 text-sm font-medium shadow-md outline-none"
              >
                {layoutOptions.map(option => (
                  <option key={option.value} value={option.value} className="text-white bg-green-950">{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="bankerMode" className="mb-1.5 block text-xs uppercase tracking-wide text-green-100/70">Banker Mode</label>
              <select
                id="bankerMode"
                value={mode}
                onChange={e => setMode(e.target.value as BettingMode)}
                className="w-full md:min-w-56 rounded-lg border border-white/20 bg-green-900/80 px-3 py-2 text-sm font-medium shadow-md outline-none"
              >
                <option value="standard">Standard (5% commission)</option>
                <option value="no-commission">No Commission (Banker 6 pays 0.5)</option>
              </select>
            </div>
          </div>
        </div>

        <div className={`${layoutClasses.grid} transition-all duration-300`}>
          <section className={`${panelBase} ${layoutClasses.player}`}>
            <h2 className={`${isCompact ? 'text-lg' : 'text-xl'} font-semibold mb-3`}>Player Cards</h2>
            <CardGrid disabled={false} compact={isCompact} onSelect={(c: Card) => setPlayerCards(p => [...p, c])} />
            <div className="mt-3 text-sm min-h-8">
              {playerCards.map((c, i) => (
                <span key={`${c}-${i}`} className={cardTokenClass(isCompact)}>{c}</span>
              ))}
            </div>
          </section>

          <section className={`rounded-2xl p-4 md:p-6 bg-black/70 text-center shadow-2xl shadow-black/30 ${layoutClasses.center}`}>
            <div className="text-xs md:text-sm uppercase tracking-[0.18em] text-green-100/75 mb-2">Best statistical next bet</div>
            <div className="text-3xl md:text-4xl font-bold text-yellow-300 tracking-wide">{recommendation}</div>

            <div className="mt-3 text-left rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 items-center">
                <div className="font-medium text-green-100">Player</div>
                <div className="text-green-200">{formatPct(prediction.probabilities.Player)}</div>
                <div className={`${prediction.ev.Player >= 0 ? 'text-lime-300' : 'text-rose-300'}`}>{formatEv(prediction.ev.Player)}</div>

                <div className="font-medium text-green-100">Banker</div>
                <div className="text-green-200">{formatPct(prediction.probabilities.Banker)}</div>
                <div className={`${prediction.ev.Banker >= 0 ? 'text-lime-300' : 'text-rose-300'}`}>{formatEv(prediction.ev.Banker)}</div>

                <div className="font-medium text-green-100">Tie</div>
                <div className="text-green-200">{formatPct(prediction.probabilities.Tie)}</div>
                <div className={`${prediction.ev.Tie >= 0 ? 'text-lime-300' : 'text-rose-300'}`}>{formatEv(prediction.ev.Tie)}</div>
              </div>
            </div>

            <div className={`${recommendation === 'DO NOT PLAY' ? 'text-red-300' : 'text-green-100'} text-sm mt-3`}>
              {recommendation === 'DO NOT PLAY' ? '🚫 ' : ''}{advisorReason}
            </div>

            <ConfidenceMeter value={confidence} compact={isCompact} />

            <button
              onClick={handleDone}
              className={`mt-5 w-full bg-yellow-300 text-black font-extrabold rounded-xl shadow-lg hover:bg-yellow-200 transition ${activeLayout === 'mobile-stacked' ? 'py-4 text-xl' : isCompact ? 'py-2.5 text-base' : 'py-3.5 text-lg'}`}
            >
              DONE
            </button>

            <button onClick={resetShoe} className="mt-3 text-sm text-red-200 hover:text-red-100 underline underline-offset-4 transition">
              Reset Shoe
            </button>

            <div className="mt-4 pt-3 border-t border-white/10 text-[11px] md:text-xs text-green-100/80 space-y-1">
              <div>Session hands recorded: <span className="font-medium">{sessionHands}</span></div>
              <div>P/B/T Results: <span className="font-medium">{playerWins}/{bankerWins}/{ties}</span></div>
              <div>Skipped bad spots: <span className="font-medium">{skipCount}</span></div>
            </div>
          </section>

          <section className={`${panelBase} ${layoutClasses.banker}`}>
            <h2 className={`${isCompact ? 'text-lg' : 'text-xl'} font-semibold mb-3`}>Banker Cards</h2>
            <CardGrid disabled={false} compact={isCompact} onSelect={(c: Card) => setBankerCards(b => [...b, c])} />
            <div className="mt-3 text-sm min-h-8">
              {bankerCards.map((c, i) => (
                <span key={`${c}-${i}`} className={cardTokenClass(isCompact)}>{c}</span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
