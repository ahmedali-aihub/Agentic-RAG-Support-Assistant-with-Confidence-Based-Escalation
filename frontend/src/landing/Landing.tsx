import { LiveDemo } from "./LiveDemo";
import {
  IconAnswer,
  IconArrow,
  IconDoc,
  IconEscalate,
  IconGuess,
  IconJudge,
  IconRetrieve,
  IconRewrite,
  IconShield,
} from "./TiIcons";
import { useCountUp, useParallax, useReveal } from "./hooks";

function Reveal({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div id={id} ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
}

function Stat({
  value,
  suffix,
  label,
  note,
  decimals = 0,
}: {
  value: number;
  suffix?: string;
  label: string;
  note: string;
  decimals?: number;
}) {
  const { ref, value: shown } = useCountUp(value);
  return (
    <div className="flex flex-col gap-2 px-2 py-8">
      <span ref={ref} className="ink text-5xl leading-none font-semibold tracking-[-0.045em] tabular-nums">
        {shown.toFixed(decimals)}
        {suffix}
      </span>
      <span className="text-[0.95rem] font-medium text-ti-ink">{label}</span>
      <span className="text-[0.82rem] leading-relaxed text-ti-mute">{note}</span>
    </div>
  );
}

const PIPELINE = [
  { Icon: IconRetrieve, label: "Retrieve", body: "Twenty candidate passages, reranked down to the five that actually bear on the question." },
  { Icon: IconJudge, label: "Judge", body: "A model scores whether those passages are sufficient — before a word is written." },
  { Icon: IconRewrite, label: "Rewrite", body: "A weak first pass earns one retry, restated in the documentation's own vocabulary." },
  { Icon: IconAnswer, label: "Answer", body: "Above the threshold, the reply is written from those passages, sources cited." },
  { Icon: IconEscalate, label: "Escalate", body: "Below it, a ticket is filed with a triage summary so a person picks it up." },
];

export default function Landing() {
  const y = useParallax();

  return (
    <div className="ti-ground min-h-svh text-ti-ink antialiased">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-white/45 bg-white/40 backdrop-blur-2xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <span className="flex items-center gap-2.5">
            <span className="graphite grid h-7 w-7 place-items-center rounded-lg text-white">
              <IconShield className="h-4 w-4" />
            </span>
            <span className="text-[0.9rem] font-semibold tracking-[-0.02em]">Support Assistant</span>
          </span>
          <a
            href="#/app"
            className="text-[0.84rem] font-medium text-ti-body transition-colors duration-300 hover:text-ti-ink"
          >
            Open console →
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        {/* 1 — Hero */}
        <section className="flex flex-col items-center pt-24 pb-20 text-center sm:pt-32 sm:pb-24">
          <div style={{ transform: `translateY(${y * -0.05}px)`, opacity: Math.max(1 - y / 560, 0) }}>
            <span className="glass-sm inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.74rem] font-medium text-ti-body">
              <span className="h-1.5 w-1.5 rounded-full bg-ti-ink2" />
              Retrieval-grounded, with an abstain path
            </span>
          </div>

          <h1
            className="ink mt-8 max-w-4xl text-[2.6rem] leading-[1.04] font-semibold tracking-[-0.042em] text-balance sm:text-[3.8rem] lg:text-[4.5rem]"
            style={{ transform: `translateY(${y * -0.025}px)` }}
          >
            Answers from your docs.
            <br className="hidden sm:block" /> A human when it doesn&rsquo;t know.
          </h1>

          <p
            className="mt-7 max-w-xl text-[1.05rem] leading-relaxed text-ti-body"
            style={{ transform: `translateY(${y * -0.012}px)` }}
          >
            Most support bots answer everything, including the questions they have no basis to
            answer. This one scores its own evidence first — and hands over the ones it
            can&rsquo;t stand behind.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#demo"
              className="graphite inline-flex h-[50px] items-center gap-2 rounded-full px-8 text-[0.94rem] font-medium whitespace-nowrap text-white transition-[transform,box-shadow,background] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
            >
              Try it live
              <IconArrow className="h-4 w-4" />
            </a>
            <a
              href="#how"
              className="glass-sm glass-lift inline-flex h-[50px] items-center rounded-full px-8 text-[0.94rem] font-medium whitespace-nowrap text-ti-ink transition-[transform,box-shadow,background] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-white/70 active:translate-y-0 active:scale-[0.98]"
            >
              View docs
            </a>
          </div>
        </section>

        {/* 2 — Live demo */}
        <Reveal id="demo" className="pb-24 sm:pb-28">
          <LiveDemo />
        </Reveal>

        {/* 3 — How it works */}
        <Reveal id="how" className="pb-24 sm:pb-28">
          <div className="mb-10 max-w-2xl">
            <span className="text-[0.72rem] font-semibold tracking-[0.13em] text-ti-mute uppercase">
              How it works
            </span>
            <h2 className="ink mt-3 text-[1.9rem] leading-tight font-semibold tracking-[-0.035em] text-balance sm:text-[2.5rem]">
              Five steps, and one of them is a decision.
            </h2>
            <p className="mt-4 text-[1rem] leading-relaxed text-ti-body">
              Ordinary retrieval goes straight from search to answer. The judge sits between
              them, which is what makes refusing possible at all.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {PIPELINE.map(({ Icon, label, body }, i) => (
              <article
                key={label}
                className="glass glass-lift flex flex-col rounded-3xl p-5 transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/70 text-ti-ink2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    <Icon className="h-[19px] w-[19px]" />
                  </span>
                  <span className="text-[0.85rem] font-semibold tabular-nums text-ti-mute/60">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-[1rem] font-semibold tracking-[-0.02em]">{label}</h3>
                <p className="mt-2 text-[0.83rem] leading-relaxed text-ti-body">{body}</p>
              </article>
            ))}
          </div>
        </Reveal>

        {/* 4 — Stats */}
        <Reveal className="pb-24 sm:pb-28">
          <div className="glass rounded-[28px] px-6 sm:px-10">
            <div className="grid divide-ti-500/25 sm:grid-cols-2 sm:divide-x lg:grid-cols-4">
              <Stat value={313} label="Passages indexed" note="Chunked from 20 documentation pages." />
              <Stat value={4} suffix="×" label="Retrieved to kept" note="Twenty candidates narrowed to five by reranking." />
              <Stat value={0.97} decimals={2} label="Confidence when it answers" note="Measured across in-scope questions." />
              <Stat value={100} suffix="%" label="Out-of-scope caught" note="Every question the docs cannot answer was escalated." />
            </div>
          </div>
        </Reveal>

        {/* 5 — Why it's different */}
        <Reveal className="pb-24 sm:pb-28">
          <div className="mb-10 max-w-2xl">
            <span className="text-[0.72rem] font-semibold tracking-[0.13em] text-ti-mute uppercase">
              The difference
            </span>
            <h2 className="ink mt-3 text-[1.9rem] leading-tight font-semibold tracking-[-0.035em] text-balance sm:text-[2.5rem]">
              Knowing when to stop is the feature.
            </h2>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <article className="glass flex flex-col rounded-3xl p-7 opacity-85">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/60 text-ti-mute">
                <IconGuess className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-[1.05rem] font-semibold tracking-[-0.02em]">Ordinary RAG</h3>
              <p className="mt-2.5 text-[0.88rem] leading-relaxed text-ti-body">
                Retrieves, then answers — always. Thin evidence produces a fluent reply anyway,
                and nothing in the flow can tell the difference.
              </p>
              <dl className="mt-6 flex flex-col gap-2.5 border-t border-ti-500/25 pt-5 text-[0.84rem]">
                <Row k="Can decline" v="No" />
                <Row k="Cites sources" v="Sometimes" />
                <Row k="Failure mode" v="A confident wrong answer" />
              </dl>
            </article>

            <article className="glass glass-lift flex flex-col rounded-3xl p-7 ring-1 ring-ti-ink/12 transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1">
              <span className="graphite grid h-11 w-11 place-items-center rounded-xl text-white">
                <IconShield className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-[1.05rem] font-semibold tracking-[-0.02em]">
                Support Assistant
              </h3>
              <p className="mt-2.5 text-[0.88rem] leading-relaxed text-ti-body">
                Scores its evidence before writing. Clears the bar and it answers with citations;
                falls short and the question reaches a person with context attached.
              </p>
              <dl className="mt-6 flex flex-col gap-2.5 border-t border-ti-500/25 pt-5 text-[0.84rem]">
                <Row k="Can decline" v="Yes" strong />
                <Row k="Cites sources" v="Always" strong />
                <Row k="Failure mode" v="A handoff, with a summary" strong />
              </dl>
            </article>

            <article className="glass flex flex-col rounded-3xl p-7">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/60 text-ti-ink2">
                <IconDoc className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-[1.05rem] font-semibold tracking-[-0.02em]">What you keep</h3>
              <p className="mt-2.5 text-[0.88rem] leading-relaxed text-ti-body">
                Every reply carries its confidence, its sources, and where the time went. Nothing
                about the decision is hidden behind the prose.
              </p>
              <dl className="mt-6 flex flex-col gap-2.5 border-t border-ti-500/25 pt-5 text-[0.84rem]">
                <Row k="Per-step timing" v="Shown" />
                <Row k="Judge reasoning" v="Shown" />
                <Row k="Escalation queue" v="Auditable" />
              </dl>
            </article>
          </div>
        </Reveal>

        {/* 6 — CTA */}
        <Reveal className="pb-20">
          <div className="glass relative overflow-hidden rounded-[32px] px-8 py-16 text-center sm:px-14 sm:py-20">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgba(28,27,25,0.07),transparent_70%)]"
            />
            <div className="relative">
              <h2 className="ink mx-auto max-w-2xl text-[2rem] leading-tight font-semibold tracking-[-0.04em] text-balance sm:text-[2.8rem]">
                Connect your docs.
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-[1rem] leading-relaxed text-ti-body">
                Point it at a documentation set and it indexes, reranks, and starts refusing the
                questions it shouldn&rsquo;t be answering.
              </p>
              <form
                onSubmit={(e) => e.preventDefault()}
                className="mx-auto mt-9 flex max-w-md flex-col gap-2.5 sm:flex-row"
              >
                <input
                  id="cta-email"
                  type="email"
                  required
                  placeholder="you@company.com"
                  aria-label="Work email"
                  className="glass-sm h-[50px] min-w-0 flex-1 rounded-full px-5 text-[0.9rem] text-ti-ink outline-none placeholder:text-ti-mute focus-visible:ring-2 focus-visible:ring-ti-ink/25"
                />
                <button
                  type="submit"
                  className="graphite h-[50px] shrink-0 rounded-full px-8 text-[0.92rem] font-medium whitespace-nowrap text-white transition-[transform,box-shadow,background] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                >
                  Get started
                </button>
              </form>
            </div>
          </div>
        </Reveal>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-ti-500/25 px-6 py-8 text-[0.8rem] text-ti-mute sm:flex-row">
        <span>Support Assistant — retrieval with an abstain path.</span>
        <a href="#/app" className="transition-colors duration-300 hover:text-ti-ink">
          Open the operator console →
        </a>
      </footer>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ti-mute">{k}</dt>
      <dd className={`text-right ${strong ? "font-medium text-ti-ink" : "text-ti-body"}`}>{v}</dd>
    </div>
  );
}
