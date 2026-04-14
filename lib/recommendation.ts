import { calculateEV, BetEVBreakdown, BetSide } from './ev';
import { buildRemainingShoeFromUsedCards, Card, countCards } from './shoe';

export type RecommendationSide = 'Player' | 'Banker' | 'Tie';
export type RecommendationAction = 'PLAY' | 'CAUTIOUS' | 'DO NOT PLAY';

export interface RecommendationOption {
  side: RecommendationSide;
  ev: number;
  lowerBound: number;
  playable: boolean;
}

export interface RecommendationData {
  action: RecommendationAction;
  bestLean: RecommendationSide | null;
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

function toSide(side: BetSide): RecommendationSide {
  if (side === 'PLAYER') return 'Player';
  if (side === 'BANKER') return 'Banker';
  return 'Tie';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildOption(side: BetSide, ev: BetEVBreakdown, probs: { player: number; banker: number; tie: number }, n: number, z: number, minPlayableEV: number): RecommendationOption {
  const expectedValue = side === 'PLAYER' ? ev.player : side === 'BANKER' ? ev.banker : ev.tie;
  const variance = varianceForBet(side, expectedValue, probs);
  const standardError = Math.sqrt(variance / n);
  const lowerBound = expectedValue - z * standardError;

  return {
    side: toSide(side),
    ev: expectedValue,
    lowerBound,
    playable: expectedValue >= minPlayableEV && lowerBound > 0,
  };
}

function evaluateAction(
  best: RecommendationOption,
  secondBest: RecommendationOption | undefined,
  resolvedHands: number,
  config: Required<RecommendationSettings>,
): { action: RecommendationAction; confidence: number; reason: string } {
  const margin = secondBest ? best.ev - secondBest.ev : 0;
  const evStrength = clamp(best.ev / (config.minPlayableEV * 2), -1.25, 2.25);
  const lowerBoundStrength = clamp(best.lowerBound / config.minPlayableEV, -1.25, 2.25);
  const separationStrength = clamp(margin / Math.max(config.minPlayableEV, 0.0001), -1.5, 2);
  const handsStrength = clamp((resolvedHands - config.minHands) / 28, 0, 1.2);

  const score =
    evStrength * 0.42 +
    lowerBoundStrength * 0.33 +
    separationStrength * 0.17 +
    handsStrength * 0.08;

  const confidence = clamp(Math.round(50 + score * 18), 20, 96);

  if (best.ev <= 0) {
    return {
      action: 'DO NOT PLAY',
      confidence: clamp(confidence - 8, 15, 88),
      reason: 'Best statistical lean is negative EV after uncertainty adjustment.',
    };
  }

  if (score >= 0.9 && best.lowerBound >= -config.minPlayableEV * 0.1) {
    return {
      action: 'PLAY',
      confidence: clamp(confidence + 8, 35, 98),
      reason: 'Strong positive lean with supportive uncertainty-adjusted EV.',
    };
  }

  if (score >= 0.15) {
    return {
      action: 'CAUTIOUS',
      confidence: clamp(confidence, 30, 92),
      reason: 'Weak-to-moderate edge; lean is present but uncertainty remains.',
    };
  }

  return {
    action: 'DO NOT PLAY',
    confidence: clamp(confidence - 6, 20, 86),
    reason: 'No meaningful edge after accounting for uncertainty.',
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
      bestLean: null,
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
      bestLean: null,
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
  const secondBest = options[1];
  const actionEvaluation = evaluateAction(best, secondBest, resolvedHands, config);

  return {
    action: actionEvaluation.action,
    bestLean: best.side,
    reason: actionEvaluation.reason,
    confidence: actionEvaluation.confidence,
    bestEV: best.ev,
    bestLowerBound: best.lowerBound,
    probabilities,
    options,
    sampleCount: result.prediction.sampleCount,
  };
}
