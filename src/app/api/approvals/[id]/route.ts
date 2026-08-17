import { NextResponse } from "next/server";
import { businessRules, getLoad, getNegotiation } from "@/lib/data";
import { evaluateCommitment } from "@/lib/authorization";

/**
 * Decide a queued negotiation.
 *
 * The authorisation check runs again here, on the server, even though the
 * agent already failed it once. That is deliberate: this endpoint is the only
 * thing standing between a click in the browser and a binding commitment, and
 * it must not trust the client's idea of what the ceiling was. A dispatcher
 * approving above the ceiling is allowed — that is the entire point of the
 * gate — but the response records what the limit was at the moment of the
 * decision, which is what ends up in the audit trail.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const negotiation = getNegotiation(id);
  if (!negotiation) {
    return NextResponse.json({ error: "negotiation_not_found" }, { status: 404 });
  }

  let body: { decision?: string; amount?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (body.decision !== "approve" && body.decision !== "reject") {
    return NextResponse.json({ error: "decision must be 'approve' or 'reject'" }, { status: 400 });
  }

  if (negotiation.status !== "pending") {
    return NextResponse.json(
      { error: "already_decided", status: negotiation.status },
      { status: 409 },
    );
  }

  const load = getLoad(negotiation.loadId);
  if (!load) {
    return NextResponse.json({ error: "load_not_found" }, { status: 404 });
  }

  if (body.decision === "reject") {
    return NextResponse.json({
      status: "rejected",
      negotiationId: negotiation.id,
      audit: {
        actor: "user:u_1",
        action: "negotiation.rejected",
        before: { status: "pending" },
        after: { status: "rejected" },
      },
    });
  }

  const amount = typeof body.amount === "number" ? body.amount : negotiation.counterRate;
  const check = evaluateCommitment({
    amount,
    currentOffer: negotiation.offeredRate,
    load,
    rules: businessRules,
    outcomeConfidence: 1,
  });

  // A structural denial is not overridable by a dispatcher either — losing
  // money on the load is a mistake regardless of who clicks the button.
  if (check.decision === "denied") {
    return NextResponse.json(
      { error: "denied", reasons: check.reasons, effectiveCeiling: check.effectiveCeiling },
      { status: 422 },
    );
  }

  return NextResponse.json({
    status: "approved",
    negotiationId: negotiation.id,
    approvedAmount: amount,
    /** True when the human deliberately went above what the agent could do alone. */
    overrodeCeiling: check.decision === "human_approval_required",
    effectiveCeiling: check.effectiveCeiling,
    reasons: check.reasons,
    audit: {
      actor: "user:u_1",
      action: "negotiation.approved",
      before: { status: "pending" },
      after: { status: "approved", approvedRate: amount },
    },
  });
}
