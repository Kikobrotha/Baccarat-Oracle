import {
  buildRemainingShoeFromUsedCards,
  CARD_ORDER,
  Card,
  countCards,
  Shoe,
} from './shoe';

export type BaccaratOutcome = 'Player' | 'Banker' | 'Tie';

export interface BaccaratPrediction {
  playerProbability: number;
  bankerProbability: number;
  tieProbability: number;
  sampleCount: number;
}

export interface BaccaratSimulationOptions {
  iterations?: number;
}

export interface ShoeCompositionInput {
  usedCards: Card[];
  decks?: number;
}

const CARD_POINT_VALUE: Record<Card, number> = {
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

function handTotal(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + CARD_POINT_VALUE[card], 0) % 10;
}

function drawRandomCard(shoe: Shoe): Card {
  const cardsRemaining = countCards(shoe);

  if (cardsRemaining <= 0) {
    throw new Error('Cannot draw from an empty shoe.');
  }

  let target = Math.floor(Math.random() * cardsRemaining);

  for (const card of CARD_ORDER) {
    const count = shoe[card];

    if (target < count) {
      shoe[card] -= 1;
      return card;
    }

    target -= count;
  }

  throw new Error('Failed to draw a card from the shoe.');
}

function shouldPlayerDrawThirdCard(playerTotal: number): boolean {
  return playerTotal <= 5;
}

function shouldBankerDrawThirdCard(
  bankerTotal: number,
  playerThirdCard: Card | null,
): boolean {
  if (playerThirdCard === null) {
    return bankerTotal <= 5;
  }

  const playerThirdValue = CARD_POINT_VALUE[playerThirdCard];

  if (bankerTotal <= 2) return true;
  if (bankerTotal === 3) return playerThirdValue !== 8;
  if (bankerTotal === 4) return playerThirdValue >= 2 && playerThirdValue <= 7;
  if (bankerTotal === 5) return playerThirdValue >= 4 && playerThirdValue <= 7;
  if (bankerTotal === 6) return playerThirdValue === 6 || playerThirdValue === 7;

  return false;
}

export function simulateBaccaratHand(remainingShoe: Shoe): BaccaratOutcome {
  const shoe = { ...remainingShoe };

  if (countCards(shoe) < 4) {
    throw new Error('At least 4 cards are required to simulate a baccarat hand.');
  }

  const playerCards: Card[] = [drawRandomCard(shoe), drawRandomCard(shoe)];
  const bankerCards: Card[] = [drawRandomCard(shoe), drawRandomCard(shoe)];

  const initialPlayerTotal = handTotal(playerCards);
  const initialBankerTotal = handTotal(bankerCards);

  const isNatural = initialPlayerTotal >= 8 || initialBankerTotal >= 8;

  if (!isNatural) {
    let playerThirdCard: Card | null = null;

    if (shouldPlayerDrawThirdCard(initialPlayerTotal)) {
      playerThirdCard = drawRandomCard(shoe);
      playerCards.push(playerThirdCard);
    }

    if (shouldBankerDrawThirdCard(initialBankerTotal, playerThirdCard)) {
      bankerCards.push(drawRandomCard(shoe));
    }
  }

  const finalPlayerTotal = handTotal(playerCards);
  const finalBankerTotal = handTotal(bankerCards);

  if (finalPlayerTotal > finalBankerTotal) return 'Player';
  if (finalBankerTotal > finalPlayerTotal) return 'Banker';

  return 'Tie';
}

export function estimateNextHandProbabilities(
  remainingShoe: Shoe,
  options?: BaccaratSimulationOptions,
): BaccaratPrediction {
  const iterations = options?.iterations ?? 50_000;

  if (iterations <= 0 || !Number.isFinite(iterations)) {
    throw new Error('Simulation iterations must be a positive finite number.');
  }

  const roundedIterations = Math.floor(iterations);

  let playerWins = 0;
  let bankerWins = 0;
  let ties = 0;

  for (let i = 0; i < roundedIterations; i += 1) {
    const result = simulateBaccaratHand(remainingShoe);

    if (result === 'Player') {
      playerWins += 1;
    } else if (result === 'Banker') {
      bankerWins += 1;
    } else {
      ties += 1;
    }
  }

  return {
    playerProbability: playerWins / roundedIterations,
    bankerProbability: bankerWins / roundedIterations,
    tieProbability: ties / roundedIterations,
    sampleCount: roundedIterations,
  };
}

export function estimateNextHandFromUsedCards(
  input: ShoeCompositionInput,
  options?: BaccaratSimulationOptions,
): BaccaratPrediction {
  const remainingShoe = buildRemainingShoeFromUsedCards(
    input.usedCards,
    input.decks ?? 8,
  );

  return estimateNextHandProbabilities(remainingShoe, options);
}
