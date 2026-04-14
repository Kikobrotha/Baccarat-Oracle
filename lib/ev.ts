import { BaccaratPrediction, estimateNextHandProbabilities } from './baccaratEngine';
import { Shoe } from './shoe';

export type BetSide = 'PLAYER' | 'BANKER' | 'TIE';
export type BetAction = BetSide | 'SKIP';

export type BankerPayoutMode = 'commission' | 'no-commission';

export interface BetEVConfig {
  bankerPayoutMode?: BankerPayoutMode;
  tiePayout?: number;
}

export interface BetEVBreakdown {
  player: number;
  banker: number;
  tie: number;
}

export interface EVCalculationResult {
  ev: BetEVBreakdown;
  best: {
    side: BetAction;
    ev: number;
  };
  prediction: BaccaratPrediction;
  settings: Required<BetEVConfig>;
}

const DEFAULT_EV_CONFIG: Required<BetEVConfig> = {
  bankerPayoutMode: 'commission',
  tiePayout: 8,
};

function resolveEVConfig(config?: BetEVConfig): Required<BetEVConfig> {
  return {
    bankerPayoutMode: config?.bankerPayoutMode ?? DEFAULT_EV_CONFIG.bankerPayoutMode,
    tiePayout: config?.tiePayout ?? DEFAULT_EV_CONFIG.tiePayout,
  };
}

export function calculateBetEVFromPrediction(
  prediction: BaccaratPrediction,
  config?: BetEVConfig,
): BetEVBreakdown {
  const settings = resolveEVConfig(config);
  const bankerWinPayout = settings.bankerPayoutMode === 'commission' ? 0.95 : 1;

  // Profit expectation on 1 unit staked.
  // Player/Banker push on tie (0 EV contribution from ties for those bets).
  const playerEV = prediction.playerProbability - prediction.bankerProbability;
  const bankerEV = prediction.bankerProbability * bankerWinPayout - prediction.playerProbability;

  // Tie bet resolves independently: win pays N:1, all non-tie outcomes lose stake.
  const tieEV =
    prediction.tieProbability * settings.tiePayout -
    (prediction.playerProbability + prediction.bankerProbability);

  return {
    player: playerEV,
    banker: bankerEV,
    tie: tieEV,
  };
}

function getBestPositiveEV(ev: BetEVBreakdown): { side: BetAction; ev: number } {
  const candidateBets: Array<{ side: BetSide; ev: number }> = [
    { side: 'PLAYER' as const, ev: ev.player },
    { side: 'BANKER' as const, ev: ev.banker },
    { side: 'TIE' as const, ev: ev.tie },
  ];

  const ranked = candidateBets.sort((a, b) => b.ev - a.ev);

  const best = ranked[0];

  if (!best || best.ev <= 0) {
    return { side: 'SKIP', ev: 0 };
  }

  return best;
}

export function calculateEV(
  shoe: Shoe,
  options?: {
    iterations?: number;
    config?: BetEVConfig;
  },
): EVCalculationResult {
  const prediction = estimateNextHandProbabilities(shoe, {
    iterations: options?.iterations,
  });
  const settings = resolveEVConfig(options?.config);
  const ev = calculateBetEVFromPrediction(prediction, settings);

  return {
    ev,
    best: getBestPositiveEV(ev),
    prediction,
    settings,
  };
}

export function calculateEdge(playerWins: number, bankerWins: number) {
  const total = playerWins + bankerWins;
  if (total === 0) return 0;

  // Simple empirical bias (NOT prediction)
  return (bankerWins - playerWins) / total;
}

export function calculateVolatility(recentResults: BetAction[]) {
  if (recentResults.length < 5) return 0;

  let switches = 0;
  for (let i = 1; i < recentResults.length; i++) {
    if (recentResults[i] !== recentResults[i - 1]) {
      switches++;
    }
  }
  return switches / (recentResults.length - 1);
}
