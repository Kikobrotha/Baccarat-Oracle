'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import CardGrid from '../components/CardGrid';
import ConfidenceMeter from '../components/ConfidenceMeter';
import { getRecommendationFromSimulation } from '../lib/recommendation';

type Card = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
type Result = 'Player' | 'Banker' | 'Tie';
type LayoutPreset =
  | 'classic'
  | 'focus-center'
  | 'wide-table'
  | 'compact'
  | 'mobile-stacked'
  | 'auto';

const layoutOptions: { value: LayoutPreset; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'classic', label: 'Classic' },
  { value: 'focus-center', label: 'Focus Center' },
  { value: 'wide-table', label: 'Wide Table' },
  { value: 'compact', label: 'Compact' },
  { value: 'mobile-stacked', label: 'Mobile Stacked' },
];

function cardTokenClass(compact: boolean) {
  return compact
    ? 'mr-1 mb-1 inline-flex px-2 py-0.5 text-xs bg-white/95 text-black rounded-md'
    : 'mr-1.5 mb-1.5 inline-flex px-2.5 py-1 text-sm bg-white/95 text-black rounded-md';
}


function useIsSmallScreen() {
  return useSyncExternalStore(
    callback => {
      if (typeof window === 'undefined') {
        return () => {};
      }

      const media = window.matchMedia('(max-width: 767px)');
      media.addEventListener('change', callback);
      return () => media.removeEventListener('change', callback);
    },
    () => (typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false),
    () => false,
  );
}

