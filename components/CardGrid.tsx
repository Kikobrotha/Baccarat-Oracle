'use client';

import { Card } from '../lib/shoe';

export default function CardGrid({
  onSelect,
  disabled,
  compact = false,
}: {
  onSelect: (card: Card) => void;
  disabled: boolean;
  compact?: boolean;
}) {
  const cards: Card[] = [
    'A', '2', '3', '4',
    '5', '6', '7', '8',
    '9', '10', 'J', 'Q', 'K',
  ];

  return (
    <div className={`grid grid-cols-4 ${compact ? 'gap-1.5' : 'gap-2'}`}>
      {cards.map(card => (
        <button
          key={card}
          disabled={disabled}
          onClick={() => onSelect(card)}
          className={`${compact ? 'py-1.5 text-sm' : 'py-2'} rounded-lg font-semibold transition
            ${disabled
              ? 'bg-gray-400 text-gray-700'
              : 'bg-white text-black hover:bg-yellow-100 active:scale-[0.98]'}
          `}
        >
          {card}
        </button>
      ))}
    </div>
  );
}
