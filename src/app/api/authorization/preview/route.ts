import { NextResponse } from "next/server";
import { businessRules, getLoad } from "@/lib/data";
import { evaluateCommitment } from "@/lib/authorization";

/**
 * Dry-run the authorisation check without committing anything.
 *
 * Exists so the rules page can answer "what would happen if a driver asked for
 * $X on this load" using the same code path the agent hits, rather than a
 * re-implementation in the browser that could drift out of sync with it.
 */
export async function POST(request: Request) {
  let body: { loadId?: string; amount?: number; currentOffer?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const load = getLoad(body.loadId ?? "");
  if (!load) {
    return NextResponse.json({ error: "load_not_found" }, { status: 404 });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount)) {
    return NextResponse.json({ error: "amount must be a number" }, { status: 400 });
  }

  const decision = evaluateCommitment({
    amount,
    currentOffer: body.currentOffer ?? load.authorizedRate,
    load,
    rules: businessRules,
    outcomeConfidence: 1,
  });

  return NextResponse.json(decision);
}