export default function Home() {
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [bankerCards, setBankerCards] = useState<Card[]>([]);

  const [results, setResults] = useState<Result[]>([]);
  const [usedCards, setUsedCards] = useState<Card[]>([]);
  const [sessionHands, setSessionHands] = useState(0);

  const [recommendation, setRecommendation] =
    useState<'Player' | 'Banker' | 'Tie' | 'DO NOT PLAY'>('DO NOT PLAY');

  const [ev, setEv] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [advisorReason, setAdvisorReason] =
    useState('Need at least 12 completed hands before betting.');

  const [skipCount, setSkipCount] = useState(0);
  const [selectedLayout, setSelectedLayout] = useState<LayoutPreset>(() => {
    if (typeof window === 'undefined') return 'classic';

    const saved = localStorage.getItem('baccarat-ui-layout') as LayoutPreset | null;
    if (saved && layoutOptions.some(option => option.value === saved)) {
      return saved;
    }

    return 'classic';
  });
  const isSmallScreen = useIsSmallScreen();

  useEffect(() => {
    localStorage.setItem('baccarat-ui-layout', selectedLayout);
  }, [selectedLayout]);

  const activeLayout = selectedLayout === 'auto'
    ? (isSmallScreen ? 'mobile-stacked' : 'classic')
    : selectedLayout;

  const isCompact = activeLayout === 'compact';

  const layoutClasses = useMemo(() => {
    switch (activeLayout) {
      case 'focus-center':
        return {
          grid: 'grid grid-cols-1 xl:grid-cols-[minmax(220px,0.7fr)_minmax(520px,1.6fr)_minmax(220px,0.7fr)] gap-4 md:gap-6 items-stretch',
          player: 'xl:order-1',
          center: 'xl:order-2',
          banker: 'xl:order-3',
          centerShell: 'ring-1 ring-yellow-300/50 shadow-2xl shadow-black/35',
        };
      case 'wide-table':
        return {
          grid: 'grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch',
          player: '',
          center: '',
          banker: '',
          centerShell: 'bg-gradient-to-b from-black/60 to-black/40 border border-white/15',
        };
      case 'compact':
        return {
          grid: 'grid grid-cols-1 lg:grid-cols-3 gap-3 items-start',
          player: '',
          center: '',
          banker: '',
          centerShell: 'border border-white/10',
        };
      case 'mobile-stacked':
        return {
          grid: 'grid grid-cols-1 gap-4 items-start max-w-xl mx-auto',
          player: 'order-2',
          center: 'order-1',
          banker: 'order-3',
          centerShell: 'ring-1 ring-yellow-300/40',
        };
      default:
        return {
          grid: 'grid grid-cols-1 xl:grid-cols-3 gap-6 items-start',
          player: '',
          center: '',
          banker: '',
          centerShell: 'border border-white/10',
        };
    }
  }, [activeLayout]);

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
    if (p === b) return 'Tie';
    return p > b ? 'Player' : 'Banker';
  }

  function handleDone() {
    if (playerCards.length === 0 || bankerCards.length === 0) return;

    const outcome = evaluateHand();
    const handCards = [...playerCards, ...bankerCards];
    const allUsedCards = [...usedCards, ...handCards];
    const totalHands = results.length + 1;

    setResults(prev => [...prev, outcome]);
    setUsedCards(allUsedCards);
    setSessionHands(prev => prev + 1);

    const recommendationData = getRecommendationFromSimulation(allUsedCards, totalHands);

    setRecommendation(recommendationData.action);
    setAdvisorReason(recommendationData.reason);
    setConfidence(recommendationData.confidence);
    setEv(Number((recommendationData.bestEV * 100).toFixed(2)));

    if (recommendationData.action === 'DO NOT PLAY') {
      setSkipCount(prev => prev + 1);
    }

    setPlayerCards([]);
    setBankerCards([]);
  }

  function resetShoe() {
    setResults([]);
    setSessionHands(0);
    setRecommendation('DO NOT PLAY');
    setConfidence(0);
    setEv(0);
    setAdvisorReason('Need at least 12 completed hands before betting.');
    setSkipCount(0);
    setPlayerCards([]);
    setBankerCards([]);
    setUsedCards([]);
  }

  const panelBase = isCompact
    ? 'rounded-xl bg-green-800/75 p-3 shadow-lg shadow-black/20 backdrop-blur-sm'
    : 'rounded-2xl bg-green-800/75 p-4 md:p-5 shadow-xl shadow-black/25 backdrop-blur-sm';

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-950 via-green-900 to-green-950 text-white p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 md:mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Baccarat Decision Assistant</h1>
            <p className="text-green-100/75 text-sm mt-1">Statistical recommendation interface</p>
          </div>

          <div className="w-full md:w-auto">
            <label htmlFor="layoutPreset" className="mb-1.5 block text-xs uppercase tracking-wide text-green-100/70">
              Layout Preset
            </label>
            <select
              id="layoutPreset"
              value={selectedLayout}
              onChange={e => setSelectedLayout(e.target.value as LayoutPreset)}
              className="w-full md:min-w-56 rounded-lg border border-white/20 bg-green-900/80 px-3 py-2 text-sm font-medium shadow-md outline-none transition focus:border-yellow-300 focus:ring-2 focus:ring-yellow-300/40"
            >
              {layoutOptions.map(option => (
                <option key={option.value} value={option.value} className="text-white bg-green-950">
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={`${layoutClasses.grid} transition-all duration-300`}>
          <section className={`${panelBase} ${layoutClasses.player} transition-all duration-300`}>
            <h2 className={`${isCompact ? 'text-lg' : 'text-xl'} font-semibold mb-3`}>Player Cards</h2>
            <CardGrid
              disabled={false}
              compact={isCompact}
              onSelect={(c: Card) => setPlayerCards(p => [...p, c])}
            />
            <div className="mt-3 text-sm min-h-8">
              {playerCards.map((c, i) => (
                <span key={i} className={cardTokenClass(isCompact)}>
                  {c}
                </span>
              ))}
            </div>
          </section>

          <section
            className={`${isCompact ? 'rounded-xl p-3' : 'rounded-2xl p-4 md:p-6'} bg-black/70 text-center shadow-2xl shadow-black/30 ${layoutClasses.center} ${layoutClasses.centerShell} transition-all duration-300`}
          >
            <div className="text-xs md:text-sm uppercase tracking-[0.18em] text-green-100/75 mb-2">Best statistical next bet</div>
            <div className="text-3xl md:text-4xl font-bold text-yellow-300 drop-shadow-sm tracking-wide">{recommendation}</div>

            {recommendation !== 'DO NOT PLAY' ? (
              <div className="text-sm mt-2 text-green-100/95">Expected value: <span className="font-semibold text-yellow-200">{ev}%</span></div>
            ) : (
              <div className="text-red-300 text-sm mt-2">🚫 {advisorReason}</div>
            )}

            <ConfidenceMeter value={confidence} compact={isCompact} />

            <button
              onClick={handleDone}
              className={`mt-5 w-full bg-yellow-300 text-black font-extrabold rounded-xl shadow-lg shadow-yellow-400/25 hover:bg-yellow-200 active:scale-[0.99] transition ${activeLayout === 'mobile-stacked' ? 'py-4 text-xl' : isCompact ? 'py-2.5 text-base' : 'py-3.5 text-lg'}`}
            >
              DONE
            </button>

            <button
              onClick={resetShoe}
              className="mt-3 text-sm text-red-200 hover:text-red-100 underline underline-offset-4 transition"
            >
              Reset Shoe
            </button>

            <div className="mt-4 pt-3 border-t border-white/10 text-[11px] md:text-xs text-green-100/80 space-y-1">
              <div>Session hands recorded: <span className="font-medium">{sessionHands}</span></div>
              <div>Skipped bad spots: <span className="font-medium">{skipCount}</span></div>
            </div>
          </section>

          <section className={`${panelBase} ${layoutClasses.banker} transition-all duration-300`}>
            <h2 className={`${isCompact ? 'text-lg' : 'text-xl'} font-semibold mb-3`}>Banker Cards</h2>
            <CardGrid
              disabled={false}
              compact={isCompact}
              onSelect={(c: Card) => setBankerCards(b => [...b, c])}
            />
            <div className="mt-3 text-sm min-h-8">
              {bankerCards.map((c, i) => (
                <span key={i} className={cardTokenClass(isCompact)}>
                  {c}
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
