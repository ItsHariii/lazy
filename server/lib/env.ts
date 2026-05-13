function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

function numEnv(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function boolEnv(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (!v) return fallback;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

export const env = {
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
  ANTHROPIC_MODEL: optional("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001"),
  CANVAS_BASE_URL: process.env.CANVAS_BASE_URL || "",
  CANVAS_PAT: process.env.CANVAS_PAT || "",
  CANVAS_ICS_URL: process.env.CANVAS_ICS_URL || "",
  ICOLLEGE_ICS_URL: process.env.ICOLLEGE_ICS_URL || "",
  PORT: numEnv("PORT", 3001),

  SYLLABUS_MAX_INPUT_TOKENS: numEnv("SYLLABUS_MAX_INPUT_TOKENS", 15000),
  MAX_UPLOAD_BYTES: numEnv("MAX_UPLOAD_BYTES", 5 * 1024 * 1024),
  MAX_SYLLABUS_PARSES_PER_HOUR: numEnv("MAX_SYLLABUS_PARSES_PER_HOUR", 10),
  MAX_CANVAS_SYNC_PER_HOUR: numEnv("MAX_CANVAS_SYNC_PER_HOUR", 30),
  MAX_ICOLLEGE_SYNC_PER_HOUR: numEnv("MAX_ICOLLEGE_SYNC_PER_HOUR", 30),
  MAX_DAILY_ANTHROPIC_COST_USD: numEnv("MAX_DAILY_ANTHROPIC_COST_USD", 0.5),

  APP_ORIGIN: optional("APP_ORIGIN", "http://localhost:5173"),
  WEB_PUSH_PUBLIC_KEY: process.env.WEB_PUSH_PUBLIC_KEY || process.env.VITE_WEB_PUSH_PUBLIC_KEY || "",
  WEB_PUSH_PRIVATE_KEY: process.env.WEB_PUSH_PRIVATE_KEY || "",
  WEB_PUSH_SUBJECT: optional("WEB_PUSH_SUBJECT", "mailto:admin@example.com"),
  RESEND_API_KEY: process.env.RESEND_API_KEY || "",
  EMAIL_FROM: process.env.EMAIL_FROM || "",
  EMAIL_FALLBACK_FOR_PUSH: boolEnv("EMAIL_FALLBACK_FOR_PUSH", true),
  NOTIFICATION_CRON_SECRET: process.env.NOTIFICATION_CRON_SECRET || "",
  NOTIFICATION_BATCH_SIZE: numEnv("NOTIFICATION_BATCH_SIZE", 100),
  NOTIFICATION_LOOKBACK_MINUTES: numEnv("NOTIFICATION_LOOKBACK_MINUTES", 360),
};

export function assertCanvas() {
  if (!env.CANVAS_ICS_URL && !(env.CANVAS_BASE_URL && env.CANVAS_PAT)) {
    throw new Error("Set CANVAS_ICS_URL (preferred) or CANVAS_BASE_URL + CANVAS_PAT");
  }
}

export function assertIcollege() {
  if (!env.ICOLLEGE_ICS_URL) throw new Error("ICOLLEGE_ICS_URL not set");
}

export function assertAnthropic() {
  if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
}

export function assertSupabaseAdmin() {
  if (!env.SUPABASE_URL) throw new Error("SUPABASE_URL or VITE_SUPABASE_URL not set");
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
}

export function pushConfigured() {
  return Boolean(env.WEB_PUSH_PUBLIC_KEY && env.WEB_PUSH_PRIVATE_KEY && env.WEB_PUSH_SUBJECT);
}

export function emailConfigured() {
  return Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
}

export { required };
