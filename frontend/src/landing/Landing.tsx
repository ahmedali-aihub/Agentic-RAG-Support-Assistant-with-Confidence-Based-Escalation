import "./landing.css";
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

function Section({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useReveal<HTMLElement>();
  return (
    <section id={id} ref={ref} className={`reveal ti-shell ${className}`}>
      {children}
    </section>
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
    <div className="flex flex-col gap-1.5 py-6">
      <span ref={ref} className="numeral text-[2.6rem] leading-none sm:text-[3rem]">
        {shown.toFixed(decimals)}
        {suffix}
      </span>
      <span className="text-[0.92rem] font-medium text-ti-ink">{label}</span>
      <span className="text-[0.8rem] leading-relaxed text-ti-mute">{note}</span>
    </div>
  );
}

const PIPELINE = [
  { Icon: IconRetrieve, label: "Retrieve", body: "Twenty candidate passages, reranked by a cross-encoder down to the five that actually bear on the question." },
  { Icon: IconJudge, label: "Judge", body: "A model reads those passages and scores whether they are sufficient — before a word is written." },
  { Icon: IconRewrite, label: "Rewrite", body: "A weak first pass gets one retry, restated in the vocabulary the documentation itself uses." },
  { Icon: IconAnswer, label: "Answer", body: "Above the threshold, the reply is written strictly from those passages, with its sources cited." },
  { Icon: IconEscalate, label: "Escalate", body: "Below it, a ticket is filed with a triage summary so a person picks it up with context." },
];

export default function Landing() {
  const scrollY = useParallax();

  return (
    <div className="ti">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-white/45 bg-white/38 backdrop-blur-2xl">
        <div className="ti-shell flex h-14 items-center justify-between">
          <span className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-b from-[#6d8aa8] to-[#44607a] text-white shadow-[0_2px_8px_-3px_rgba(68,96,122,0.6)]">
              <IconShield className="h-4 w-4" />
            </span>
            <span className="text-[0.9rem] font-semibold tracking-tight">Support Assistant</span>
          </span>
          <a href="#/app" className="text-[0.84rem] font-medium text-ti-body transition-colors hover:text-ti-ink">
            Open console →
          </a>
        </div>
      </header>

      {/* 1 — Hero */}
      <div className="ti-shell pt-24 pb-16 text-center sm:pt-32 sm:pb-20">
        <div
          style={{ transform: `translateY(${scrollY * -0.06}px)`, opacity: Math.max(1 - scrollY / 620, 0) }}
        >
          <span className="glass-tight inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.74rem] font-medium text-ti-body">
            <span className="h-1.5 w-1.5 rounded-full bg-ti-blue" />
            Retrieval-grounded, with an abstain path
          </span>
        </div>

        <h1
          className="display mx-auto mt-7 max-w-4xl text-[2.9rem] sm:text-[4rem] lg:text-[4.7rem]"
          style={{ transform: `translateY(${scrollY * -0.03}px)` }}
        >
          Answers from your docs.
          <br />
          A human when it doesn&rsquo;t know.
        </h1>

        <p
          className="mx-auto mt-7 max-w-xl text-[1.06rem] leading-relaxed text-ti-body"
          style={{ transform: `translateY(${scrollY * -0.015}px)` }}
        >
          Most support bots answer everything, including the questions they have no basis to
          answer. This one scores its own evidence first — and hands over the ones it can&rsquo;t
          stand behind.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <a href="#demo" className="pill pill-solid">
            Try it live
            <IconArrow className="h-[17px] w-[17px]" />
          </a>
          <a href="#how" className="pill pill-glass">
            View docs
          </a>
        </div>
      </div>

      {/* 2 — Live demo */}
      <Section id="demo" className="pb-24 sm:pb-28">
        <LiveDemo />
      </Section>

      {/* 3 — How it works */}
      <Section id="how" className="pb-24 sm:pb-28">
        <div className="mb-11 max-w-2xl">
          <span className="eyebrow-ti">How it works</span>
          <h2 className="display mt-3 text-[2rem] sm:text-[2.6rem]">
            Five steps, and one of them is a decision.
          </h2>
          <p className="mt-4 text-[1rem] leading-relaxed text-ti-body">
            Ordinary retrieval goes straight from search to answer. The judge sits between
            them, which is what makes refusing possible at all.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PIPELINE.map(({ Icon, label, body }, i) => (
            <article key={label} className="glass lift rounded-[20px] p-5">
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/70 text-ti-blue shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  <Icon className="h-[19px] w-[19px]" />
                </span>
                <span className="numeral text-[0.9rem] opacity-45">0{i + 1}</span>
              </div>
              <h3 className="mt-4 text-[1rem] font-semibold tracking-tight">{label}</h3>
              <p className="mt-2 text-[0.83rem] leading-relaxed text-ti-body">{body}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* 4 — Stats */}
      <Section className="pb-24 sm:pb-28">
        <div className="glass rounded-[26px] px-7 py-4 sm:px-10">
          <div className="grid divide-y divide-ti-500/25 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
            <div className="lg:pr-7">
              <Stat value={313} label="Passages indexed" note="Chunked from 20 documentation pages." />
            </div>
            <div className="lg:px-7">
              <Stat value={4} suffix="×" label="Retrieved to kept" note="Twenty candidates narrowed to five by reranking." />
            </div>
            <div className="lg:px-7">
              <Stat value={0.97} decimals={2} label="Confidence when it answers" note="Measured across in-scope questions." />
            </div>
            <div className="lg:pl-7">
              <Stat value={100} suffix="%" label="Out-of-scope caught" note="Every question the docs cannot answer was escalated." />
            </div>
          </div>
        </div>
      </Section>

      {/* 5 — Why it's different */}
      <Section className="pb-24 sm:pb-28">
        <div className="mb-11 max-w-2xl">
          <span className="eyebrow-ti">The difference</span>
          <h2 className="display mt-3 text-[2rem] sm:text-[2.6rem]">
            Knowing when to stop is the feature.
          </h2>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <article className="glass rounded-[22px] p-7 opacity-85">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/60 text-ti-mute">
              <IconGuess className="h-5 w-5" />
            </span>
            <h3 className="mt-5 text-[1.08rem] font-semibold tracking-tight">Ordinary RAG</h3>
            <p className="mt-2.5 text-[0.9rem] leading-relaxed text-ti-body">
              Retrieves, then answers — always. Thin evidence produces a fluent reply anyway,
              and nothing in the flow can tell the difference.
            </p>
            <dl className="mt-6 flex flex-col gap-2.5 border-t border-ti-500/25 pt-5 text-[0.84rem]">
              <Row k="Can decline" v="No" />
              <Row k="Cites sources" v="Sometimes" />
              <Row k="Failure mode" v="A confident wrong answer" />
            </dl>
          </article>

          <article className="glass lift rounded-[22px] p-7 ring-1 ring-ti-blue/22">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-b from-[#6d8aa8] to-[#44607a] text-white shadow-[0_4px_12px_-4px_rgba(68,96,122,0.6)]">
              <IconShield className="h-5 w-5" />
            </span>
            <h3 className="mt-5 text-[1.08rem] font-semibold tracking-tight">Support Assistant</h3>
            <p className="mt-2.5 text-[0.9rem] leading-relaxed text-ti-body">
              Scores its evidence before writing. Clears the bar and it answers with citations;
              falls short and the question reaches a person with context attached.
            </p>
            <dl className="mt-6 flex flex-col gap-2.5 border-t border-ti-500/25 pt-5 text-[0.84rem]">
              <Row k="Can decline" v="Yes" strong />
              <Row k="Cites sources" v="Always" strong />
              <Row k="Failure mode" v="A handoff, with a summary" strong />
            </dl>
          </article>

          <article className="glass rounded-[22px] p-7">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/60 text-ti-blue">
              <IconDoc className="h-5 w-5" />
            </span>
            <h3 className="mt-5 text-[1.08rem] font-semibold tracking-tight">What you keep</h3>
            <p className="mt-2.5 text-[0.9rem] leading-relaxed text-ti-body">
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
      </Section>

      {/* 6 — CTA */}
      <Section className="pb-20">
        <div className="glass relative overflow-hidden rounded-[30px] px-8 py-16 text-center sm:px-14 sm:py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(91,122,153,0.14), transparent 70%)",
            }}
          />
          <div className="relative">
            <h2 className="display mx-auto max-w-2xl text-[2.1rem] sm:text-[2.9rem]">
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
                className="glass-tight h-12 flex-1 rounded-full px-5 text-[0.9rem] text-ti-ink outline-none placeholder:text-ti-mute"
              />
              <button type="submit" className="pill pill-solid shrink-0">
                Get started
              </button>
            </form>
          </div>
        </div>
      </Section>

      <footer className="ti-shell flex flex-col items-center justify-between gap-3 border-t border-ti-500/25 py-8 text-[0.8rem] text-ti-mute sm:flex-row">
        <span>Support Assistant — retrieval with an abstain path.</span>
        <a href="#/app" className="transition-colors hover:text-ti-ink">
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
