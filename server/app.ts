import { Hono } from "hono";
import { canvasRoute } from "./routes/canvas.js";
import { icollegeRoute } from "./routes/icollege.js";
import { notificationsRoute } from "./routes/notifications.js";
import { syllabusRoute } from "./routes/syllabus.js";
import { emailConfigured, env, pushConfigured } from "./lib/env.js";

export const app = new Hono();

app.use("*", async (c, next) => {
  const origin = c.req.header("origin");
  if (origin) {
    c.header("Access-Control-Allow-Origin", origin);
    c.header("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
    c.header("Access-Control-Allow-Headers", "Authorization,Content-Type,X-Notification-Secret");
  }
  if (c.req.method === "OPTIONS") return c.body(null, 204);
  await next();
});

app.get("/api/health", c =>
  c.json({
    ok: true,
    canvas: !!(env.CANVAS_ICS_URL || (env.CANVAS_BASE_URL && env.CANVAS_PAT)),
    icollege: !!env.ICOLLEGE_ICS_URL,
    anthropic: !!env.ANTHROPIC_API_KEY,
    supabase: !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
    notifications: {
      webPush: pushConfigured(),
      email: emailConfigured(),
      cron: !!env.NOTIFICATION_CRON_SECRET,
    },
    model: env.ANTHROPIC_MODEL,
    limits: {
      maxUploadBytes: env.MAX_UPLOAD_BYTES,
      syllabusParsesPerHour: env.MAX_SYLLABUS_PARSES_PER_HOUR,
      canvasSyncPerHour: env.MAX_CANVAS_SYNC_PER_HOUR,
      icollegeSyncPerHour: env.MAX_ICOLLEGE_SYNC_PER_HOUR,
      dailyAnthropicBudgetUsd: env.MAX_DAILY_ANTHROPIC_COST_USD,
    },
  }),
);

app.route("/api/canvas", canvasRoute);
app.route("/api/icollege", icollegeRoute);
app.route("/api/syllabus", syllabusRoute);
app.route("/api/notifications", notificationsRoute);

app.notFound(c => c.json({ error: "Not found" }, 404));
app.onError((err, c) => {
  console.error("Server error:", err);
  return c.json({ error: err.message || "Server error" }, 500);
});
