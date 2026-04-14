export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

export type Rank = (typeof RANKS)[number];
export type Outcome = 'Banker' | 'Player' | 'Tie';
export type GameMode = 'standard' | 'no_commission';

export type ShoeState = Record<Rank, number>;

export interface PredictRequest {
  history: Outcome[];
  shoe: ShoeState;
  mode: GameMode;
  iterations?: number;
}

export interface PredictionResult {
  recommendation: Outcome;
  confidence: number;
  ev: Record<Outcome, number>;
  probabilities: Record<Outcome, number>;
  sampleSize: number;
  notes: string[];
}

export interface WindsurfRequest extends PredictRequest {
  repeats: number;
  iterationsPerRepeat: number;
  batchSize?: number;
}

export interface WindsurfRepeatResult {
  repeat: number;
  recommendation: Outcome;
  ev: Record<Outcome, number>;
  confidence: number;
}

export interface WindsurfProgressPoint {
  progress: number;
  repeat: number;
  bestRecommendation: Outcome;
  bestEV: number;
}

export interface WindsurfResponse {
  repeats: WindsurfRepeatResult[];
  progress: WindsurfProgressPoint[];
  logs: string[];
  bestRecommendation: Outcome;
  meanEV: Record<Outcome, number>;
}
