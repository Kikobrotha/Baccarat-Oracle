'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import CardGrid from '../components/CardGrid';
import ConfidenceMeter from '../components/ConfidenceMeter';
import { getRecommendationFromSimulation, RecommendationAction } from '../lib/recommendation';
import { Card } from '../lib/shoe';
import {
  cardTokenClass,
  DEFAULT_PROBABILITIES,
  DEFAULT_REASON,
  formatEV,
  formatProbability,
  getLayoutClasses,
  getSessionResultStats,
  layoutOptions,
  LayoutPreset,
  mapEvBySide,
  resolveRoundResult,
  toEvPercent,
} from '../lib/pageModel';
import { BaccaratResult } from '../lib/baccarat';

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

  const [results, setResults] = useState<BaccaratResult[]>([]);
  const [usedCards, setUsedCards] = useState<Card[]>([]);
  const [sessionHands, setSessionHands] = useState(0);

  const [recommendation, setRecommendation] = useState<RecommendationAction>('DO NOT PLAY');

  const [ev, setEv] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [advisorReason, setAdvisorReason] = useState(DEFAULT_REASON);
  const [predictionProbabilities, setPredictionProbabilities] = useState(DEFAULT_PROBABILITIES);
  const [evBySide, setEvBySide] = useState(DEFAULT_PROBABILITIES);

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

  const activeLayout =
    selectedLayout === 'auto' ? (isSmallScreen ? 'mobile-stacked' : 'classic') : selectedLayout;

  const isCompact = activeLayout === 'compact';

  const layoutClasses = useMemo(() => getLayoutClasses(activeLayout), [activeLayout]);

  function handleDone() {
    if (playerCards.length === 0 || bankerCards.length === 0) return;

    const outcome = resolveRoundResult(playerCards, bankerCards);
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
    setEv(toEvPercent(recommendationData.bestEV));
    setPredictionProbabilities(recommendationData.probabilities);
    setEvBySide(mapEvBySide(recommendationData.options));

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
    setAdvisorReason(DEFAULT_REASON);
    setSkipCount(0);
    setPlayerCards([]);
    setBankerCards([]);
    setUsedCards([]);
    setPredictionProbabilities(DEFAULT_PROBABILITIES);
    setEvBySide(DEFAULT_PROBABILITIES);
  }

  const metricRows = [
    {
      label: 'Player',
      probability: predictionProbabilities.player,
      expectedValue: evBySide.player,
      colorClass: 'text-blue-200',
    },
    {
      label: 'Banker',
      probability: predictionProbabilities.banker,
      expectedValue: evBySide.banker,
      colorClass: 'text-red-200',
    },
    {
      label: 'Tie',
      probability: predictionProbabilities.tie,
      expectedValue: evBySide.tie,
      colorClass: 'text-purple-200',
    },
  ];

  const sessionResultStats = useMemo(() => getSessionResultStats(results), [results]);

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
            <CardGrid disabled={false} compact={isCompact} onSelect={(c: Card) => setPlayerCards(p => [...p, c])} />
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

            <div className="mt-4 rounded-xl border border-white/15 bg-green-950/45 p-3 text-left">
              <div className="mb-2 text-[11px] md:text-xs uppercase tracking-[0.14em] text-green-100/75">
                Probabilities & EV (next hand)
              </div>
              <div className="space-y-1.5">
                {metricRows.map(row => (
                  <div
                    key={row.label}
                    className="grid grid-cols-[1.1fr_1fr_1fr] items-center rounded-md bg-black/25 px-2.5 py-2 text-xs md:text-sm"
                  >
                    <span className={`font-semibold ${row.colorClass}`}>{row.label}</span>
                    <span className="text-green-100/90">P: {formatProbability(row.probability)}</span>
                    <span className="text-yellow-100">EV: {formatEV(row.expectedValue)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[11px] md:text-xs text-green-100/70">
                Recommendation focus: <span className="font-semibold text-yellow-200">{recommendation}</span>
              </div>
            </div>

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
              <div>Player results: <span className="font-medium">{sessionResultStats.player}</span></div>
              <div>Banker results: <span className="font-medium">{sessionResultStats.banker}</span></div>
              <div>Tie results: <span className="font-medium">{sessionResultStats.tie}</span></div>
              <div>Skipped bad spots: <span className="font-medium">{skipCount}</span></div>
            </div>
          </section>

          <section className={`${panelBase} ${layoutClasses.banker} transition-all duration-300`}>
            <h2 className={`${isCompact ? 'text-lg' : 'text-xl'} font-semibold mb-3`}>Banker Cards</h2>
            <CardGrid disabled={false} compact={isCompact} onSelect={(c: Card) => setBankerCards(b => [...b, c])} />
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
