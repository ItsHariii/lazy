import { Hono, type Context } from "hono";
import webPush from "web-push";
import { createSupabaseAdminClient } from "../lib/supabase.js";
import { emailConfigured, env, pushConfigured } from "../lib/env.js";

type NotificationPreferences = {
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  weekly_digest_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type NotificationClaim = {
  delivery_id: string;
  reminder_id: string;
  user_id: string;
  user_email: string | null;
  assignment_id: string;
  assignment_title: string;
  course_code: string | null;
  course_title: string | null;
  due_at: string;
  offset_minutes: number;
  requested_channel: "email" | "push" | "calendar";
  scheduled_for: string;
  effective_send_at: string;
  timezone: string;
  email_enabled: boolean;
};

type SendResult = {
  ok: boolean;
  status: "sent" | "skipped" | "failed";
  deliveredChannel?: "email" | "push" | "email_fallback";
  recipientCount?: number;
  providerMessageId?: string;
  error?: string;
  metadata?: Record<string, unknown>;
};

export const notificationsRoute = new Hono();

if (pushConfigured()) {
  webPush.setVapidDetails(
    env.WEB_PUSH_SUBJECT,
    env.WEB_PUSH_PUBLIC_KEY,
    env.WEB_PUSH_PRIVATE_KEY,
  );
}

notificationsRoute.get("/config", c =>
  c.json({
    pushConfigured: pushConfigured(),
    emailConfigured: emailConfigured(),
    publicKey: env.WEB_PUSH_PUBLIC_KEY || null,
  }),
);

notificationsRoute.get("/preferences", async c => {
  const auth = await requireUser(c);
  if ("response" in auth) return auth.response;

  const admin = createSupabaseAdminClient();
  const preferences = await ensurePreferences(admin, auth.user.id);
  const subscriptions = await admin
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.user.id)
    .eq("enabled", true);

  if (subscriptions.error) return c.json({ error: subscriptions.error.message }, 500);

  return c.json({
    preferences,
    pushSubscriptionCount: subscriptions.count || 0,
    pushPermission: "Notification" in globalThis ? Notification.permission : "unknown",
    pushConfigured: pushConfigured(),
    emailConfigured: emailConfigured(),
    publicKey: env.WEB_PUSH_PUBLIC_KEY || null,
  });
});

notificationsRoute.put("/preferences", async c => {
  const auth = await requireUser(c);
  if ("response" in auth) return auth.response;

  let body: Partial<NotificationPreferences>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const patch = cleanPreferencePatch(body);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("notification_preferences")
    .upsert(
      {
        user_id: auth.user.id,
        ...patch,
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ preferences: data });
});

notificationsRoute.post("/subscribe", async c => {
  const auth = await requireUser(c);
  if ("response" in auth) return auth.response;
  if (!pushConfigured()) return c.json({ error: "Web Push is not configured on the server." }, 503);

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const subscription = body?.subscription;
  const endpoint = asString(subscription?.endpoint);
  const p256dh = asString(subscription?.keys?.p256dh);
  const authKey = asString(subscription?.keys?.auth);

  if (!endpoint || !p256dh || !authKey) {
    return c.json({ error: "Missing PushSubscription endpoint or keys." }, 400);
  }

  const admin = createSupabaseAdminClient();
  await ensurePreferences(admin, auth.user.id);
  const { data, error } = await admin
    .from("push_subscriptions")
    .upsert(
      {
        user_id: auth.user.id,
        endpoint,
        p256dh,
        auth: authKey,
        user_agent: asString(body?.userAgent) || c.req.header("user-agent") || null,
        enabled: true,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id,endpoint" },
    )
    .select("id")
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ ok: true, subscriptionId: data.id });
});

notificationsRoute.post("/unsubscribe", async c => {
  const auth = await requireUser(c);
  if ("response" in auth) return auth.response;

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const endpoint = asString(body?.endpoint);
  if (!endpoint) return c.json({ error: "Missing endpoint." }, 400);

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("push_subscriptions")
    .update({ enabled: false })
    .eq("user_id", auth.user.id)
    .eq("endpoint", endpoint);

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ ok: true });
});

