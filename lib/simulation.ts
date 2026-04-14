import { calculateEV, simulateHandFromShoe } from './baccarat';
import { Outcome, PredictionResult, ShoeState, WindsurfRepeatResult } from './types';

function emptyCounter(): Record<Outcome, number> {
  return { Banker: 0, Player: 0, Tie: 0 };
}

export function runPredictionSimulation(shoe: ShoeState, mode: 'standard' | 'no_commission', iterations = 5000): PredictionResult {
  const counts = emptyCounter();

  for (let i = 0; i < iterations; i += 1) {
    const outcome = simulateHandFromShoe(shoe);
    counts[outcome] += 1;
  }

  const probabilities = {
    Banker: counts.Banker / iterations,
    Player: counts.Player / iterations,
    Tie: counts.Tie / iterations,
  };

  const ev = calculateEV(probabilities, mode);
  const recommendation = (Object.entries(ev).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Banker') as Outcome;
  const confidence = Math.round(Math.min(99, Math.abs(ev[recommendation]) * 100));

  return {
    recommendation,
    confidence,
    ev,
    probabilities,
    sampleSize: iterations,
    notes: [`Simulated ${iterations.toLocaleString()} possible next hands from current shoe.`],
  };
}

export function runWindsurfRepeats(
  shoe: ShoeState,
  mode: 'standard' | 'no_commission',
  repeats: number,
  iterationsPerRepeat: number,
): WindsurfRepeatResult[] {
  const rows: WindsurfRepeatResult[] = [];
  for (let i = 1; i <= repeats; i += 1) {
    const result = runPredictionSimulation(shoe, mode, iterationsPerRepeat);
    rows.push({
      repeat: i,
      recommendation: result.recommendation,
      ev: result.ev,
      confidence: result.confidence,
    });
  }
  return rows;
}
