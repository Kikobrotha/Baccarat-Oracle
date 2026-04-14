import { NextResponse } from 'next/server';
import { isValidShoe } from '@/lib/baccarat';
import { runPredictionSimulation } from '@/lib/simulation';
import { PredictRequest } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PredictRequest;
    if (!body || !isValidShoe(body.shoe)) {
      return NextResponse.json({ error: 'Invalid shoe payload.' }, { status: 400 });
    }

    const iterations = Math.min(Math.max(body.iterations ?? 5000, 500), 100000);
    const mode = body.mode === 'no_commission' ? 'no_commission' : 'standard';
    const result = runPredictionSimulation(body.shoe, mode, iterations);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Unable to process prediction request.' }, { status: 500 });
  }
}
