import { Card } from './shoe';

export type BaccaratOutcome = 'Player' | 'Banker' | 'Tie';
export type BettingMode = 'standard' | 'no-commission';

export type PredictionConfig = {
  decks?: number;
  tiePayout?: number;
  bankerPayout?: number;
  mode?: BettingMode;
  iterations?: number;
  minPlayableEv?: number;
};

export type OutcomeProbabilities = {
  Player: number;
  Banker: number;
  Tie: number;
  BankerWinOn6: number;
};

export type BetEv = {
  Player: number;
  Banker: number;
  Tie: number;
};

export type PredictionResult = {
  probabilities: OutcomeProbabilities;
  ev: BetEv;
  recommendation: 'Player' | 'Banker' | 'Tie' | 'DO NOT PLAY';
  reason: string;
};

const RANKS: Card[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const CARD_VALUE: Record<Card, number> = {
  A: 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 0,
  J: 0,
  Q: 0,
  K: 0,
};

function drawCard(counts: number[], totalCards: number): number {
  let target = Math.floor(Math.random() * totalCards);

  for (let i = 0; i < counts.length; i += 1) {
    if (target < counts[i]) {
      counts[i] -= 1;
      return i;
    }
    target -= counts[i];
  }

  return counts.length - 1;
}

function shouldBankerDraw(bankerTotal: number, playerThirdCardValue: number | null): boolean {
  if (playerThirdCardValue === null) {
    return bankerTotal <= 5;
  }

  if (bankerTotal <= 2) return true;
  if (bankerTotal === 3) return playerThirdCardValue !== 8;
  if (bankerTotal === 4) return playerThirdCardValue >= 2 && playerThirdCardValue <= 7;
  if (bankerTotal === 5) return playerThirdCardValue >= 4 && playerThirdCardValue <= 7;
  if (bankerTotal === 6) return playerThirdCardValue === 6 || playerThirdCardValue === 7;

  return false;
}

function resolveOneHand(counts: number[], totalCardsInShoe: number): BaccaratOutcome | 'BankerOn6' {
  let cardsLeft = totalCardsInShoe;

  const p1 = drawCard(counts, cardsLeft);
  cardsLeft -= 1;
  const b1 = drawCard(counts, cardsLeft);
  cardsLeft -= 1;
  const p2 = drawCard(counts, cardsLeft);
  cardsLeft -= 1;
  const b2 = drawCard(counts, cardsLeft);
  cardsLeft -= 1;

  let playerTotal = (CARD_VALUE[RANKS[p1]] + CARD_VALUE[RANKS[p2]]) % 10;
  let bankerTotal = (CARD_VALUE[RANKS[b1]] + CARD_VALUE[RANKS[b2]]) % 10;

  if (playerTotal >= 8 || bankerTotal >= 8) {
    if (playerTotal > bankerTotal) return 'Player';
    if (bankerTotal > playerTotal) {
      return bankerTotal === 6 ? 'BankerOn6' : 'Banker';
    }
    return 'Tie';
  }

  let playerThirdCardValue: number | null = null;
  if (playerTotal <= 5) {
    const p3 = drawCard(counts, cardsLeft);
    cardsLeft -= 1;
    playerThirdCardValue = CARD_VALUE[RANKS[p3]];
    playerTotal = (playerTotal + playerThirdCardValue) % 10;
  }

  if (shouldBankerDraw(bankerTotal, playerThirdCardValue)) {
    const b3 = drawCard(counts, cardsLeft);
    bankerTotal = (bankerTotal + CARD_VALUE[RANKS[b3]]) % 10;
  }

  if (playerTotal > bankerTotal) return 'Player';
  if (bankerTotal > playerTotal) {
    return bankerTotal === 6 ? 'BankerOn6' : 'Banker';
  }
  return 'Tie';
}

function buildRemainingCounts(seenCards: Card[], decks: number): number[] {
  const counts = Array.from({ length: RANKS.length }, () => 4 * decks);

  for (const card of seenCards) {
    const index = RANKS.indexOf(card);
    if (index >= 0 && counts[index] > 0) {
      counts[index] -= 1;
    }
  }

  return counts;
}

export function estimateNextHand(seenCards: Card[], config: PredictionConfig = {}): PredictionResult {
  const {
    decks = 8,
    tiePayout = 8,
    bankerPayout = 0.95,
    mode = 'standard',
    iterations = 12000,
    minPlayableEv = 0.005,
  } = config;

  const baseCounts = buildRemainingCounts(seenCards, decks);
  const cardsLeft = baseCounts.reduce((sum, count) => sum + count, 0);

  if (cardsLeft < 4) {
    return {
      probabilities: { Player: 0, Banker: 0, Tie: 0, BankerWinOn6: 0 },
      ev: { Player: 0, Banker: 0, Tie: 0 },
      recommendation: 'DO NOT PLAY',
      reason: 'Not enough cards remaining in shoe',
    };
  }

  let playerWins = 0;
  let bankerWins = 0;
  let ties = 0;
  let bankerWinsOn6 = 0;

  for (let i = 0; i < iterations; i += 1) {
    const counts = [...baseCounts];
    const outcome = resolveOneHand(counts, cardsLeft);

    if (outcome === 'Player') playerWins += 1;
    else if (outcome === 'Tie') ties += 1;
    else if (outcome === 'BankerOn6') {
      bankerWins += 1;
      bankerWinsOn6 += 1;
    } else bankerWins += 1;
  }

  const pPlayer = playerWins / iterations;
  const pBanker = bankerWins / iterations;
  const pTie = ties / iterations;
  const pBanker6 = bankerWinsOn6 / iterations;

  const playerEv = pPlayer - pBanker;
  const bankerEv = mode === 'no-commission'
    ? (pBanker - pBanker6) * 1 + pBanker6 * 0.5 - pPlayer
    : pBanker * bankerPayout - pPlayer;
  const tieEv = pTie * tiePayout - (pPlayer + pBanker);

  const ev: BetEv = {
    Player: playerEv,
    Banker: bankerEv,
    Tie: tieEv,
  };

  const sorted = (Object.entries(ev) as Array<[keyof BetEv, number]>).sort((a, b) => b[1] - a[1]);
  const [bestBet, bestEv] = sorted[0];

  const recommendation = bestEv >= minPlayableEv
    ? bestBet
    : 'DO NOT PLAY';

  return {
    probabilities: {
      Player: pPlayer,
      Banker: pBanker,
      Tie: pTie,
      BankerWinOn6: pBanker6,
    },
    ev,
    recommendation,
    reason: recommendation === 'DO NOT PLAY'
      ? 'No meaningful positive edge from remaining shoe composition'
      : 'Positive EV from remaining shoe composition',
  };
}
