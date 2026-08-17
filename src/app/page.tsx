import Link from "next/link";
import { Badge, Card, Dot } from "@/components/ui";

/**
 * Marketing landing page.
 *
 * Follows the positioning in PRD §11: lead with the outcome (fewer repetitive
 * calls, faster follow-up), not with "we built an AI". The guardrail section
 * sits above pricing on purpose — for a product that dials customers' drivers
 * and talks about money, "what stops it going wrong" is the objection that
 * actually blocks a pilot.
 */

const STEPS = [
  {
    n: "01",
    title: "Load comes in",
    body: "Type it in or drop a CSV. Origin, destination, equipment, windows, commodity and rate get normalised into one record.",
  },
  {
    n: "02",
    title: "Drivers get ranked",
    body: "Deadhead, equipment, availability, lane history and past acceptance produce a score — with the reasoning shown next to it.",
  },
  {
    n: "03",
    title: "A call plan is drafted",
    body: "The agent writes a short script and a list of things it is allowed to say. Anything outside that list is not on the table.",
  },
  {
    n: "04",
    title: "The call happens",
    body: "Streaming speech both directions, barge-in supported, numbers and appointment times read back for confirmation.",
  },
  {
    n: "05",
    title: "An outcome is extracted",
    body: "Interested, rejected, counteroffer, callback, unavailable or escalate — a structured value, not a paragraph to read later.",
  },
  {
    n: "06",
    title: "Your rules are enforced",
    body: "Rate ceilings and approval thresholds are checked by the server. The model is told the answer; it does not get a vote.",
  },
  {
    n: "07",
    title: "Dispatch is updated",
    body: "Transcript, recording, outcome, cost and timestamps are written to the load, and the status moves on its own.",
  },
  {
    n: "08",
    title: "Follow-ups get scheduled",
    body: "No answer means a retry at a sensible hour. A callback request means a reminder. Nothing falls through.",
  },
];

const PLANS = [
  {
    name: "Pilot",
    price: 199,
    blurb: "One dispatcher, one lane, proving it works.",
    features: [
      "Up to 250 AI call minutes",
      "1 dispatcher seat",
      "Loads, drivers, call history",
      "Approval gate + rate ceilings",
      "Email support",
    ],
    cta: "Start a 14-day pilot",
    featured: false,
  },
  {
    name: "Fleet",
    price: 299,
    blurb: "The whole board running through it.",
    features: [
      "Up to 750 AI call minutes",
      "5 dispatcher seats",
      "CSV import + follow-up automation",
      "Custom business rules per lane",
      "Cost and containment reporting",
      "Shared Slack channel",
    ],
    cta: "Start a 14-day pilot",
    featured: true,
  },
  {
    name: "Operator",
    price: 499,
    blurb: "Multiple boards, real call volume.",
    features: [
      "Up to 2,000 AI call minutes",
      "Unlimited seats",
      "Multi-tenant separation",
      "Full audit export",
      "Custom voice + script tuning",
      "Onboarding call",
    ],
    cta: "Talk to us",
    featured: false,
  },
];

