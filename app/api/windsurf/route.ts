import { NextResponse } from 'next/server';
import { isValidShoe } from '@/lib/baccarat';
import { runPredictionSimulation } from '@/lib/simulation';
import { Outcome, WindsurfRequest, WindsurfResponse } from '@/lib/types';

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as WindsurfRequest;
    if (!body || !isValidShoe(body.shoe)) {
      return NextResponse.json({ error: 'Invalid shoe payload.' }, { status: 400 });
    }

    const repeats = Math.min(Math.max(body.repeats || 25, 1), 500);
    const iterationsPerRepeat = Math.min(Math.max(body.iterationsPerRepeat || 2500, 250), 50000);
    const mode = body.mode === 'no_commission' ? 'no_commission' : 'standard';

    const logs: string[] = [];
    const progress: WindsurfResponse['progress'] = [];
    const repeatsOutput: WindsurfResponse['repeats'] = [];

    let bestRecommendation: Outcome = 'Banker';
    let bestEV = Number.NEGATIVE_INFINITY;

    for (let i = 1; i <= repeats; i += 1) {
      const result = runPredictionSimulation(body.shoe, mode, iterationsPerRepeat);
      repeatsOutput.push({
        repeat: i,
        recommendation: result.recommendation,
        ev: result.ev,
        confidence: result.confidence,
      });

      const topEV = result.ev[result.recommendation];
      if (topEV > bestEV) {
        bestEV = topEV;
        bestRecommendation = result.recommendation;
      }

      progress.push({
        progress: Number(((i / repeats) * 100).toFixed(1)),
        repeat: i,
        bestRecommendation,
        bestEV,
      });

      logs.push(
        `[repeat ${i}] rec=${result.recommendation} conf=${result.confidence}% ev(B/P/T)=${result.ev.Banker.toFixed(4)}/${result.ev.Player.toFixed(4)}/${result.ev.Tie.toFixed(4)}`,
      );

      if (i % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    const meanEV = {
      Banker: average(repeatsOutput.map((row) => row.ev.Banker)),
      Player: average(repeatsOutput.map((row) => row.ev.Player)),
      Tie: average(repeatsOutput.map((row) => row.ev.Tie)),
    };

    return NextResponse.json({
      repeats: repeatsOutput,
      progress,
      logs,
      bestRecommendation,
      meanEV,
    } satisfies WindsurfResponse);
  } catch {
    return NextResponse.json({ error: 'Unable to process windsurf request.' }, { status: 500 });
  }
}
