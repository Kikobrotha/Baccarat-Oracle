import { GameMode, Outcome, RANKS, Rank, ShoeState } from './types';

const BANKER_COMMISSION = 0.95;

export function createDefaultShoe(decks = 8): ShoeState {
  const perRank = decks * 4;
  return RANKS.reduce((acc, rank) => {
    acc[rank] = perRank;
    return acc;
  }, {} as ShoeState);
}

export function rankValue(rank: Rank): number {
  if (rank === 'A') return 1;
  if (rank === '10' || rank === 'J' || rank === 'Q' || rank === 'K') return 0;
  return Number(rank);
}

export function handTotal(cards: Rank[]): number {
  return cards.reduce((sum, c) => sum + rankValue(c), 0) % 10;
}

export function isValidShoe(shoe: ShoeState): boolean {
  return RANKS.every((rank) => Number.isInteger(shoe[rank]) && shoe[rank] >= 0);
}

function drawRank(shoe: ShoeState): Rank {
  const total = RANKS.reduce((sum, rank) => sum + shoe[rank], 0);
  if (total <= 0) {
    throw new Error('Shoe has no cards left');
  }

  let target = Math.random() * total;
  for (const rank of RANKS) {
    target -= shoe[rank];
    if (target < 0) {
      shoe[rank] -= 1;
      return rank;
    }
  }

  const fallback = RANKS[RANKS.length - 1];
  shoe[fallback] -= 1;
  return fallback;
}

function bankerShouldDraw(bankerTotal: number, playerThirdValue: number | null): boolean {
  if (playerThirdValue === null) {
    return bankerTotal <= 5;
  }

  if (bankerTotal <= 2) return true;
  if (bankerTotal === 3) return playerThirdValue !== 8;
  if (bankerTotal === 4) return playerThirdValue >= 2 && playerThirdValue <= 7;
  if (bankerTotal === 5) return playerThirdValue >= 4 && playerThirdValue <= 7;
  if (bankerTotal === 6) return playerThirdValue >= 6 && playerThirdValue <= 7;
  return false;
}

export function simulateHandFromShoe(sourceShoe: ShoeState): Outcome {
  const shoe = { ...sourceShoe };
  const player: Rank[] = [drawRank(shoe), drawRank(shoe)];
  const banker: Rank[] = [drawRank(shoe), drawRank(shoe)];

  let playerTotal = handTotal(player);
  let bankerTotal = handTotal(banker);

  if (playerTotal >= 8 || bankerTotal >= 8) {
    return settle(playerTotal, bankerTotal);
  }

  let playerThirdValue: number | null = null;
  if (playerTotal <= 5) {
    const third = drawRank(shoe);
    player.push(third);
    playerThirdValue = rankValue(third);
    playerTotal = handTotal(player);
  }

  if (bankerShouldDraw(bankerTotal, playerThirdValue)) {
    banker.push(drawRank(shoe));
    bankerTotal = handTotal(banker);
  }

  return settle(playerTotal, bankerTotal);
}

function settle(playerTotal: number, bankerTotal: number): Outcome {
  if (playerTotal > bankerTotal) return 'Player';
  if (bankerTotal > playerTotal) return 'Banker';
  return 'Tie';
}

export function calculateEV(probabilities: Record<Outcome, number>, mode: GameMode): Record<Outcome, number> {
  const bankerPayout = mode === 'standard' ? BANKER_COMMISSION : 1;
  return {
    Player: probabilities.Player - probabilities.Banker - probabilities.Tie,
    Banker: probabilities.Banker * bankerPayout - probabilities.Player - probabilities.Tie,
    Tie: probabilities.Tie * 8 - probabilities.Player - probabilities.Banker,
  };
}
