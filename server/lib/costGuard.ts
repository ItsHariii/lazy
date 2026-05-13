import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { env } from "./env";

const PRICING: Record<string, { in: number; out: number }> = {
  "claude-haiku-4-5-20251001": { in: 1, out: 5 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
};

const CACHE = join(process.cwd(), ".cache", "anthropic-usage.json");

type Day = { date: string; inputTokens: number; outputTokens: number; costUsd: number };

function readDay(): Day {
  const today = new Date().toISOString().slice(0, 10);
  if (!existsSync(CACHE)) return { date: today, inputTokens: 0, outputTokens: 0, costUsd: 0 };
  try {
    const raw = JSON.parse(readFileSync(CACHE, "utf8")) as Day;
    if (raw.date !== today) return { date: today, inputTokens: 0, outputTokens: 0, costUsd: 0 };
    return raw;
  } catch {
    return { date: today, inputTokens: 0, outputTokens: 0, costUsd: 0 };
  }
}

function writeDay(d: Day) {
  mkdirSync(dirname(CACHE), { recursive: true });
  writeFileSync(CACHE, JSON.stringify(d, null, 2));
}

export function preflightBudget(estInputTokens: number, estOutputTokens = 1500): { ok: boolean; reason?: string; remainingUsd: number } {
  const p = PRICING[env.ANTHROPIC_MODEL] ?? PRICING["claude-haiku-4-5-20251001"];
  const day = readDay();
  const estCost = (estInputTokens / 1_000_000) * p.in + (estOutputTokens / 1_000_000) * p.out;
  const remaining = env.MAX_DAILY_ANTHROPIC_COST_USD - day.costUsd;
  if (day.costUsd + estCost > env.MAX_DAILY_ANTHROPIC_COST_USD) {
    return {
      ok: false,
      remainingUsd: remaining,
      reason: `Daily Anthropic budget $${env.MAX_DAILY_ANTHROPIC_COST_USD} would be exceeded. Already spent $${day.costUsd.toFixed(4)}, this call est $${estCost.toFixed(4)}.`,
    };
  }
  return { ok: true, remainingUsd: remaining };
}

export function recordUsage(inputTokens: number, outputTokens: number) {
  const p = PRICING[env.ANTHROPIC_MODEL] ?? PRICING["claude-haiku-4-5-20251001"];
  const day = readDay();
  day.inputTokens += inputTokens;
  day.outputTokens += outputTokens;
  const cost = (inputTokens / 1_000_000) * p.in + (outputTokens / 1_000_000) * p.out;
  day.costUsd = +(day.costUsd + cost).toFixed(6);
  writeDay(day);
  return { todayCostUsd: day.costUsd, callCostUsd: +cost.toFixed(6) };
}

export function estimateTokens(chars: number) {
  return Math.ceil(chars / 4);
}
