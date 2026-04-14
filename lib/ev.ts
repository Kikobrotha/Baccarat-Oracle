import { estimateNextHandProbabilities } from './baccaratEngine';
import { Shoe } from './shoe';

export function calculateEV(shoe: Shoe, iterations = 50_000) {
  const prediction = estimateNextHandProbabilities(shoe, { iterations });

  const playerEV = prediction.playerProbability - prediction.bankerProbability;
  const bankerEV = prediction.bankerProbability * 0.95 - prediction.playerProbability;

  if (playerEV <= 0 && bankerEV <= 0) {
    return {
      best: { side: 'SKIP' as const, ev: 0 },
      prediction,
    };
  }

  return playerEV > bankerEV
    ? {
        best: { side: 'PLAYER' as const, ev: playerEV },
        prediction,
      }
    : {
        best: { side: 'BANKER' as const, ev: bankerEV },
        prediction,
      };
}
