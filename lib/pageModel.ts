import { RecommendationAction, RecommendationData, RecommendationOption, RecommendationSide } from './recommendation';
import { BaccaratResult, resolveHandResult } from './baccarat';
import { Card } from './shoe';

export type LayoutPreset =
  | 'classic'
  | 'focus-center'
  | 'wide-table'
  | 'compact'
  | 'mobile-stacked'
  | 'auto';

export interface LayoutOption {
  value: LayoutPreset;
  label: string;
}

export interface ProbabilitiesBySide {
  player: number;
  banker: number;
  tie: number;
}

export interface SessionResultStats {
  player: number;
  banker: number;
  tie: number;
}

export const DEFAULT_REASON = 'Need at least 12 completed hands before betting.';
export const DEFAULT_LEAN_LABEL = 'Waiting for threshold';
export const DEFAULT_ACTION: RecommendationAction = 'DO NOT PLAY';

export const DEFAULT_PROBABILITIES: ProbabilitiesBySide = {
  player: 0,
  banker: 0,
  tie: 0,
};

export const layoutOptions: LayoutOption[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'classic', label: 'Classic' },
  { value: 'focus-center', label: 'Focus Center' },
  { value: 'wide-table', label: 'Wide Table' },
  { value: 'compact', label: 'Compact' },
  { value: 'mobile-stacked', label: 'Mobile Stacked' },
];

export function resolveRoundResult(playerCards: Card[], bankerCards: Card[]): BaccaratResult {
  return resolveHandResult(playerCards, bankerCards);
}

export function toEvPercent(value: number): number {
  return Number((value * 100).toFixed(2));
}

export function mapEvBySide(options: RecommendationOption[]): ProbabilitiesBySide {
  return options.reduce<ProbabilitiesBySide>(
    (acc, option) => {
      if (option.side === 'Player') acc.player = toEvPercent(option.ev);
      if (option.side === 'Banker') acc.banker = toEvPercent(option.ev);
      if (option.side === 'Tie') acc.tie = toEvPercent(option.ev);
      return acc;
    },
    { ...DEFAULT_PROBABILITIES },
  );
}

export function getSessionResultStats(results: BaccaratResult[]): SessionResultStats {
  return results.reduce<SessionResultStats>(
    (acc, result) => {
      if (result === 'Player') acc.player += 1;
      if (result === 'Banker') acc.banker += 1;
      if (result === 'Tie') acc.tie += 1;
      return acc;
    },
    { ...DEFAULT_PROBABILITIES },
  );
}

export function formatProbability(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function formatEV(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function formatLean(bestLean: RecommendationSide | null): string {
  return bestLean ?? DEFAULT_LEAN_LABEL;
}

export function toPredictionState(recommendationData: RecommendationData) {
  return {
    action: recommendationData.action,
    bestLean: formatLean(recommendationData.bestLean),
    advisorReason: recommendationData.reason,
    confidence: recommendationData.confidence,
    ev: toEvPercent(recommendationData.bestEV),
    predictionProbabilities: recommendationData.probabilities,
    evBySide: mapEvBySide(recommendationData.options),
  };
}

export function cardTokenClass(compact: boolean): string {
  return compact
    ? 'mr-1 mb-1 inline-flex px-2 py-0.5 text-xs bg-white/95 text-black rounded-md'
    : 'mr-1.5 mb-1.5 inline-flex px-2.5 py-1 text-sm bg-white/95 text-black rounded-md';
}

export function getLayoutClasses(activeLayout: Exclude<LayoutPreset, 'auto'>) {
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
}
