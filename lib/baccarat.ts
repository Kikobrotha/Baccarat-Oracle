import { Card } from './shoe';

export type BaccaratResult = 'Player' | 'Banker' | 'Tie';

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

export function cardPointValue(card: Card): number {
  return CARD_POINT_VALUE[card];
}

export function handTotal(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + cardPointValue(card), 0) % 10;
}

export function resolveHandResult(playerCards: Card[], bankerCards: Card[]): BaccaratResult {
  const playerTotal = handTotal(playerCards);
  const bankerTotal = handTotal(bankerCards);

  if (playerTotal === bankerTotal) {
    return 'Tie';
  }

  return playerTotal > bankerTotal ? 'Player' : 'Banker';
}