notificationsRoute.post("/test", async c => {
  const auth = await requireUser(c);
  if ("response" in auth) return auth.response;
  if (!pushConfigured()) {
    return c.json({ error: "Web Push is not configured on the server (VAPID keys missing)." }, 503);
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("user_id", auth.user.id)
    .eq("enabled", true);

  if (error) return c.json({ error: error.message }, 500);

  const subscriptions = (data || []) as PushSubscriptionRow[];
  if (subscriptions.length === 0) {
    return c.json({ error: "No active push subscription on this account. Enable push first." }, 400);
  }

  const payload = JSON.stringify({
    title: "Test reminder from Lazy",
    body: "If you can read this, push notifications are working on this device.",
    tag: `lazy-test-${Date.now()}`,
    url: env.APP_ORIGIN.replace(/\/$/, "") + "/",
    data: { test: true },
  });

  let sent = 0;
  const failures: string[] = [];
  for (const subscription of subscriptions) {
    try {
      await webPush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        payload,
      );
      sent += 1;
    } catch (e: any) {
      failures.push(e?.body || e?.message || String(e));
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await admin
          .from("push_subscriptions")
          .update({ enabled: false })
          .eq("id", subscription.id);
      }
    }
  }

  if (sent === 0) {
    return c.json({ error: failures[0] || "All test notifications failed to send." }, 502);
  }
  return c.json({ ok: true, sent, attempted: subscriptions.length, failures });
});

notificationsRoute.post("/run-due", async c => {
  const secret = c.req.header("x-notification-secret");
  if (!env.NOTIFICATION_CRON_SECRET) {
    return c.json({ error: "NOTIFICATION_CRON_SECRET is not configured." }, 503);
  }
  if (secret !== env.NOTIFICATION_CRON_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("claim_due_notification_reminders", {
    p_now: new Date().toISOString(),
    p_limit: env.NOTIFICATION_BATCH_SIZE,
    p_lookback_minutes: env.NOTIFICATION_LOOKBACK_MINUTES,
  });

  if (error) return c.json({ error: error.message }, 500);

  const claims = (data || []) as NotificationClaim[];
  const results = [];
  for (const claim of claims) {
    const result =
      claim.requested_channel === "push"
        ? await sendPushReminder(admin, claim)
        : await sendEmailReminder(claim, "email");

    await markDelivery(admin, claim, result);
    results.push({
      deliveryId: claim.delivery_id,
      assignmentId: claim.assignment_id,
      requestedChannel: claim.requested_channel,
      status: result.status,
      deliveredChannel: result.deliveredChannel,
      recipientCount: result.recipientCount || 0,
      error: result.error,
    });
  }

  return c.json({
    claimed: claims.length,
    sent: results.filter(r => r.status === "sent").length,
    skipped: results.filter(r => r.status === "skipped").length,
    failed: results.filter(r => r.status === "failed").length,
    results,
  });
});

async function requireUser(c: Context) {
  const header = c.req.header("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return { response: c.json({ error: "Missing bearer token" }, 401) };

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    return { response: c.json({ error: error?.message || "Invalid bearer token" }, 401) };
  }
  return { user: data.user };
}

async function ensurePreferences(admin: ReturnType<typeof createSupabaseAdminClient>, userId: string) {
  const { data, error } = await admin
    .from("notification_preferences")
    .upsert({ user_id: userId }, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) throw error;
  return data as NotificationPreferences;
}

function cleanPreferencePatch(body: Partial<NotificationPreferences>) {
  const patch: Record<string, unknown> = {};
  for (const key of [
    "email_enabled",
    "push_enabled",
    "weekly_digest_enabled",
    "quiet_hours_enabled",
  ] as const) {
    if (typeof body[key] === "boolean") patch[key] = body[key];
  }
  if (typeof body.timezone === "string" && body.timezone.trim()) {
    patch.timezone = body.timezone.trim().slice(0, 80);
  }
  if (typeof body.quiet_hours_start === "string" && /^\d\d:\d\d/.test(body.quiet_hours_start)) {
    patch.quiet_hours_start = body.quiet_hours_start.slice(0, 5);
  }
  if (typeof body.quiet_hours_end === "string" && /^\d\d:\d\d/.test(body.quiet_hours_end)) {
    patch.quiet_hours_end = body.quiet_hours_end.slice(0, 5);
  }
  return patch;
}

async function sendPushReminder(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  claim: NotificationClaim,
): Promise<SendResult> {
  if (!pushConfigured()) {
    return sendPushFallbackEmail(claim, "Web Push is not configured.");
  }

  const { data, error } = await admin
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("user_id", claim.user_id)
    .eq("enabled", true);

  if (error) return { ok: false, status: "failed", error: error.message };

  const subscriptions = (data || []) as PushSubscriptionRow[];
  if (subscriptions.length === 0) {
    return sendPushFallbackEmail(claim, "No active push subscription.");
  }

  const payload = JSON.stringify({
    title: reminderTitle(claim),
    body: reminderBody(claim),
    tag: `lazy-assignment-${claim.assignment_id}-${claim.reminder_id}`,
    url: assignmentUrl(claim.assignment_id),
    data: {
      assignmentId: claim.assignment_id,
      reminderId: claim.reminder_id,
      dueAt: claim.due_at,
    },
  });

  let sent = 0;
  const failures: string[] = [];
  for (const subscription of subscriptions) {
    try {
      await webPush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        payload,
      );
      sent += 1;
    } catch (e: any) {
      failures.push(e?.body || e?.message || String(e));
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await admin
          .from("push_subscriptions")
          .update({ enabled: false })
          .eq("id", subscription.id);
      }
    }
  }

  if (sent > 0) {
    return {
      ok: true,
      status: "sent",
      deliveredChannel: "push",
      recipientCount: sent,
      metadata: { attempted: subscriptions.length, failures },
    };
  }

  return sendPushFallbackEmail(claim, failures[0] || "Push delivery failed.");
}

