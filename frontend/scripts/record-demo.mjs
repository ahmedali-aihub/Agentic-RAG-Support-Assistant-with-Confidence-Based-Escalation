/**
 * Records the demo shown in the README.
 *
 * It drives the real page against the real backend rather than staging
 * screenshots, so what the GIF shows is what the system actually did — including
 * the confidence scores and timings of that run.
 *
 * Usage: node scripts/record-demo.mjs [baseUrl]
 */
import { chromium } from "@playwright/test";
import { mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, "../../docs/media");
const BASE = process.argv[2] ?? "http://localhost:5173";

const ANSWERABLE = "How do I issue a partial refund?";
const OUT_OF_SCOPE = "Why did my payout pay_9f8e7d fail last night?";

// Free-tier models are slow and a retry doubles the work, so a single question
// can legitimately take well over a minute.
const VERDICT_TIMEOUT = 300_000;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Waits for whichever verdict the run produced, and reports which it was. */
async function askAndWait(page, question) {
  const before = await page.getByText(/Answered from documentation|Escalated to a person/).count();

  await page.fill("#demo-input", question);
  await wait(400);
  await page.press("#demo-input", "Enter");

  await page
    .locator("text=/Answered from documentation|Escalated to a person/")
    .nth(before)
    .waitFor({ timeout: VERDICT_TIMEOUT });

  const escalated = await page.getByText(/Escalated to a person/).count();
  return escalated > 0 ? "escalated" : "answered";
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    recordVideo: { dir: OUT, size: { width: 1280, height: 800 } },
  });
  const page = await context.newPage();

  // ---- Landing page ----
  await page.goto(BASE, { waitUntil: "networkidle" });
  await wait(1200);
  await page.screenshot({ path: `${OUT}/01-landing.png` });

  // ---- Live demo: a question the docs answer ----
  await page.locator("#demo").scrollIntoViewIfNeeded();
  await wait(900);

  const first = await askAndWait(page, ANSWERABLE);
  console.log(`  "${ANSWERABLE}" -> ${first}`);
  await wait(2500);
  await page.screenshot({ path: `${OUT}/02-answered.png` });

  // ---- Same widget, a question the docs cannot answer ----
  // An escalation costs a judge call, a rewrite, a second retrieval and a
  // triage summary, so on a slow free tier it can outlast any sensible wait.
  // A miss here shouldn't cost the screenshots already captured.
  try {
    const second = await askAndWait(page, OUT_OF_SCOPE);
    console.log(`  "${OUT_OF_SCOPE}" -> ${second}`);
    await wait(2500);
    await page.screenshot({ path: `${OUT}/03-escalated.png` });
  } catch {
    console.log(`  "${OUT_OF_SCOPE}" -> timed out; skipping that frame`);
  }

  // ---- Operator console ----
  await page.goto(`${BASE}/#/app`, { waitUntil: "networkidle" });
  await wait(1500);
  await page.screenshot({ path: `${OUT}/04-console.png` });

  // ---- Escalation queue ----
  await page.goto(`${BASE}/#/queue`, { waitUntil: "networkidle" });
  await wait(1500);
  await page.screenshot({ path: `${OUT}/05-queue.png` });

  await context.close();
  await browser.close();
  console.log(`Wrote screenshots and video to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
