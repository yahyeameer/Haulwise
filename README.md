# Haulwise — AI agentic truck dispatcher

Marketing site and dispatcher control system for an AI voice dispatcher aimed at US
owner-operators and small fleets (1–20 trucks).

The product places the repetitive coverage calls a dispatcher makes all day, extracts a
**structured outcome** from each one, writes it back to the load, and stops at a **human approval
gate** whenever a commitment exceeds configured authority.

Built against the *AI Agentic Truck Dispatcher* PRD (product vision §1, MVP scope §2, data model §4,
agent tools §5, safety boundary §5, voice UX §6, eval framework §7).

---

## What is here

| Area | Path | State |
| --- | --- | --- |
| Landing page | `src/app/page.tsx` | Complete |
| Dispatcher console | `src/app/console/**` | Complete, reads a seeded dataset |
| Domain model | `src/lib/types.ts` | Complete — mirrors PRD §4 |
| **Authorization guardrail** | `src/lib/authorization.ts` | Complete, unit-tested |
| Driver matching | `src/lib/matching.ts` | Complete, unit-tested |
| Eval metrics | `src/lib/metrics.ts` | Complete |
| Approval + preview APIs | `src/app/api/**` | Complete |
| Persistence, telephony, agent | — | **Not built** — see [What is deliberately missing](#what-is-deliberately-missing) |

### Console routes

| Route | Shows |
| --- | --- |
| `/console` | Containment, extraction accuracy, escalation rate, latency, cost per useful outcome, agent-run telemetry |
| `/console/loads` | The board; `/console/loads/[id]` adds ranked drivers with a per-factor breakdown and the binding rate ceiling |
| `/console/drivers` | Roster, equipment, lane preferences, do-not-call flags, acceptance history |
| `/console/calls` | Call history; `/console/calls/[id]` adds the transcript, extracted outcome and the authorization check that ran |
| `/console/approvals` | The queue of commitments the agent refused to make alone |
| `/console/rules` | Every configured limit, plus a live simulator that calls the real API |
| `/console/audit` | Every state change with actor and before/after |

---

## The part that matters: the safety boundary

PRD §5 states that the LLM must never be the final authority on money movement. That is implemented
in `src/lib/authorization.ts`, and it is the reason this repo is more than a mockup.

```ts
// The binding ceiling is always the LOWEST of every applicable limit, so adding
// a rule can only ever tighten authority — never widen it.
export function effectiveCeiling(load, rules) {
  const percentCeiling = Math.floor(load.brokerRate * (rules.maxRatePercentOfBroker / 100));
  return Math.min(load.authorizedRate, percentCeiling, rules.maxRateAbsolute);
}
```

Properties the module is built to hold, each covered by a test:

- **It takes no natural-language input.** There is no argument a driver or the model can make to it.
  It receives numbers and returns a decision.
- **Over the ceiling returns `human_approval_required`**, which the tool layer hands straight back to
  the agent. There is no branch where the model decides an amount was close enough.
- **Structurally invalid commitments are `denied`, not escalated** — paying at or above the broker
  rate, non-positive amounts, `NaN`, or committing on a load that is already assigned or delivered.
  A dispatcher cannot override those either.
- **Low extraction confidence escalates on its own**, regardless of how clean the outcome looks.
- **It is pure and synchronous**, so it cannot fail open on a network error.

`evaluateCallPermission` applies the same treatment to dialling: do-not-call flags and unapproved
regions are hard denials; calling-window and attempt-limit breaches escalate.

A sweep test asserts that across every amount from \$1 to the broker rate, the function never returns
`authorized` above the effective ceiling.

---

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
```

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm test` | Vitest suite (45 tests) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

Start at `/` for the landing page, then `/console` for the control system. The seeded load `RL-4471`
is the interesting one: a driver countered \$975 against a \$900 ceiling, so the agent stopped and
queued it. Follow it through `/console/calls/c_1` → `/console/approvals`.

---

## Architecture

Current implementation, against the stack in PRD §3:

| Layer | PRD says | Built as |
| --- | --- | --- |
| Web | Next.js + TS + Tailwind | Next.js 16 (App Router), TypeScript, Tailwind v4 — **done** |
| API | Python + FastAPI | Next.js route handlers as a placeholder |
| Agent | Hermes Agent | Not integrated — see below |
| DB | PostgreSQL | In-memory dataset in `src/lib/data.ts` |
| Voice | Vapi/Retell + Twilio | Not integrated; transcripts are seeded |
| Jobs | Redis + Celery | Not integrated |

`src/lib/data.ts` is deliberately shaped so every accessor (`getLoad`, `getCallsForDriver`, …) can be
swapped for a real query without touching a single page component.

### What is deliberately missing

No database, no telephony, no live agent loop, no auth. The console renders a fixed dataset anchored
to `2026-08-17T14:00:00Z` so it looks identical on every machine and in CI. Approve and reject in the
approvals queue post to a real endpoint that re-runs the authorization check server-side and returns
a real decision — but nothing persists, so a refresh resets it.

---

## Open questions before Month 1 engineering starts

Raised while reading the PRD. They change what gets built, so they are worth settling early.

1. **Hermes Agent is unverified.** Every capability claim in the PRD traces to unrendered web-search
   citation markers (`■cite■turn0search0■`), not hands-on use. Nothing described — tools, memory,
   MCP, provider routing, scheduling — is hard to build directly on a model SDK. Confirm what it is
   and who maintains it before making it the load-bearing dependency.
2. **Regulatory exposure is understated.** For a product whose entire function is automated outbound
   calling, TCPA, state two-party recording consent and state AI-disclosure rules are not one bullet
   in a risk list. The tenant model here already carries `approvedCallingRegions` and
   `recordingPolicy`, so the controls exist — the legal review does not.
3. **No real call until Month 2.** Voice quality is the riskiest unknown and it is the whole product.
   Pull one real end-to-end call into week 3 even if everything around it is stubbed.
4. **The budget omits the largest cost.** \$75–\$335/month covers infrastructure, not a founder, and
   voice spend at pilot volume will pass \$150 quickly. Cost per successful outcome is already on the
   dashboard — let it drive pricing rather than guessing.

---

## Definition of done for V1 (PRD §14)

- [x] Recommend at least one suitable driver from the customer's dataset
- [x] Store transcript + structured outcome
- [x] Enforce financial authority limits outside the LLM
- [x] Dispatcher can see every call and override the agent
- [x] Calculate cost per call and cost per successful outcome
- [ ] Create a load in under 60 seconds *(console is read-only; the New load form is not wired)*
- [ ] Agent initiates a real outbound call *(no telephony)*
- [ ] Driver can accept, reject, counter or request callback *(seeded, not live)*
- [ ] Pilot customer can use it without developer assistance *(no auth, no persistence)*