async function sendPushFallbackEmail(claim: NotificationClaim, reason: string): Promise<SendResult> {
  if (!env.EMAIL_FALLBACK_FOR_PUSH || !claim.email_enabled) {
    return { ok: false, status: "failed", error: reason };
  }

  const fallback = await sendEmailReminder(claim, "email_fallback");
  if (fallback.ok) {
    return {
      ...fallback,
      deliveredChannel: "email_fallback",
      metadata: { fallbackReason: reason },
    };
  }
  return fallback;
}

async function sendEmailReminder(
  claim: NotificationClaim,
  deliveredChannel: "email" | "email_fallback",
): Promise<SendResult> {
  if (!emailConfigured()) {
    return { ok: false, status: "failed", error: "Email provider is not configured." };
  }
  if (!claim.user_email) {
    return { ok: false, status: "failed", error: "User email is missing." };
  }

  const subject = reminderTitle(claim);
  const text = [
    reminderBody(claim),
    "",
    claim.course_code ? `Course: ${claim.course_code}` : null,
    `Due: ${formatDue(claim)}`,
    `Open Lazy: ${assignmentUrl(claim.assignment_id)}`,
  ].filter(Boolean).join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: claim.user_email,
      subject,
      text,
      html: emailHtml(claim),
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      status: "failed",
      error: body?.message || `Resend HTTP ${response.status}`,
      metadata: { provider: "resend", response: body },
    };
  }

  return {
    ok: true,
    status: "sent",
    deliveredChannel,
    recipientCount: 1,
    providerMessageId: asString(body?.id),
    metadata: { provider: "resend" },
  };
}

async function markDelivery(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  claim: NotificationClaim,
  result: SendResult,
) {
  const patch = {
    status: result.status,
    delivered_channel: result.deliveredChannel || null,
    recipient_count: result.recipientCount || 0,
    provider_message_id: result.providerMessageId || null,
    error_message: result.error || null,
    metadata: result.metadata || {},
    sent_at: result.status === "sent" ? new Date().toISOString() : null,
  };

  const { error } = await admin
    .from("notification_deliveries")
    .update(patch)
    .eq("id", claim.delivery_id);

  if (error) {
    console.error("Failed to update notification delivery", claim.delivery_id, error);
  }
}

function reminderTitle(claim: NotificationClaim) {
  if (claim.offset_minutes >= 1440) return `Due tomorrow: ${claim.assignment_title}`;
  if (claim.offset_minutes >= 60) return `Due in ${Math.round(claim.offset_minutes / 60)} hours: ${claim.assignment_title}`;
  return `Due soon: ${claim.assignment_title}`;
}

function reminderBody(claim: NotificationClaim) {
  const course = claim.course_code ? `${claim.course_code} · ` : "";
  return `${course}${formatDue(claim)}`;
}

function formatDue(claim: NotificationClaim) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: claim.timezone || "America/New_York",
    }).format(new Date(claim.due_at));
  } catch {
    return new Date(claim.due_at).toLocaleString();
  }
}

function assignmentUrl(assignmentId: string) {
  const origin = env.APP_ORIGIN.replace(/\/$/, "");
  return `${origin}/?assignment=${encodeURIComponent(assignmentId)}`;
}

function emailHtml(claim: NotificationClaim) {
  return `
    <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.5;color:#1f2933">
      <h1 style="font-size:18px;margin:0 0 12px">${escapeHtml(reminderTitle(claim))}</h1>
      <p style="margin:0 0 10px">${escapeHtml(reminderBody(claim))}</p>
      <p style="margin:0 0 16px;color:#52606d">${escapeHtml(claim.course_title || claim.course_code || "Assignment")}</p>
      <a href="${escapeHtml(assignmentUrl(claim.assignment_id))}" style="color:#1f4f82">Open in Lazy</a>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}
