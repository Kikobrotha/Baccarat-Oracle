export type Card =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K';

export const CARD_ORDER: Card[] = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
];

export type Shoe = Record<Card, number>;

export function createShoe(decks = 8): Shoe {
  return Object.fromEntries(CARD_ORDER.map(card => [card, 4 * decks])) as Shoe;
}

export function cloneShoe(shoe: Shoe): Shoe {
  return { ...shoe };
}

export function countCards(shoe: Shoe): number {
  return CARD_ORDER.reduce((total, card) => total + shoe[card], 0);
}

export function removeCardsFromShoe(
  shoe: Shoe,
  usedCards: Card[],
  options?: { strict?: boolean },
): Shoe {
  const strict = options?.strict ?? true;
  const remaining = cloneShoe(shoe);

  for (const card of usedCards) {
    if (remaining[card] <= 0) {
      if (strict) {
        throw new Error(`Cannot remove card \"${card}\" from shoe: insufficient count.`);
      }
      continue;
    }

    remaining[card] -= 1;
  }

  return remaining;
}

export function buildRemainingShoeFromUsedCards(
  usedCards: Card[],
  decks = 8,
  options?: { strict?: boolean },
): Shoe {
  const freshShoe = createShoe(decks);
  return removeCardsFromShoe(freshShoe, usedCards, options);
}
