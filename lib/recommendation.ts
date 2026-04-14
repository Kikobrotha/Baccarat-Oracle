import { calculateEV, BetEVBreakdown, BetSide } from './ev';
import { buildRemainingShoeFromUsedCards, Card, countCards } from './shoe';

export type RecommendationAction = 'Player' | 'Banker' | 'Tie' | 'DO NOT PLAY';

export interface RecommendationOption {
  side: RecommendationAction;
  ev: number;
  lowerBound: number;
  playable: boolean;
}

export interface RecommendationData {
  action: RecommendationAction;
  reason: string;
  confidence: number;
  bestEV: number;
  bestLowerBound: number;
  probabilities: {
    player: number;
    banker: number;
    tie: number;
  };
  options: RecommendationOption[];
  sampleCount: number;
}

export interface RecommendationSettings {
  minHands?: number;
  simulationIterations?: number;
  confidenceZScore?: number;
  minPlayableEV?: number;
}

const DEFAULT_SETTINGS: Required<RecommendationSettings> = {
  minHands: 12,
  simulationIterations: 30_000,
  confidenceZScore: 1.96,
  minPlayableEV: 0.002,
};

function normalizeSettings(settings?: RecommendationSettings): Required<RecommendationSettings> {
  return {
    minHands: settings?.minHands ?? DEFAULT_SETTINGS.minHands,
    simulationIterations: settings?.simulationIterations ?? DEFAULT_SETTINGS.simulationIterations,
    confidenceZScore: settings?.confidenceZScore ?? DEFAULT_SETTINGS.confidenceZScore,
    minPlayableEV: settings?.minPlayableEV ?? DEFAULT_SETTINGS.minPlayableEV,
  };
}

function varianceForBet(side: BetSide, ev: number, probs: { player: number; banker: number; tie: number }): number {
  if (side === 'PLAYER') {
    const e2 = probs.player + probs.banker;
    return Math.max(0, e2 - ev * ev);
  }

  if (side === 'BANKER') {
    const e2 = probs.player + probs.banker * 0.95 * 0.95;
    return Math.max(0, e2 - ev * ev);
  }

  const e2 = probs.tie * 64 + (probs.player + probs.banker);
  return Math.max(0, e2 - ev * ev);
}

function toAction(side: BetSide): RecommendationAction {
  if (side === 'PLAYER') return 'Player';
  if (side === 'BANKER') return 'Banker';
  return 'Tie';
}

function buildOption(side: BetSide, ev: BetEVBreakdown, probs: { player: number; banker: number; tie: number }, n: number, z: number, minPlayableEV: number): RecommendationOption {
  const expectedValue = side === 'PLAYER' ? ev.player : side === 'BANKER' ? ev.banker : ev.tie;
  const variance = varianceForBet(side, expectedValue, probs);
  const standardError = Math.sqrt(variance / n);
  const lowerBound = expectedValue - z * standardError;

  return {
    side: toAction(side),
    ev: expectedValue,
    lowerBound,
    playable: expectedValue >= minPlayableEV && lowerBound > 0,
  };
}

export function getRecommendationFromSimulation(
  usedCards: Card[],
  resolvedHands: number,
  settings?: RecommendationSettings,
): RecommendationData {
  const config = normalizeSettings(settings);

  if (resolvedHands < config.minHands) {
    return {
      action: 'DO NOT PLAY',
      reason: `Need at least ${config.minHands} completed hands before betting.`,
      confidence: 0,
      bestEV: 0,
      bestLowerBound: 0,
      probabilities: { player: 0, banker: 0, tie: 0 },
      options: [],
      sampleCount: 0,
    };
  }

  const remainingShoe = buildRemainingShoeFromUsedCards(usedCards, 8, { strict: false });

  if (countCards(remainingShoe) < 6) {
    return {
      action: 'DO NOT PLAY',
      reason: 'Shoe is too depleted to produce a reliable simulation.',
      confidence: 0,
      bestEV: 0,
      bestLowerBound: 0,
      probabilities: { player: 0, banker: 0, tie: 0 },
      options: [],
      sampleCount: 0,
    };
  }

  const result = calculateEV(remainingShoe, { iterations: config.simulationIterations });

  const probabilities = {
    player: result.prediction.playerProbability,
    banker: result.prediction.bankerProbability,
    tie: result.prediction.tieProbability,
  };

  const options = [
    buildOption('PLAYER', result.ev, probabilities, result.prediction.sampleCount, config.confidenceZScore, config.minPlayableEV),
    buildOption('BANKER', result.ev, probabilities, result.prediction.sampleCount, config.confidenceZScore, config.minPlayableEV),
    buildOption('TIE', result.ev, probabilities, result.prediction.sampleCount, config.confidenceZScore, config.minPlayableEV),
  ].sort((a, b) => b.ev - a.ev);

  const best = options[0];

  if (!best.playable) {
    return {
      action: 'DO NOT PLAY',
      reason: 'No bet has enough EV after simulation uncertainty adjustment.',
      confidence: Math.max(5, Math.min(70, Math.round((best.ev / config.minPlayableEV) * 40))),
      bestEV: best.ev,
      bestLowerBound: best.lowerBound,
      probabilities,
      options,
      sampleCount: result.prediction.sampleCount,
    };
  }

  const confidence = Math.max(
    35,
    Math.min(99, Math.round(((best.lowerBound / Math.max(best.ev, 0.0001)) * 100 + Math.min(best.ev * 200, 25)))),
  );

  return {
    action: best.side,
    reason: 'Best EV with a positive uncertainty-adjusted lower bound.',
    confidence,
    bestEV: best.ev,
    bestLowerBound: best.lowerBound,
    probabilities,
    options,
    sampleCount: result.prediction.sampleCount,
  };
}
