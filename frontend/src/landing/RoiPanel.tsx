import { useMemo, useState } from "react";
import { IconAnswer, IconEscalate, IconShield } from "./TiIcons";

// From the measured comparison (see README): 6 of 11 judged questions were
// answered rather than escalated. Shown as the starting point, not asserted as
// a universal rate -- it will move with the documentation and the questions
// actually asked, which is why the panel is a calculator and not a claim.
const MEASURED_DEFLECTION = 6 / 11;

function usd(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function Field({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step: number;
  format: (n: number) => string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor={label} className="text-[0.78rem] text-ti-body">
          {label}
        </label>
        <span className="ink text-[1rem] font-semibold tabular-nums">{format(value)}</span>
      </div>
      <input
        id={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ti-500/35 accent-ti-ink2"
      />
    </div>
  );
}

export function RoiPanel() {
  const [tickets, setTickets] = useState(10_000);
  const [costPerTicket, setCostPerTicket] = useState(15);
  const [deflection, setDeflection] = useState(Math.round(MEASURED_DEFLECTION * 100));

  const { deflected, monthlySavings, yearlySavings } = useMemo(() => {
    const rate = deflection / 100;
    const deflectedCount = Math.round(tickets * rate);
    const monthly = deflectedCount * costPerTicket;
    return { deflected: deflectedCount, monthlySavings: monthly, yearlySavings: monthly * 12 };
  }, [tickets, costPerTicket, deflection]);

  return (
    <div className="glass grid gap-0 overflow-hidden rounded-[28px] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-6 p-7 sm:p-9">
        <div>
          <span className="text-[0.72rem] font-semibold tracking-[0.13em] text-ti-mute uppercase">
            What deflection is worth
          </span>
          <h3 className="ink mt-2 text-[1.5rem] font-semibold tracking-[-0.025em] text-balance sm:text-[1.8rem]">
            Every answered ticket is one a person never has to open.
          </h3>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field
            label="Support tickets per month"
            value={tickets}
            onChange={setTickets}
            min={500}
            max={100_000}
            step={500}
            format={(n) => n.toLocaleString()}
          />
          <Field
            label="Cost to resolve one manually"
            value={costPerTicket}
            onChange={setCostPerTicket}
            min={3}
            max={60}
            step={1}
            format={usd}
          />
          <Field
            label="Deflection rate"
            value={deflection}
            onChange={setDeflection}
            min={0}
            max={100}
            step={1}
            format={(n) => `${n}%`}
          />
        </div>

        <p className="text-[0.74rem] leading-relaxed text-ti-mute">
          Deflection defaults to 55% — 6 of 11 questions answered rather than escalated in the
          measured comparison (see the README). It isn't a guaranteed rate: it depends on how
          well a knowledge base covers what people actually ask, and it rises over time as the
          escalation queue teaches the index what it was missing.
        </p>
      </div>

      <div className="flex flex-col justify-center gap-5 border-t border-ti-500/25 bg-ti-100/60 p-7 sm:p-9 lg:border-t-0 lg:border-l">
        <div className="flex flex-col gap-1">
          <span className="text-[0.7rem] font-semibold tracking-[0.1em] text-ti-mute uppercase">
            Estimated savings
          </span>
          <span className="ink text-4xl leading-none font-semibold tabular-nums sm:text-[2.75rem]">
            {usd(yearlySavings)}
          </span>
          <span className="text-[0.8rem] text-ti-body">per year, at this volume</span>
        </div>

        <div className="flex flex-col gap-2 border-t border-ti-500/25 pt-4 text-[0.82rem]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-ti-body">
              <IconAnswer className="h-4 w-4 text-ti-ink2" />
              Deflected monthly
            </span>
            <span className="ink font-semibold tabular-nums">{deflected.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-ti-body">
              <IconEscalate className="h-4 w-4 text-ti-mute" />
              Still reaches a person
            </span>
            <span className="font-semibold tabular-nums text-ti-mute">
              {(tickets - deflected).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-ti-body">
              <IconShield className="h-4 w-4 text-ti-ink2" />
              Saved per month
            </span>
            <span className="ink font-semibold tabular-nums">{usd(monthlySavings)}</span>
          </div>
        </div>

        <p className="text-[0.72rem] leading-relaxed text-ti-mute">
          Excludes inference cost, which runs on free model tiers in this build, and the cost of
          a wrong answer reaching a customer — the risk this architecture exists to remove, not
          one it prices in.
        </p>
      </div>
    </div>
  );
}