const FAQS = [
  {
    q: "Can it agree to a rate on its own?",
    a: "Only under the ceiling you set. The check runs on our server against your stored rules — not inside the prompt — so there is no wording a driver or the model can use to get around it. Over the ceiling, the call ends with 'a dispatcher will call you back' and the counteroffer lands in your approvals queue.",
  },
  {
    q: "What happens when the transcription is bad?",
    a: "Every extracted outcome carries a confidence score. Below your threshold it escalates to a person instead of guessing, and you see the transcript with the low-confidence turn marked. A bad line produces a task, never a booking.",
  },
  {
    q: "Do my drivers know it's an AI?",
    a: "Yes. Every call opens with an identification and, where your recording policy requires it, a consent line. Drivers can interrupt at any point, and any driver can be marked do-not-call, which blocks dialling at the API level.",
  },
  {
    q: "What about TCPA and call recording law?",
    a: "You configure approved calling regions, a local-time calling window and a recording policy per tenant, and the system refuses to dial outside them. That is a control surface, not legal advice — get your own review before you run outbound at volume.",
  },
  {
    q: "Does it replace my dispatcher?",
    a: "No. It removes the fifteenth call of the morning asking the same four questions. Judgement calls, relationships and anything binding still route to your dispatcher, who sees every call the agent placed and can override any of it.",
  },
  {
    q: "How do we know it's actually working?",
    a: "Containment rate, extraction accuracy, escalation rate, response latency and cost per successful outcome are on the dashboard from day one. If the numbers do not justify the subscription, you should not renew.",
  },
];

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="grid size-6 place-items-center rounded-md bg-accent text-[13px] font-bold text-background">
            H
          </span>
          Haulwise
        </Link>
        <div className="hidden items-center gap-7 text-sm text-muted md:flex">
          <a href="#how" className="transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="#guardrails" className="transition-colors hover:text-foreground">
            Guardrails
          </a>
          <a href="#pricing" className="transition-colors hover:text-foreground">
            Pricing
          </a>
          <a href="#faq" className="transition-colors hover:text-foreground">
            FAQ
          </a>
        </div>
        <Link
          href="/console"
          className="rounded-md bg-accent px-3.5 py-1.5 text-sm font-medium text-background transition-colors hover:bg-accent-strong"
        >
          Open console
        </Link>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="grid-backdrop absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-5 py-20 sm:py-28">
        <Badge tone="accent">
          <Dot tone="accent" />
          Now taking design partners — 1 to 20 trucks
        </Badge>

        <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          Your dispatcher makes the same call forty times a day.
          <span className="text-accent"> Stop making it.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-muted">
          Haulwise calls your drivers about your loads, gets a real answer, writes it back to the
          load, and hands you anything that needs a human. It never agrees to a rate you did not
          authorise — that limit is enforced by the server, not by asking the model nicely.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link
            href="/console"
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-strong"
          >
            See the live console
          </Link>
          <a
            href="#how"
            className="rounded-md border border-border-strong px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface"
          >
            How it works
          </a>
        </div>

        <dl className="mt-14 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
          {[
            ["< 2s", "typical response in conversation"],
            ["6 outcomes", "structured, never free text"],
            ["$0.16", "median cost per completed call"],
            ["0", "rates agreed above your ceiling"],
          ].map(([value, label]) => (
            <div key={label}>
              <dt className="tnum text-2xl font-semibold tracking-tight text-foreground">{value}</dt>
              <dd className="mt-1 text-xs leading-relaxed text-subtle">{label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold tracking-widest text-accent uppercase">
              The actual job
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance">
              Small fleets do not lose loads on strategy. They lose them on the fourth call not made
              by lunchtime.
            </h2>
            <p className="mt-5 leading-relaxed text-muted">
              With one to twenty trucks, the dispatcher is also the owner, the safety manager and
              the person chasing a lumper receipt. Coverage calls are the first thing to slip, and a
              load that sits uncovered until three in the afternoon gets covered at a worse rate —
              or not at all.
            </p>
          </div>

          <ul className="space-y-3">
            {[
              ["Nine calls to cover one load", "Six go to voicemail. Two are 'let me call you back'."],
              ["Answers live in a notebook", "Or a text thread, or somebody's memory of a call."],
              [
                "Follow-ups depend on remembering",
                "The callback at four o'clock is the one that gets missed.",
              ],
              ["Nobody knows the real numbers", "How long did coverage take last week? Nobody can say."],
            ].map(([title, body]) => (
              <li
                key={title}
                className="flex gap-4 rounded-[var(--radius)] border border-border bg-surface p-4"
              >
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-danger" />
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-0.5 text-sm text-subtle">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-14 border-b border-border">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <p className="text-xs font-semibold tracking-widest text-accent uppercase">How it works</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance">
          One loop, start to finish, with a place for you to step in at step six.
        </h2>

        <ol className="mt-12 grid gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <li key={step.n} className="bg-surface p-5">
              <span className="tnum text-xs font-semibold text-accent">{step.n}</span>
              <h3 className="mt-2 text-sm font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-subtle">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function CallPreview() {
  return (
    <section className="border-b border-border bg-surface/30">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold tracking-widest text-accent uppercase">
              A real call, end to end
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance">
              Watch it hit the ceiling and stop.
            </h2>
            <p className="mt-5 leading-relaxed text-muted">
              This is the moment the product either earns trust or loses it. The driver asks for $75
              more than the load is authorised for. The agent does not split the difference, does
              not get talked round, and does not quietly book it. It says a person will call back —
              because the server already told it the answer was no.
            </p>
            <Link
              href="/console/calls/c_1"
              className="mt-7 inline-flex rounded-md border border-border-strong px-4 py-2 text-sm font-medium transition-colors hover:bg-surface"
            >
              Open this call in the console
            </Link>
          </div>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <Dot tone="accent" />
                <span className="font-medium">Marcus Webb</span>
                <span className="text-subtle">· RL-4471</span>
              </div>
              <span className="tnum text-xs text-subtle">1m 36s</span>
            </div>

            <div className="space-y-3 p-4 text-sm">
              {[
                ["agent", "It pays 900 to you. Are you interested?"],
                ["driver", "I can do it but not for nine. Make it 975 and I'll take it."],
                [
                  "agent",
                  "Let me read that back — 975 dollars, Dallas to Houston, picking up tomorrow morning. Is that right?",
                ],
                ["driver", "That's right."],
                [
                  "agent",
                  "975 is above what I'm authorized to agree to, so I'm sending it to a dispatcher now. You'll hear back within the hour.",
                ],
              ].map(([who, text], i) => (
                <div key={i} className={who === "driver" ? "flex justify-end" : "flex"}>
                  <p
                    className={`max-w-[85%] rounded-lg px-3 py-2 leading-relaxed ${
                      who === "driver"
                        ? "bg-surface-raised text-foreground"
                        : "bg-accent-dim text-foreground"
                    }`}
                  >
                    {text}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-border bg-surface-raised px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge tone="accent">Counteroffer · $975</Badge>
                <Badge tone="neutral">Confidence 93%</Badge>
                <Badge tone="danger">Blocked: over $900 ceiling</Badge>
              </div>
              <p className="mt-2 text-xs text-subtle">
                Written to the load, queued for approval, dispatcher notified.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

function Guardrails() {
  return (
    <section id="guardrails" className="scroll-mt-14 border-b border-border">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <p className="text-xs font-semibold tracking-widest text-accent uppercase">Guardrails</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance">
          The model is a caller, not an officer of your company.
        </h2>
        <p className="mt-5 max-w-2xl leading-relaxed text-muted">
          Every limit below is checked in our API against your stored configuration, before anything
          is written or spoken. None of them live in a prompt, so none of them can be argued with.
        </p>

        <div className="mt-12 grid gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
          {[
            [
              "Rate ceiling",
              "The lowest of your per-load rate, your percentage of the broker rate and your absolute cap. Adding a rule can only tighten authority, never widen it.",
            ],
            [
              "Approval gate",
              "Anything over the ceiling becomes a queued decision with the transcript attached, not a booking.",
            ],
            [
              "Confidence floor",
              "A low-confidence extraction escalates even when the outcome looks clean.",
            ],
            [
              "Calling window",
              "Dialling is refused outside your configured local-time window, computed from the driver's location.",
            ],
            [
              "Do-not-call",
              "Enforced at the API. A flagged driver cannot be dialled by any path, including a retry.",
            ],
            [
              "Full audit trail",
              "Every tool call, state change and approval, with actor, before and after. Agent actions are labelled as such.",
            ],
          ].map(([title, body]) => (
            <div key={title} className="bg-surface p-5">
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-subtle">{body}</p>
            </div>
          ))}
        </div>

        <Card className="mt-8 p-5">
          <p className="text-xs font-semibold tracking-widest text-subtle uppercase">
            The rule behind all of it
          </p>
          <p className="mt-2 font-mono text-sm leading-relaxed text-muted">
            <span className="text-accent">if</span> (amount &gt; effectiveCeiling) →{" "}
            <span className="text-danger">human_approval_required</span>
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-subtle">
            The tool returns that string to the agent. There is no branch where the model decides
            the amount was close enough, and no configuration in which the check is skipped.
          </p>
        </Card>
      </div>
    </section>
  );
}

function Measurement() {
  return (
    <section className="border-b border-border bg-surface/30">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold tracking-widest text-accent uppercase">
              Measurement
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance">
              You get the numbers that would let you cancel us.
            </h2>
            <p className="mt-5 leading-relaxed text-muted">
              Most AI tools report activity. Activity is not the point — a system that places 400
              cheap calls and covers nothing is worse than no system. These sit on your dashboard
              from the first pilot week.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border">
            {[
              ["Containment", "Calls finished without a human"],
              ["Extraction accuracy", "Outcomes above your confidence floor"],
              ["Escalation rate", "How often we hand back to you"],
              ["Response latency", "End of speech to first audio"],
              ["Cost per outcome", "Not cost per call — cost per useful call"],
              ["Override rate", "How often you disagree with the agent"],
            ].map(([title, body]) => (
              <div key={title} className="bg-surface p-4">
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-subtle">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-14 border-b border-border">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <p className="text-xs font-semibold tracking-widest text-accent uppercase">Pricing</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance">
          Priced per board, not per seat you forgot you were paying for.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          Call minutes above your plan are billed at cost plus a small margin, shown on the
          dashboard before you hit them. No setup fee, no annual commitment during a pilot.
        </p>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={`flex flex-col p-6 ${
                plan.featured ? "border-accent/50 ring-1 ring-accent/20" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{plan.name}</h3>
                {plan.featured && <Badge tone="accent">Most pilots start here</Badge>}
              </div>
              <p className="mt-1 text-sm text-subtle">{plan.blurb}</p>

              <p className="mt-6">
                <span className="tnum text-4xl font-semibold tracking-tight">${plan.price}</span>
                <span className="text-sm text-subtle">/mo</span>
              </p>

              <ul className="mt-6 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-sm text-muted">
                    <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/console"
                className={`mt-7 rounded-md px-4 py-2.5 text-center text-sm font-medium transition-colors ${
                  plan.featured
                    ? "bg-accent text-background hover:bg-accent-strong"
                    : "border border-border-strong hover:bg-surface-raised"
                }`}
              >
                {plan.cta}
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" className="scroll-mt-14 border-b border-border">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <p className="text-xs font-semibold tracking-widest text-accent uppercase">
          Questions we get asked
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">Mostly about what stops it.</h2>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {FAQS.map((item) => (
            <Card key={item.q} className="p-5">
              <h3 className="text-sm font-semibold">{item.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-subtle">{item.a}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 text-center">
        <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Fourteen days, one lane, your own drivers.
        </h2>
        <p className="mx-auto mt-5 max-w-xl leading-relaxed text-muted">
          We set it up on a lane you already run, cap the call minutes, and measure against whatever
          baseline you give us. If coverage does not get faster, there is nothing to renew.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/console"
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-strong"
          >
            Open the console
          </Link>
          <a
            href="mailto:hello@haulwise.example"
            className="rounded-md border border-border-strong px-5 py-2.5 text-sm font-medium transition-colors hover:bg-surface"
          >
            Book a pilot call
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between">
      <p>© 2026 Haulwise. Demo build — figures shown come from the seeded dataset.</p>
      <p className="max-w-md">
        Automated calling is subject to federal and state law. Configure your calling regions and
        recording policy with counsel before running outbound at volume.
      </p>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Hero />
        <Problem />
        <HowItWorks />
        <CallPreview />
        <Guardrails />
        <Measurement />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
